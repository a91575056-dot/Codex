begin;
-- Product correction: historical amounts were entered as Moldovan lei.
-- This relabels their unit, with NO exchange-rate conversion or numeric change.
-- Apply to production only after the owner confirms this interpretation.
alter table public.accounts drop constraint accounts_currency_check;
alter table public.accounts alter column currency set default 'MDL';
update public.accounts set currency='MDL' where currency='RON';
alter table public.accounts add constraint accounts_currency_check check(currency='MDL');
alter table public.holdings drop constraint holdings_currency_check;
alter table public.holdings alter column currency set default 'MDL';
update public.holdings set currency='MDL' where currency='RON';
alter table public.holdings add constraint holdings_currency_check check(currency='MDL');
alter table public.savings_goals drop constraint savings_goals_currency_check;
alter table public.savings_goals alter column currency set default 'MDL';
update public.savings_goals set currency='MDL' where currency='RON';
alter table public.savings_goals add constraint savings_goals_currency_check check(currency in ('MDL','EUR'));
-- Contributions inherit the immutable goal currency; no independent denomination
-- can be supplied by a client or mixed into an existing goal's history.
create function public.preserve_goal_currency() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if new.currency is distinct from old.currency then
  raise exception 'Moneda unui obiectiv existent nu poate fi schimbată.' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function public.preserve_goal_currency() from public,anon,authenticated;
create trigger preserve_goal_currency before update of currency on public.savings_goals
for each row execute function public.preserve_goal_currency();
-- An MDL income baseline must never be compared with an EUR target, even through
-- a direct Data API insert bypassing the application's server action.
create function public.require_mdl_scenario() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if not exists(select 1 from public.savings_goals where id=new.goal_id and user_id=new.user_id and currency='MDL') then
  raise exception 'Scenariile pe venituri în MDL necesită un obiectiv în MDL.' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function public.require_mdl_scenario() from public,anon,authenticated;
create trigger require_mdl_scenario before insert on public.goal_scenarios
for each row execute function public.require_mdl_scenario();
commit;
