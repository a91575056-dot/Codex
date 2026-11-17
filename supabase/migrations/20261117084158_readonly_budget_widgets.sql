begin;
-- Independent read-only credentials: never reuse a transaction-writing token.
create table public.widget_devices (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 80),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '365 days',
 last_used_at timestamptz,
 rate_window_at timestamptz not null default now(),
 rate_count integer not null default 0 check(rate_count>=0)
);
create index widget_devices_owner_idx on public.widget_devices(user_id,created_at,id);
alter table public.widget_devices enable row level security;
revoke all on public.widget_devices from public,anon,authenticated;
grant select,delete on public.widget_devices to authenticated;
grant insert(user_id,name,token_hash) on public.widget_devices to authenticated;
create policy widget_devices_owner on public.widget_devices for all to authenticated
 using((select auth.uid())=user_id) with check((select auth.uid())=user_id);

-- The only token-authorized read surface. Returns MDL budget aggregates only:
-- no account balances, transactions, people, income, UUID owner or credentials.
create function public.widget_budget_snapshot(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.widget_devices; pid uuid; today date:=(now() at time zone 'Europe/Chisinau')::date;
 rows jsonb; source text;
begin
 if p_token is null or p_token !~ '^ft_wg_[a-f0-9]{64}$' then raise exception 'Widget neautorizat.' using errcode='28000'; end if;
 select * into d from public.widget_devices where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or d.expires_at<=now() or (auth.uid() is not null and auth.uid()<>d.user_id) then raise exception 'Widget neautorizat.' using errcode='28000'; end if;
 if d.rate_window_at<=now()-interval '1 minute' then d.rate_window_at:=now();d.rate_count:=0;end if;
 if d.rate_count>=20 then raise exception 'Prea multe cereri.' using errcode='53300';end if;
 update public.widget_devices set rate_window_at=d.rate_window_at,rate_count=d.rate_count+1,last_used_at=now() where id=d.id;
 select p.id into pid from public.envelope_plans p where p.user_id=d.user_id and p.currency='MDL' and exists(select 1 from public.envelope_rules r where r.plan_id=p.id and r.user_id=d.user_id);
 if pid is not null then
  source:='allocations';
  with rules as (
   select r.*,c.name,p.start_on,p.created_at plan_created,p.enabled from public.envelope_rules r
   join public.categories c on c.id=r.category_id and c.user_id=d.user_id
   join public.envelope_plans p on p.id=r.plan_id and p.user_id=d.user_id
   where r.plan_id=pid and r.user_id=d.user_id
  ), funding as (
   select f.rule_id,sum(f.amount_minor) amount from public.envelope_funding f
   join public.transactions t on t.id=f.transaction_id and t.user_id=d.user_id
   join public.accounts a on a.id=t.account_id and a.user_id=d.user_id and a.currency='MDL'
   join rules r on r.id=f.rule_id
   where f.user_id=d.user_id and t.kind='income' and t.occurred_on between r.start_on and today group by f.rule_id
  ), spending as (
   select coalesce((select r.id from rules r where r.category_id=t.category_id),(select r.id from rules r where r.is_fallback)) rule_id,sum(t.amount_minor) amount
   from public.transactions t join public.accounts a on a.id=t.account_id and a.user_id=d.user_id and a.currency='MDL'
   join public.envelope_plans p on p.id=pid and p.user_id=d.user_id
   where t.user_id=d.user_id and t.kind='expense' and t.occurred_on between p.start_on and today and t.created_at>=p.created_at
   group by 1
  ) select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'limit_minor',coalesce(f.amount,0),'spent_minor',coalesce(s.amount,0),'enabled',r.enabled) order by r.sort_order,r.id),'[]'::jsonb)
  into rows from rules r left join funding f on f.rule_id=r.id left join spending s on s.rule_id=r.id;
 else
  source:='monthly';
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',c.name,'limit_minor',b.limit_minor,'spent_minor',coalesce((
   select sum(t.amount_minor) from public.transactions t join public.accounts a on a.id=t.account_id and a.user_id=d.user_id and a.currency='MDL'
   where t.user_id=d.user_id and t.kind='expense' and t.category_id=b.category_id and t.occurred_on between b.month_start and today
  ),0),'enabled',true) order by c.name,b.id),'[]'::jsonb)
  into rows from public.budgets b join public.categories c on c.id=b.category_id and c.user_id=d.user_id
  where b.user_id=d.user_id and b.month_start=date_trunc('month',today)::date;
 end if;
 return jsonb_build_object('currency','MDL','source',source,'as_of',today,'updated_at',now(),'budgets',rows);
end;$$;
revoke all on function public.widget_budget_snapshot(text) from public,anon,authenticated;
-- Deliberately narrow bearer API, guarded by hashed expiring, revocable credentials.
grant execute on function public.widget_budget_snapshot(text) to anon,authenticated;
commit;
