begin;
create table public.transfers (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 from_account_id uuid not null, to_account_id uuid not null,
 amount_minor bigint not null check(amount_minor between 1 and 1000000000000),
 description text not null default '' check(char_length(description)<=160),
 occurred_on date not null check(occurred_on between date '1900-01-01' and date '2100-12-31'),
 created_at timestamptz not null default now(), check(from_account_id<>to_account_id),
 foreign key(user_id,from_account_id) references public.accounts(user_id,id),
 foreign key(user_id,to_account_id) references public.accounts(user_id,id)
);
create index transfers_owner_date_idx on public.transfers(user_id,occurred_on,id);
create index transfers_source_idx on public.transfers(user_id,from_account_id);
create index transfers_destination_idx on public.transfers(user_id,to_account_id);
alter table public.transfers enable row level security;
revoke all on public.transfers from public,anon,authenticated;
grant select,insert,update,delete on public.transfers to authenticated;
create policy transfers_owner on public.transfers for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);

create table public.recurring_rules (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null,category_id uuid not null,kind text not null check(kind in ('income','expense')),
 description text not null check(char_length(btrim(description)) between 1 and 160),
 amount_minor bigint not null check(amount_minor between 1 and 1000000000000),
 payment_method text not null default 'unspecified' check(payment_method in ('unspecified','cash','card')),
 frequency text not null check(frequency in ('weekly','monthly','yearly')),
 start_on date not null check(start_on between date '1900-01-01' and date '2100-12-31'),
 next_due_on date not null check(next_due_on between date '1900-01-01' and date '2100-12-31'),
 active boolean not null default true, created_at timestamptz not null default now(),updated_at timestamptz(3) not null default now(),
 unique(user_id,id),check(next_due_on>=start_on),
 foreign key(user_id,account_id) references public.accounts(user_id,id),
 foreign key(user_id,category_id,kind) references public.categories(user_id,id,kind)
);
create index recurring_owner_due_idx on public.recurring_rules(user_id,next_due_on,id);
create index recurring_account_idx on public.recurring_rules(user_id,account_id);
create index recurring_category_idx on public.recurring_rules(user_id,category_id,kind);
alter table public.recurring_rules enable row level security;
revoke all on public.recurring_rules from public,anon,authenticated;
grant select,insert,update,delete on public.recurring_rules to authenticated;
create policy recurring_rules_owner on public.recurring_rules for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create function public.touch_recurring_rule() returns trigger language plpgsql security invoker set search_path='' as $$begin new.updated_at:=clock_timestamp(); return new;end;$$;
revoke all on function public.touch_recurring_rule() from public,anon,authenticated;
create trigger touch_recurring_rule before update on public.recurring_rules for each row execute function public.touch_recurring_rule();
alter table public.transactions add constraint transactions_owner_id_unique unique(user_id,id);
create table public.recurring_occurrences (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 rule_id uuid not null,due_on date not null,transaction_id uuid not null,created_at timestamptz not null default now(),
 unique(rule_id,due_on),
 foreign key(user_id,rule_id) references public.recurring_rules(user_id,id) on delete cascade,
 foreign key(user_id,transaction_id) references public.transactions(user_id,id) on delete cascade
);
create index recurring_occurrences_owner_rule_idx on public.recurring_occurrences(user_id,rule_id);
create index recurring_occurrences_transaction_idx on public.recurring_occurrences(user_id,transaction_id);
alter table public.recurring_occurrences enable row level security;
revoke all on public.recurring_occurrences from public,anon,authenticated;
grant select,insert on public.recurring_occurrences to authenticated;
create policy recurring_occurrences_read on public.recurring_occurrences for select to authenticated using((select auth.uid())=user_id);
create policy recurring_occurrences_insert on public.recurring_occurrences for insert to authenticated with check((select auth.uid())=user_id);

create function public.finance_next_due(p_start date,p_due date,p_frequency text) returns date language plpgsql immutable security invoker set search_path='' as $$
declare base date; result date;
begin
 if p_frequency='weekly' then return p_due+7; end if;
 if p_frequency='monthly' then base:=(date_trunc('month',p_due)+interval '1 month')::date;
 elsif p_frequency='yearly' then base:=make_date(extract(year from p_due)::integer+1,extract(month from p_start)::integer,1);
 else raise exception 'Frecvență invalidă.' using errcode='22023'; end if;
 result:=base+least(extract(day from p_start)::integer,extract(day from (base+interval '1 month'-interval '1 day'))::integer)-1;
 return result;
