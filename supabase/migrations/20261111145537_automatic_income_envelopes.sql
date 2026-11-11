begin;
create table public.envelope_plans (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 currency text not null check(currency in ('MDL','EUR')), enabled boolean not null default true,
 start_on date not null default (now() at time zone 'Europe/Chisinau')::date,
 created_at timestamptz not null default now(), unique(user_id,currency), unique(user_id,id)
);
create table public.envelope_rules (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 plan_id uuid not null,category_id uuid not null,category_kind text not null default 'expense' check(category_kind='expense'),
 envelope_kind text not null check(envelope_kind in ('spending','investment','emergency')),
 basis_points integer not null check(basis_points between 0 and 10000),
 sort_order integer not null check(sort_order between 0 and 20),is_fallback boolean not null default false,
 unique(user_id,id),unique(plan_id,category_id),unique(plan_id,sort_order),
 foreign key(user_id,plan_id) references public.envelope_plans(user_id,id) on delete cascade,
 foreign key(user_id,category_id,category_kind) references public.categories(user_id,id,kind)
);
create unique index envelope_fallback_idx on public.envelope_rules(plan_id) where is_fallback;
create index envelope_rules_owner_plan_idx on public.envelope_rules(user_id,plan_id);
create table public.envelope_funding (
 transaction_id uuid not null,rule_id uuid not null,user_id uuid not null,
 basis_points integer not null check(basis_points between 0 and 10000),
 amount_minor bigint not null check(amount_minor between 0 and 1000000000000),
 primary key(transaction_id,rule_id),
 foreign key(user_id,transaction_id) references public.transactions(user_id,id) on delete cascade,
 foreign key(user_id,rule_id) references public.envelope_rules(user_id,id)
);
create index envelope_funding_owner_rule_idx on public.envelope_funding(user_id,rule_id);
alter table public.envelope_plans enable row level security;
alter table public.envelope_rules enable row level security;
alter table public.envelope_funding enable row level security;
revoke all on public.envelope_plans,public.envelope_rules,public.envelope_funding from public,anon,authenticated;
grant select on public.envelope_plans,public.envelope_rules,public.envelope_funding to authenticated;
grant insert(user_id,currency) on public.envelope_plans to authenticated;
grant update(enabled) on public.envelope_plans to authenticated;
grant insert(user_id,plan_id,category_id,envelope_kind,basis_points,sort_order,is_fallback) on public.envelope_rules to authenticated;
grant update(basis_points) on public.envelope_rules to authenticated;
create policy envelope_plans_owner on public.envelope_plans for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy envelope_rules_owner on public.envelope_rules for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy envelope_funding_read on public.envelope_funding for select to authenticated using((select auth.uid())=user_id);

-- The sum constraint is deferred so all percentages can change atomically.
-- Private trigger functions are not callable through the Data API.
create function fintrack_private.check_envelope_percentages() returns trigger
language plpgsql security definer set search_path='' as $$
declare pid uuid; total integer; count_rules integer; fallbacks integer;
begin
 if tg_table_name='envelope_plans' then pid:=new.id;else pid:=new.plan_id;end if;
 select sum(basis_points),count(*),count(*) filter(where is_fallback) into total,count_rules,fallbacks from public.envelope_rules where plan_id=pid;
 if exists(select 1 from public.envelope_plans where id=pid) and (total is distinct from 10000 or count_rules<1 or count_rules>20 or fallbacks<>1) then
 raise exception 'Procentele trebuie să totalizeze 100%% și să existe un singur buget pentru alte cheltuieli.' using errcode='23514';end if;
 return null;
end;$$;
revoke all on function fintrack_private.check_envelope_percentages() from public,anon,authenticated;
create constraint trigger envelope_plan_total after insert on public.envelope_plans deferrable initially deferred for each row execute function fintrack_private.check_envelope_percentages();
create constraint trigger envelope_rule_total after insert or update on public.envelope_rules deferrable initially deferred for each row execute function fintrack_private.check_envelope_percentages();

