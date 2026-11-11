begin;
-- Existing tokens retain expense-only permissions until the owner opts in.
alter table public.shortcut_devices add column allow_income boolean not null default false;
grant update(allow_income) on public.shortcut_devices to authenticated;
create function public.configure_shortcut_income(p_device_id uuid,p_enabled boolean) returns boolean
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); changed uuid;
begin
 if uid is null or p_enabled is null then raise exception 'Autentificare necesară.' using errcode='28000'; end if;
 update public.shortcut_devices set allow_income=p_enabled where id=p_device_id and user_id=uid returning id into changed;
 if not found then raise exception 'Telefon indisponibil.' using errcode='42501'; end if;
 if p_enabled then
  insert into public.categories(user_id,name,kind) values(uid,'Salariu','income'),(uid,'Bonus','income'),(uid,'Alte venituri','income') on conflict(user_id,name,kind) do nothing;
 end if;
 return p_enabled;
end;$$;
revoke all on function public.configure_shortcut_income(uuid,boolean) from public,anon,authenticated;
grant execute on function public.configure_shortcut_income(uuid,boolean) to authenticated;

-- Token-authorized, bounded RPC: no balances, history or account identifiers.
create function public.shortcut_finance_options(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.shortcut_devices; expenses jsonb; incomes jsonb:='{}'::jsonb;
begin
 d:=fintrack_private.check_shortcut(p_token);
 select coalesce(jsonb_object_agg(name,id order by name),'{}'::jsonb) into expenses from public.categories where user_id=d.user_id and kind='expense';
 if d.allow_income then
  select coalesce(jsonb_object_agg(name,id order by name),'{}'::jsonb) into incomes from public.categories where user_id=d.user_id and kind='income';
 end if;
 return jsonb_build_object('currency','MDL','categories',expenses,'income_categories',incomes,'income_enabled',d.allow_income);
end;$$;
revoke all on function public.shortcut_finance_options(text) from public,anon,authenticated;
grant execute on function public.shortcut_finance_options(text) to anon,authenticated;

create function public.shortcut_income(p_token text,p_request_id text,p_amount_minor bigint,p_payment_method text,p_category_id uuid,p_description text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.shortcut_devices; a uuid; category_name text; description text; h text; transaction_id uuid; t public.transactions; replay boolean:=false;
begin
 d:=fintrack_private.check_shortcut(p_token);
 if not d.allow_income then raise exception 'Activează veniturile pentru acest telefon în FinTrack.' using errcode='42501'; end if;
 if p_request_id is null or p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$'
 or p_amount_minor is null or p_amount_minor not between 1 and 1000000000000
 or p_payment_method is null or p_payment_method not in ('cash','card')
 or p_category_id is null or p_description is null or char_length(p_description)>160 then
  raise exception 'Datele venitului sunt invalide.' using errcode='22023';
 end if;
 select name into category_name from public.categories where id=p_category_id and user_id=d.user_id and kind='income';
 if not found then raise exception 'Categoria nu este disponibilă.' using errcode='22023'; end if;
 a:=case when p_payment_method='cash' then d.cash_account_id else d.card_account_id end;
 if not exists(select 1 from public.accounts where id=a and user_id=d.user_id and currency='MDL') then
  raise exception 'Contul nu este disponibil.' using errcode='22023';
 end if;
 description:=coalesce(nullif(btrim(p_description),''),category_name);
 h:=encode(sha256(convert_to(d.id::text||':'||p_request_id,'UTF8')),'hex');
 transaction_id:=(substr(h,1,12)||'4'||substr(h,14,3)||'8'||substr(h,18,15))::uuid;
 insert into public.transactions(id,user_id,account_id,category_id,kind,description,payment_method,amount_minor,occurred_on)
 values(transaction_id,d.user_id,a,p_category_id,'income',description,p_payment_method,p_amount_minor,(now() at time zone 'Europe/Chisinau')::date)
 on conflict(id) do nothing returning * into t;
 if not found then
  replay:=true;
  select * into t from public.transactions where id=transaction_id and user_id=d.user_id;
  if not found or t.account_id<>a or t.category_id<>p_category_id or t.kind<>'income'
   or t.amount_minor<>p_amount_minor or t.payment_method<>p_payment_method or t.description<>description then
   raise exception 'Identificatorul există cu alte date.' using errcode='23505';
  end if;
 end if;
 return jsonb_build_object('transaction_id',t.id,'amount_minor',t.amount_minor,'currency','MDL','payment_method',t.payment_method,'category',category_name,'occurred_on',t.occurred_on,'replayed',replay);
end;
$$;
revoke all on function public.shortcut_income(text,text,bigint,text,uuid,text) from public,anon,authenticated;
grant execute on function public.shortcut_income(text,text,bigint,text,uuid,text) to anon,authenticated;

commit;
