begin;
alter table public.accounts drop constraint accounts_currency_check;
alter table public.accounts add constraint accounts_currency_check check(currency in ('MDL','EUR'));
-- Currency is a unit, never an editable label for existing balances/history.
create function public.preserve_account_currency() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.currency is distinct from old.currency then raise exception 'Moneda unui cont existent nu poate fi schimbată. Creează un cont nou.' using errcode='23514';end if;
 return new;
end;$$;
revoke all on function public.preserve_account_currency() from public,anon,authenticated;
create trigger preserve_account_currency before update of currency on public.accounts for each row execute function public.preserve_account_currency();
create function public.check_transfer_currency() returns trigger language plpgsql security invoker set search_path='' as $$
declare source_currency text; destination_currency text;
begin
 select currency into source_currency from public.accounts where id=new.from_account_id and user_id=new.user_id;
 select currency into destination_currency from public.accounts where id=new.to_account_id and user_id=new.user_id;
 if source_currency is null or destination_currency is null then raise exception 'foreign key: conturile transferului trebuie să îți aparțină.' using errcode='23503';end if;
 if source_currency<>destination_currency then raise exception 'Transferul necesită două conturi proprii în aceeași monedă.' using errcode='23514';end if;
 return new;
end;$$;
revoke all on function public.check_transfer_currency() from public,anon,authenticated;
create trigger check_transfer_currency before insert or update on public.transfers for each row execute function public.check_transfer_currency();
create function public.preserve_transaction_unit() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.account_id is distinct from old.account_id and
 (select currency from public.accounts where id=new.account_id and user_id=new.user_id) is distinct from
 (select currency from public.accounts where id=old.account_id and user_id=old.user_id) then
 raise exception 'Nu poți muta o tranzacție în altă monedă fără conversie.' using errcode='23514';end if;
 return new;
end;$$;
revoke all on function public.preserve_transaction_unit() from public,anon,authenticated;
create trigger preserve_transaction_unit before update of account_id on public.transactions for each row execute function public.preserve_transaction_unit();
create table public.receivables (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 person text not null check(char_length(btrim(person)) between 1 and 100),
 amount_minor bigint not null check(amount_minor between 1 and 1000000000000),
 currency text not null default 'MDL' check(currency in ('MDL','EUR')),
 note text not null default '' check(char_length(note)<=300),
 occurred_on date not null check(occurred_on between date '1900-01-01' and date '2100-12-31'),
 settled_on date check(settled_on between occurred_on and date '2100-12-31'),
 created_at timestamptz not null default now()
);
create index receivables_owner_status_idx on public.receivables(user_id,settled_on,occurred_on,id);
alter table public.receivables enable row level security;
revoke all on public.receivables from public,anon,authenticated;
grant select,insert,update,delete on public.receivables to authenticated;
create policy receivables_owner on public.receivables for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
commit;