end;$$;
revoke all on function public.finance_next_due(date,date,text) from public,anon,authenticated;
grant execute on function public.finance_next_due(date,date,text) to authenticated;
create function public.post_recurring(p_rule_id uuid,p_due_on date,p_occurred_on date,p_expected_updated_at timestamptz) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.recurring_rules; existing uuid; tid uuid; next_date date; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Autentificare necesară.' using errcode='28000'; end if;
 select * into r from public.recurring_rules where id=p_rule_id and user_id=uid for update;
 if not found then raise exception 'Regula nu este disponibilă.' using errcode='42501';end if;
 select transaction_id into existing from public.recurring_occurrences where rule_id=r.id and due_on=p_due_on and user_id=uid;
 if found then return jsonb_build_object('transaction_id',existing,'replayed',true);end if;
 if not r.active or p_due_on is null or r.next_due_on<>p_due_on or p_due_on>(now() at time zone 'Europe/Chisinau')::date
 or p_occurred_on is null or p_occurred_on<date '1900-01-01' or p_occurred_on>(now() at time zone 'Europe/Chisinau')::date then
  raise exception 'Scadența nu poate fi înregistrată.' using errcode='22023';end if;
 if p_expected_updated_at is null or r.updated_at<>p_expected_updated_at then raise exception 'Regula a fost modificată. Reîncarcă pagina.' using errcode='40001';end if;
 insert into public.transactions(user_id,account_id,category_id,kind,description,amount_minor,payment_method,occurred_on)
 values(uid,r.account_id,r.category_id,r.kind,r.description,r.amount_minor,r.payment_method,p_occurred_on) returning id into tid;
 insert into public.recurring_occurrences(user_id,rule_id,due_on,transaction_id) values(uid,r.id,p_due_on,tid);
 next_date:=public.finance_next_due(r.start_on,r.next_due_on,r.frequency);
 update public.recurring_rules set next_due_on=case when next_date>date '2100-12-31' then r.next_due_on else next_date end,active=next_date<=date '2100-12-31' where id=r.id and user_id=uid;
 return jsonb_build_object('transaction_id',tid,'replayed',false);
end;$$;
revoke all on function public.post_recurring(uuid,date,date,timestamptz) from public,anon,authenticated;
grant execute on function public.post_recurring(uuid,date,date,timestamptz) to authenticated;

alter table public.transactions add column import_fingerprint text check(import_fingerprint is null or import_fingerprint ~ '^[a-f0-9]{64}$');
create unique index transactions_import_fingerprint_idx on public.transactions(user_id,import_fingerprint);
create function public.import_transactions(p_rows jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare inserted_count integer; total integer;uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Autentificare necesară.' using errcode='28000';end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'Fișier invalid.' using errcode='22023';end if;
 total:=jsonb_array_length(p_rows);
 if total<1 or total>500 then raise exception 'Importul acceptă între 1 și 500 de rânduri.' using errcode='22023';end if;
 with fields as (
  select ordinality as n,(value->>'account_id')::uuid as account_id,(value->>'category_id')::uuid as category_id,
   value->>'kind' as kind,btrim(value->>'description') as description,(value->>'amount_minor')::bigint as amount_minor,
   value->>'payment_method' as payment_method,(value->>'occurred_on')::date as occurred_on
  from jsonb_array_elements(p_rows) with ordinality
 ), canonical as (
  select *,jsonb_build_array(account_id,category_id,kind,description,amount_minor,payment_method,occurred_on) as content from fields
 ), numbered as (
  select *,row_number() over(partition by content order by n) as occurrence from canonical
 ), inserted as (
  insert into public.transactions(user_id,account_id,category_id,kind,description,amount_minor,payment_method,occurred_on,import_fingerprint)
  select uid,account_id,category_id,kind,description,amount_minor,payment_method,occurred_on,
   encode(sha256(convert_to((content||jsonb_build_array(occurrence))::text,'UTF8')),'hex') from numbered
  on conflict(user_id,import_fingerprint) do nothing returning id
 ) select count(*) into inserted_count from inserted;
 return jsonb_build_object('inserted',inserted_count,'skipped',total-inserted_count);
end;$$;
revoke all on function public.import_transactions(jsonb) from public,anon,authenticated;
grant execute on function public.import_transactions(jsonb) to authenticated;
commit;
