begin;
-- Opening loans describe a pre-existing position, not a new cash movement.
alter table public.loans add column opening_loan boolean not null default false;
grant insert(opening_loan) on public.loans to authenticated;
-- Drop the old signature to avoid ambiguous PostgREST overloads. Its original
-- seven-argument calls remain valid through the new optional parameter.
drop function public.record_loan(uuid,uuid,text,text,bigint,date,text);
create function public.record_loan(p_id uuid,p_account_id uuid,p_direction text,p_person text,p_amount_minor bigint,p_occurred_on date,p_note text default '',p_opening_loan boolean default false) returns uuid
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); c text; l public.loans;
begin
 if uid is null then raise exception 'Autentificare necesară.' using errcode='28000';end if;
 select currency into c from public.accounts where id=p_account_id and user_id=uid;
 if c is null or p_id is null then raise exception 'Cont indisponibil.' using errcode='22023';end if;
 insert into public.loans(id,user_id,account_id,currency,direction,person,amount_minor,occurred_on,note,opening_loan)
 values(p_id,uid,p_account_id,c,p_direction,btrim(p_person),p_amount_minor,p_occurred_on,btrim(p_note),p_opening_loan) on conflict(id) do nothing returning * into l;
 if not found then
  select * into l from public.loans where id=p_id and user_id=uid;
  if not found or l.account_id<>p_account_id or l.direction<>p_direction or l.person<>btrim(p_person) or l.amount_minor<>p_amount_minor or l.occurred_on<>p_occurred_on or l.note<>btrim(p_note) or l.opening_loan is distinct from p_opening_loan then
   raise exception 'Cererea există cu alte date.' using errcode='23505';end if;
 end if;
 return l.id;
end;$$;
revoke all on function public.record_loan(uuid,uuid,text,text,bigint,date,text,boolean) from public,anon,authenticated;
grant execute on function public.record_loan(uuid,uuid,text,text,bigint,date,text,boolean) to authenticated;


-- Unclassified accounts retain their existing behavior until explicitly typed.
alter table public.accounts add column account_type text not null default 'other'
 check(account_type in ('cash','card','other'));
grant insert(account_type),update(account_type) on public.accounts to authenticated;

-- Enforce the same routing rule for browser, shortcut, imports and recurring writes.
create function public.check_payment_account_type() returns trigger
language plpgsql security invoker set search_path='' as $$
declare t text;
begin
 select account_type into t from public.accounts where id=new.account_id and user_id=new.user_id;
 if t in ('cash','card') and new.payment_method in ('cash','card') and t<>new.payment_method then
  raise exception 'Alege contul Cash sau Card corespunzător metodei de plată.' using errcode='23514';
 end if;
 return new;
end;$$;
revoke all on function public.check_payment_account_type() from public,anon,authenticated;
create trigger transaction_payment_account_type before insert or update on public.transactions
 for each row execute function public.check_payment_account_type();
create trigger loan_payment_account_type before insert or update on public.loans
 for each row execute function public.check_payment_account_type();

-- Retyping an account cannot silently relabel historical cash/card movements.
create function public.check_account_reclassification() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.account_type in ('cash','card') and new.account_type is distinct from old.account_type and (
  exists(select 1 from public.transactions where user_id=new.user_id and account_id=new.id and payment_method in ('cash','card') and payment_method<>new.account_type)
  or exists(select 1 from public.loans where user_id=new.user_id and account_id=new.id and payment_method in ('cash','card') and payment_method<>new.account_type)
 ) then raise exception 'Contul conține operații cu altă metodă de plată. Păstrează-l neclasificat și creează un cont separat.' using errcode='23514'; end if;
 return new;
end;$$;
revoke all on function public.check_account_reclassification() from public,anon,authenticated;
create trigger account_reclassification before update of account_type on public.accounts
 for each row execute function public.check_account_reclassification();
commit;