create function public.start_envelopes(p_currency text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid();pid uuid;cid uuid;r record;
begin
 if uid is null then raise exception 'Autentificare necesară.' using errcode='28000';end if;
 if p_currency is null or p_currency not in ('MDL','EUR') then raise exception 'Monedă invalidă.' using errcode='22023';end if;
 insert into public.envelope_plans(user_id,currency) values(uid,p_currency)
 on conflict(user_id,currency) do update set enabled=true returning id into pid;
 if not exists(select 1 from public.envelope_rules where plan_id=pid and user_id=uid) then
 for r in select * from (values
 ('Alimente','spending',2500,0,false),('Locuință','spending',2500,1,false),('Transport','spending',1000,2,false),
 ('Distracții','spending',1000,3,false),('Investiții','investment',1500,4,false),('Fond de urgență','emergency',1000,5,false),
 ('Alte cheltuieli','spending',500,6,true)) as defaults(name,envelope_kind,bps,position,fallback)
 loop
  insert into public.categories(user_id,name,kind) values(uid,r.name,'expense') on conflict(user_id,name,kind) do nothing;
  select id into cid from public.categories where user_id=uid and name=r.name and kind='expense';
  insert into public.envelope_rules(user_id,plan_id,category_id,envelope_kind,basis_points,sort_order,is_fallback)
  values(uid,pid,cid,r.envelope_kind,r.bps,r.position,r.fallback);
 end loop;
 end if;
 return pid;
end;$$;
revoke all on function public.start_envelopes(text) from public,anon,authenticated;
grant execute on function public.start_envelopes(text) to authenticated;

create function public.configure_envelopes(p_plan_id uuid,p_enabled boolean,p_rules jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); pid uuid;total integer;count_rules integer;
begin
 if uid is null then raise exception 'Autentificare necesară.' using errcode='28000';end if;
 select id into pid from public.envelope_plans where id=p_plan_id and user_id=uid for update;
 if not found then raise exception 'Plan indisponibil.' using errcode='42501';end if;
 if p_enabled is null or p_rules is null or jsonb_typeof(p_rules)<>'array' then raise exception 'Plan invalid.' using errcode='22023';end if;
 select count(*),sum(basis_points) into count_rules,total from jsonb_to_recordset(p_rules) as r(id uuid,basis_points integer);
 if count_rules<>(select count(*) from public.envelope_rules where plan_id=pid and user_id=uid) or total is distinct from 10000
 or exists(select 1 from jsonb_to_recordset(p_rules) as r(id uuid,basis_points integer) where id is null or basis_points is null or basis_points not between 0 and 10000 or not exists(select 1 from public.envelope_rules e where e.id=r.id and e.plan_id=pid and e.user_id=uid))
 or count_rules<>(select count(distinct id) from jsonb_to_recordset(p_rules) as r(id uuid,basis_points integer)) then
 raise exception 'Procentele trebuie să totalizeze 100%%. Verifică toate bugetele.' using errcode='22023';end if;
 update public.envelope_rules e set basis_points=r.basis_points from jsonb_to_recordset(p_rules) as r(id uuid,basis_points integer) where e.id=r.id and e.plan_id=pid and e.user_id=uid;
 update public.envelope_plans set enabled=p_enabled where id=pid and user_id=uid;
 return p_enabled;
end;$$;
revoke all on function public.configure_envelopes(uuid,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.configure_envelopes(uuid,boolean,jsonb) to authenticated;

create function fintrack_private.fund_income_envelopes() returns trigger
language plpgsql security definer set search_path='' as $$
declare plan public.envelope_plans;unit text;has_funding boolean;
begin
 if auth.uid() is not null and auth.uid()<>new.user_id then raise exception 'Proprietar invalid.' using errcode='42501';end if;
 select exists(select 1 from public.envelope_funding where transaction_id=new.id and user_id=new.user_id) into has_funding;
 if new.kind<>'income' then
  delete from public.envelope_funding where transaction_id=new.id and user_id=new.user_id;return new;
 end if;
 select currency into unit from public.accounts where id=new.account_id and user_id=new.user_id;
 select * into plan from public.envelope_plans where user_id=new.user_id and currency=unit for update;
 if not found then return new;end if;
 if not has_funding then
  -- Never retroactively fund old incomes, including incomes entered while paused.
  if tg_op='UPDATE' then if old.kind='income' then return new;end if;end if;
  if not plan.enabled or new.created_at<plan.created_at or new.occurred_on<plan.start_on then return new;end if;
  insert into public.envelope_funding(transaction_id,rule_id,user_id,basis_points,amount_minor)
  select new.id,id,new.user_id,basis_points,0 from public.envelope_rules where plan_id=plan.id and user_id=new.user_id;
 end if;
 -- Largest remainder, deterministic ties: every penny is assigned exactly once.
 -- Existing rows retain the percentages captured on this particular income.
 with shares as (
 select f.rule_id,(new.amount_minor*f.basis_points/10000)::bigint base,
 (new.amount_minor*f.basis_points)%10000 fraction,r.sort_order
 from public.envelope_funding f join public.envelope_rules r on r.id=f.rule_id
 where f.transaction_id=new.id and f.user_id=new.user_id
 ), ranked as (
 select *,row_number() over(order by fraction desc,sort_order,rule_id) rank,
 new.amount_minor-sum(base) over() remainder from shares
 ) update public.envelope_funding f set amount_minor=ranked.base+case when ranked.rank<=ranked.remainder then 1 else 0 end
 from ranked where f.transaction_id=new.id and f.rule_id=ranked.rule_id and f.user_id=new.user_id;
 return new;
end;$$;
revoke all on function fintrack_private.fund_income_envelopes() from public,anon,authenticated;
create trigger fund_income_envelopes after insert or update of kind,amount_minor,account_id,category_id,occurred_on on public.transactions for each row execute function fintrack_private.fund_income_envelopes();
commit;
