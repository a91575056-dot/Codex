begin;
create table public.savings_goals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 100),
 target_minor bigint not null check(target_minor between 1 and 1000000000000),
 due_on date not null check(due_on between date '1900-01-01' and date '2100-12-31'),
 currency text not null default 'RON' check(currency='RON'),created_at timestamptz not null default now(),unique(user_id,id)
);
create table public.goal_contributions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,goal_id uuid not null,
 amount_minor bigint not null check(amount_minor between 1 and 1000000000000),
 occurred_on date not null check(occurred_on between date '1900-01-01' and (now() at time zone 'Europe/Chisinau')::date),
 note text not null default '' check(char_length(note)<=160),created_at timestamptz not null default now(),
 foreign key(user_id,goal_id) references public.savings_goals(user_id,id) on delete cascade
);
create table public.goal_scenarios (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,goal_id uuid not null,
 name text not null check(char_length(btrim(name)) between 1 and 100),
 target_minor bigint not null check(target_minor between 1 and 1000000000000),
 saved_minor bigint not null check(saved_minor between 0 and 9007199254740991),
 monthly_minor bigint not null check(monthly_minor between 0 and 9007199254740991),
 saved_on date not null default (now() at time zone 'Europe/Chisinau')::date,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and coalesce(snapshot->>'version','')='1' and octet_length(snapshot::text)<=262144),
 created_at timestamptz not null default now(),
 foreign key(user_id,goal_id) references public.savings_goals(user_id,id) on delete cascade
);
create index goal_contributions_owner_goal_idx on public.goal_contributions(user_id,goal_id,occurred_on);
create index goal_scenarios_owner_goal_idx on public.goal_scenarios(user_id,goal_id,created_at);
alter table public.savings_goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.goal_scenarios enable row level security;
revoke all on public.savings_goals,public.goal_contributions,public.goal_scenarios from public,anon,authenticated;
grant select,insert,update,delete on public.savings_goals,public.goal_contributions to authenticated;
-- Snapshots are immutable through the user API; a changed plan is saved as a new scenario.
revoke update on public.goal_scenarios from authenticated;
grant select,insert,delete on public.goal_scenarios to authenticated;
create policy savings_goals_owner on public.savings_goals for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy goal_contributions_owner on public.goal_contributions for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy goal_scenarios_owner on public.goal_scenarios for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
commit;
