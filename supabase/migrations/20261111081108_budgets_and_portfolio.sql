begin;
create table public.budgets (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 category_id uuid not null,category_kind text generated always as ('expense'::text) stored,
 month_start date not null check(extract(day from month_start)=1 and month_start between date '1900-01-01' and date '2100-12-01'),
 limit_minor bigint not null check(limit_minor between 1 and 1000000000000),created_at timestamptz not null default now(),
 unique(user_id,category_id,month_start),foreign key(user_id,category_id,category_kind) references public.categories(user_id,id,kind)
);
create table public.holdings (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 100),symbol text not null default '' check(char_length(symbol)<=20),
 asset_class text not null check(asset_class in ('stocks','etf','bonds','crypto','cash','other')),
 quantity_micros bigint not null check(quantity_micros between 1 and 1000000000000),
 cost_price_minor bigint not null check(cost_price_minor between 0 and 1000000000000),current_price_minor bigint not null check(current_price_minor between 0 and 1000000000000),
 price_on date not null check(price_on between date '1900-01-01' and (now() at time zone 'Europe/Chisinau')::date),
 currency text not null default 'RON' check(currency='RON'),created_at timestamptz not null default now(),
 check((quantity_micros::numeric * greatest(cost_price_minor,current_price_minor)) / 1000000 <= 9007199254740991)
);
create index holdings_owner_idx on public.holdings(user_id);
alter table public.budgets enable row level security;
alter table public.holdings enable row level security;
revoke all on public.budgets,public.holdings from public,anon,authenticated;
grant select,insert,update,delete on public.budgets,public.holdings to authenticated;
create policy budgets_owner on public.budgets for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy holdings_owner on public.holdings for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
commit;
