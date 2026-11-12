begin;
-- Loan principal is a financing cash movement, never earned income or consumption.
create table public.loans (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 direction text not null check(direction in ('lent','borrowed')),
 account_id uuid not null,
 currency text not null check(currency in ('MDL','EUR')),
 person text not null check(char_length(btrim(person)) between 1 and 100),
 amount_minor bigint not null check(amount_minor between 1 and 1000000000000),
 payment_method text not null default 'unspecified' check(payment_method in ('cash','card','unspecified')),
 note text not null default '' check(char_length(note)<=160),
 occurred_on date not null check(occurred_on between date '1900-01-01' and (now() at time zone 'Europe/Chisinau')::date),
 settled_on date,
 settled_account_id uuid,
 created_at timestamptz not null default now(),
 unique(user_id,id),
 foreign key(user_id,account_id) references public.accounts(user_id,id),
 foreign key(user_id,settled_account_id) references public.accounts(user_id,id),
 check((settled_on is null)=(settled_account_id is null)),
 check(settled_on is null or settled_on between occurred_on and (now() at time zone 'Europe/Chisinau')::date)
);
create index loans_owner_status_idx on public.loans(user_id,settled_on,occurred_on,id);
create index loans_account_idx on public.loans(user_id,account_id);
create index loans_settled_account_idx on public.loans(user_id,settled_account_id);
alter table public.loans enable row level security;
revoke all on public.loans from public,anon,authenticated;
grant select on public.loans to authenticated;
grant insert(id,user_id,direction,account_id,currency,person,amount_minor,payment_method,note,occurred_on) on public.loans to authenticated;
grant update(settled_on,settled_account_id) on public.loans to authenticated;
create policy loans_owner on public.loans for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);

-- Unit and ownership validation also applies to direct owner-authorized API writes.
create function public.check_loan_accounts() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.accounts where id=new.account_id and user_id=new.user_id and currency=new.currency)
 or (new.settled_account_id is not null and not exists(select 1 from public.accounts where id=new.settled_account_id and user_id=new.user_id and currency=new.currency)) then
  raise exception 'Contul împrumutului trebuie să îți aparțină și să aibă aceeași monedă.' using errcode='23503';
 end if;
 if tg_op='UPDATE' and old.settled_on is not null and (new.settled_on is distinct from old.settled_on or new.settled_account_id is distinct from old.settled_account_id) then
  raise exception 'Rambursarea confirmată nu poate fi modificată.' using errcode='23514';
 end if;
 return new;
end;$$;
revoke all on function public.check_loan_accounts() from public,anon,authenticated;
create trigger check_loan_accounts before insert or update on public.loans for each row execute function public.check_loan_accounts();

-- All device writes already serialize on the device row in check_shortcut.
-- Retrying one request as a loan and a regular transaction must never post twice.
create function fintrack_private.check_loan_request_collision() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if (tg_table_name='loans' and exists(select 1 from public.transactions where id=new.id))
 or (tg_table_name='transactions' and exists(select 1 from public.loans where id=new.id)) then
  raise exception 'Identificatorul există pentru alt tip de operație.' using errcode='23505';
 end if;
 return new;
end;$$;
revoke all on function fintrack_private.check_loan_request_collision() from public,anon,authenticated;
create trigger loan_request_collision before insert on public.loans for each row execute function fintrack_private.check_loan_request_collision();
create trigger transaction_loan_collision before insert on public.transactions for each row execute function fintrack_private.check_loan_request_collision();

create function public.record_loan(p_id uuid,p_account_id uuid,p_direction text,p_person text,p_amount_minor bigint,p_occurred_on date,p_note text default '') returns uuid
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); c text; l public.loans;
begin
 if uid is null then raise exception 'Autentificare necesară.' using errcode='28000';end if;
 select currency into c from public.accounts where id=p_account_id and user_id=uid;
 if c is null or p_id is null then raise exception 'Cont indisponibil.' using errcode='22023';end if;
 insert into public.loans(id,user_id,account_id,currency,direction,person,amount_minor,occurred_on,note)
 values(p_id,uid,p_account_id,c,p_direction,btrim(p_person),p_amount_minor,p_occurred_on,btrim(p_note)) on conflict(id) do nothing returning * into l;
 if not found then
  select * into l from public.loans where id=p_id and user_id=uid;
  if not found or l.account_id<>p_account_id or l.direction<>p_direction or l.person<>btrim(p_person) or l.amount_minor<>p_amount_minor or l.occurred_on<>p_occurred_on or l.note<>btrim(p_note) then
   raise exception 'Cererea există cu alte date.' using errcode='23505';end if;
 end if;
 return l.id;
