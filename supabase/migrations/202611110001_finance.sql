-- Apply manually to your Supabase project. No real financial integrations.
begin;
create table public.accounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 80), currency text not null default 'RON' check(currency='RON'),
 opening_balance_minor bigint not null default 0 check(abs(opening_balance_minor)<=1000000000000), created_at timestamptz not null default now(),
 unique(user_id,id)
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 80), kind text not null check(kind in ('income','expense')),
 created_at timestamptz not null default now(), unique(user_id,id,kind), unique(user_id,name,kind)
);
create table public.transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null, category_id uuid not null, kind text not null check(kind in ('income','expense')),
 description text not null check(char_length(btrim(description)) between 1 and 160),
 amount_minor bigint not null check(amount_minor between 1 and 1000000000000),
 occurred_on date not null check(occurred_on between date '1900-01-01' and date '2100-12-31'),
 created_at timestamptz not null default now(),
 foreign key(user_id,account_id) references public.accounts(user_id,id),
 foreign key(user_id,category_id,kind) references public.categories(user_id,id,kind)
);
create index transactions_user_date_idx on public.transactions(user_id,occurred_on desc,id);
create index transactions_account_idx on public.transactions(user_id,account_id);
create index transactions_category_idx on public.transactions(user_id,category_id,kind);
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
revoke all on public.accounts,public.categories,public.transactions from anon;
grant select,insert,update,delete on public.accounts,public.categories,public.transactions to authenticated;
create policy accounts_owner on public.accounts for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy categories_owner on public.categories for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy transactions_owner on public.transactions for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
-- Defaults are user-owned structure, not fictional transactions or starting balances.
create function public.initialize_finance_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.accounts(user_id,name) values(new.id,'Cont personal');
 insert into public.categories(user_id,name,kind) values
 (new.id,'Salariu','income'),(new.id,'Alte venituri','income'),
 (new.id,'Alimente','expense'),(new.id,'Locuință','expense'),(new.id,'Transport','expense'),(new.id,'Alte cheltuieli','expense');
 return new;
end;
$$;
revoke all on function public.initialize_finance_user() from public,anon,authenticated;
create trigger on_auth_user_created_finance after insert on auth.users for each row execute function public.initialize_finance_user();
-- Also initialize existing auth users when this migration is applied.
insert into public.accounts(user_id,name) select id,'Cont personal' from auth.users;
insert into public.categories(user_id,name,kind)
 select u.id,c.name,c.kind from auth.users u cross join (values('Salariu','income'),('Alte venituri','income'),('Alimente','expense'),('Locuință','expense'),('Transport','expense'),('Alte cheltuieli','expense')) as c(name,kind);
commit;
