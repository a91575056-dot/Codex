begin;
create table public.shortcut_devices (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 80),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 cash_account_id uuid not null,
 card_account_id uuid not null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now() + interval '90 days',
 last_used_at timestamptz,
 rate_window_at timestamptz not null default now(),
 rate_count integer not null default 0 check(rate_count>=0),
 foreign key(user_id,cash_account_id) references public.accounts(user_id,id) on delete cascade,
 foreign key(user_id,card_account_id) references public.accounts(user_id,id) on delete cascade
);
create index shortcut_devices_cash_account_idx on public.shortcut_devices(user_id,cash_account_id);
create index shortcut_devices_card_account_idx on public.shortcut_devices(user_id,card_account_id);
alter table public.shortcut_devices enable row level security;
revoke all on public.shortcut_devices from public,anon,authenticated;
grant select,delete on public.shortcut_devices to authenticated;
grant insert(user_id,name,token_hash,cash_account_id,card_account_id) on public.shortcut_devices to authenticated;
create policy shortcut_devices_owner on public.shortcut_devices for all to authenticated
 using((select auth.uid())=user_id) with check((select auth.uid())=user_id);

create schema if not exists fintrack_private;
revoke all on schema fintrack_private from public,anon,authenticated;
-- This is the sole credential check for the deliberately narrow anonymous RPCs.
-- Tokens authorize expense creation + expense category names, never account reads.
create function fintrack_private.check_shortcut(p_token text)
returns public.shortcut_devices language plpgsql security definer set search_path='' as $$
declare d public.shortcut_devices;
begin
 if p_token is null or p_token !~ '^ft_sc_[a-f0-9]{64}$' then
  raise exception 'Dispozitiv neautorizat.' using errcode='28000';
 end if;
 select * into d from public.shortcut_devices
 where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or d.expires_at<=now() or (auth.uid() is not null and auth.uid()<>d.user_id) then
  raise exception 'Dispozitiv neautorizat.' using errcode='28000';
 end if;
 if d.rate_window_at<=now()-interval '1 minute' then
  d.rate_window_at:=now(); d.rate_count:=0;
 end if;
 if d.rate_count>=20 then
  raise exception 'Prea multe cereri.' using errcode='53300';
 end if;
 update public.shortcut_devices set rate_window_at=d.rate_window_at,rate_count=d.rate_count+1,last_used_at=now() where id=d.id;
 return d;
end;
$$;
revoke all on function fintrack_private.check_shortcut(text) from public,anon,authenticated;

create function public.shortcut_options(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.shortcut_devices; categories jsonb;
begin
 d:=fintrack_private.check_shortcut(p_token);
 select coalesce(jsonb_object_agg(name,id order by name),'{}'::jsonb) into categories
 from public.categories where user_id=d.user_id and kind='expense';
 return jsonb_build_object('currency','MDL','categories',categories);
end;
$$;
revoke all on function public.shortcut_options(text) from public,anon,authenticated;
grant execute on function public.shortcut_options(text) to anon,authenticated;

create function public.shortcut_expense(p_token text,p_request_id text,p_amount_minor bigint,p_payment_method text,p_category_id uuid,p_description text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.shortcut_devices; a uuid; category_name text; description text; h text; transaction_id uuid; t public.transactions; replay boolean:=false;
begin
 d:=fintrack_private.check_shortcut(p_token);
 if p_request_id is null or p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$'
 or p_amount_minor is null or p_amount_minor not between 1 and 1000000000000
 or p_payment_method is null or p_payment_method not in ('cash','card')
 or p_category_id is null or p_description is null or char_length(p_description)>160 then
  raise exception 'Datele cheltuielii sunt invalide.' using errcode='22023';
 end if;
 select name into category_name from public.categories where id=p_category_id and user_id=d.user_id and kind='expense';
 if not found then raise exception 'Categoria nu este disponibilă.' using errcode='22023'; end if;
 a:=case when p_payment_method='cash' then d.cash_account_id else d.card_account_id end;
 if not exists(select 1 from public.accounts where id=a and user_id=d.user_id and currency='MDL') then
  raise exception 'Contul nu este disponibil.' using errcode='22023';
 end if;
 description:=coalesce(nullif(btrim(p_description),''),category_name);
 h:=encode(sha256(convert_to(d.id::text||':'||p_request_id,'UTF8')),'hex');
 transaction_id:=(substr(h,1,12)||'4'||substr(h,14,3)||'8'||substr(h,18,15))::uuid;
 insert into public.transactions(id,user_id,account_id,category_id,kind,description,payment_method,amount_minor,occurred_on)
 values(transaction_id,d.user_id,a,p_category_id,'expense',description,p_payment_method,p_amount_minor,(now() at time zone 'Europe/Chisinau')::date)
 on conflict(id) do nothing returning * into t;
 if not found then
  replay:=true;
  select * into t from public.transactions where id=transaction_id and user_id=d.user_id;
  if not found or t.account_id<>a or t.category_id<>p_category_id or t.kind<>'expense'
   or t.amount_minor<>p_amount_minor or t.payment_method<>p_payment_method or t.description<>description then
   raise exception 'Identificatorul există cu alte date.' using errcode='23505';
  end if;
 end if;
 return jsonb_build_object('transaction_id',t.id,'amount_minor',t.amount_minor,'currency','MDL','payment_method',t.payment_method,'category',category_name,'occurred_on',t.occurred_on,'replayed',replay);
end;
$$;
revoke all on function public.shortcut_expense(text,text,bigint,text,uuid,text) from public,anon,authenticated;
grant execute on function public.shortcut_expense(text,text,bigint,text,uuid,text) to anon,authenticated;
commit;