end;$$;
revoke all on function public.record_loan(uuid,uuid,text,text,bigint,date,text) from public,anon,authenticated;
grant execute on function public.record_loan(uuid,uuid,text,text,bigint,date,text) to authenticated;

create function public.settle_loan(p_id uuid,p_account_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); l public.loans;
begin
 if uid is null then raise exception 'Autentificare necesară.' using errcode='28000';end if;
 select * into l from public.loans where id=p_id and user_id=uid for update;
 if not found then raise exception 'Împrumut indisponibil.' using errcode='42501';end if;
 if l.settled_on is not null then
  if l.settled_account_id<>p_account_id then raise exception 'Rambursarea există în alt cont.' using errcode='23505';end if;
  return l.id;
 end if;
 update public.loans set settled_on=(now() at time zone 'Europe/Chisinau')::date,settled_account_id=p_account_id where id=l.id and user_id=uid;
 return l.id;
end;$$;
revoke all on function public.settle_loan(uuid,uuid) from public,anon,authenticated;
grant execute on function public.settle_loan(uuid,uuid) to authenticated;

-- A separate opt-in; existing expense/income permissions remain unchanged.
alter table public.shortcut_devices add column allow_loans boolean not null default false;
grant update(allow_loans) on public.shortcut_devices to authenticated;
create function public.configure_shortcut_loans(p_device_id uuid,p_enabled boolean) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or p_enabled is null then raise exception 'Autentificare necesară.' using errcode='28000';end if;
 update public.shortcut_devices set allow_loans=p_enabled where id=p_device_id and user_id=auth.uid();
 if not found then raise exception 'Telefon indisponibil.' using errcode='42501';end if;
 return p_enabled;
end;$$;
revoke all on function public.configure_shortcut_loans(uuid,boolean) from public,anon,authenticated;
grant execute on function public.configure_shortcut_loans(uuid,boolean) to authenticated;

-- Intentionally token-authorized bounded API, like the existing expense/income RPCs.
-- No balance/history reads, arbitrary account IDs, settlement or deletion via device token.
create function public.shortcut_loan(p_token text,p_request_id text,p_direction text,p_person text,p_amount_minor bigint,p_payment_method text,p_note text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.shortcut_devices; a uuid; h text; lid uuid; l public.loans; replay boolean:=false;
begin
 d:=fintrack_private.check_shortcut(p_token);
 if not d.allow_loans then raise exception 'Activează împrumuturile pentru acest telefon în FinTrack.' using errcode='42501';end if;
 if p_request_id is null or p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$'
 or p_direction is null or p_direction not in ('lent','borrowed')
 or p_person is null or char_length(btrim(p_person)) not between 1 and 100
 or p_amount_minor is null or p_amount_minor not between 1 and 1000000000000
 or p_payment_method is null or p_payment_method not in ('cash','card')
 or p_note is null or char_length(p_note)>160 then raise exception 'Datele împrumutului sunt invalide.' using errcode='22023';end if;
 a:=case when p_payment_method='cash' then d.cash_account_id else d.card_account_id end;
 if not exists(select 1 from public.accounts where id=a and user_id=d.user_id and currency='MDL') then raise exception 'Cont indisponibil.' using errcode='22023';end if;
 h:=encode(sha256(convert_to(d.id::text||':'||p_request_id,'UTF8')),'hex');
 lid:=(substr(h,1,12)||'4'||substr(h,14,3)||'8'||substr(h,18,15))::uuid;
 insert into public.loans(id,user_id,direction,account_id,currency,person,amount_minor,payment_method,note,occurred_on)
 values(lid,d.user_id,p_direction,a,'MDL',btrim(p_person),p_amount_minor,p_payment_method,btrim(p_note),(now() at time zone 'Europe/Chisinau')::date)
 on conflict(id) do nothing returning * into l;
 if not found then
  replay:=true;select * into l from public.loans where id=lid and user_id=d.user_id;
  if not found or l.direction<>p_direction or l.account_id<>a or l.person<>btrim(p_person) or l.amount_minor<>p_amount_minor or l.payment_method<>p_payment_method or l.note<>btrim(p_note) then raise exception 'Cererea există cu alte date.' using errcode='23505';end if;
 end if;
 return jsonb_build_object('loan_id',l.id,'direction',l.direction,'person',l.person,'amount_minor',l.amount_minor,'currency','MDL','payment_method',l.payment_method,'occurred_on',l.occurred_on,'replayed',replay);
end;$$;
revoke all on function public.shortcut_loan(text,text,text,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.shortcut_loan(text,text,text,text,bigint,text,text) to anon,authenticated;
commit;
