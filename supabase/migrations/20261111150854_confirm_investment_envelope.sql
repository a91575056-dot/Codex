begin;
-- Records an investment already made; never executes a bank transfer or trade.
create function public.confirm_envelope_investment(p_rule_id uuid,p_account_id uuid,p_request_id uuid,p_expected_available bigint) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid();r public.envelope_rules;p public.envelope_plans;t public.transactions;funded numeric;spent numeric;available bigint;inserted_id uuid;today date:=(now() at time zone 'Europe/Chisinau')::date;
begin
 if uid is null then raise exception 'Autentificare necesară.' using errcode='28000';end if;
 if p_rule_id is null or p_account_id is null or p_request_id is null or p_expected_available is null or p_expected_available not between 1 and 1000000000000 then raise exception 'Date invalide.' using errcode='22023';end if;
 select * into r from public.envelope_rules where id=p_rule_id and user_id=uid and envelope_kind='investment';
 if not found then raise exception 'Buget indisponibil.' using errcode='42501';end if;
 -- Same lock used by income funding/configuration; an incoming salary cannot be consumed accidentally.
 select * into p from public.envelope_plans where id=r.plan_id and user_id=uid for update;
 if not found or not exists(select 1 from public.accounts where id=p_account_id and user_id=uid and currency=p.currency) then raise exception 'Alege un cont propriu în moneda bugetului.' using errcode='42501';end if;
 select * into t from public.transactions where id=p_request_id and user_id=uid;
 if found then
  if t.kind<>'expense' or t.account_id<>p_account_id or t.category_id<>r.category_id or t.amount_minor<>p_expected_available or t.description<>'Investiție confirmată din buget' then raise exception 'Cererea există cu alte date.' using errcode='23505';end if;
  return jsonb_build_object('transaction_id',t.id,'amount_minor',t.amount_minor,'currency',p.currency,'replayed',true);
 end if;
 select coalesce(sum(f.amount_minor),0) into funded from public.envelope_funding f
 join public.transactions x on x.id=f.transaction_id and x.user_id=f.user_id
 join public.accounts a on a.id=x.account_id and a.user_id=x.user_id
 where f.rule_id=r.id and f.user_id=uid and x.kind='income' and a.currency=p.currency and x.occurred_on between p.start_on and today;
 select coalesce(sum(x.amount_minor),0) into spent from public.transactions x
 join public.accounts a on a.id=x.account_id and a.user_id=x.user_id
 where x.user_id=uid and x.kind='expense' and x.category_id=r.category_id and a.currency=p.currency
 and x.occurred_on between p.start_on and today and x.created_at>=p.created_at;
 available:=funded-spent;
 if available<=0 or available<>p_expected_available then raise exception 'Disponibilul s-a schimbat. Reîncarcă pagina și verifică suma.' using errcode='40001';end if;
 insert into public.transactions(id,user_id,account_id,category_id,kind,description,amount_minor,payment_method,occurred_on)
 values(p_request_id,uid,p_account_id,r.category_id,'expense','Investiție confirmată din buget',available,'unspecified',today)
 on conflict(id) do nothing returning id into inserted_id;
 if inserted_id is null then raise exception 'Cererea există deja. Verifică tranzacțiile.' using errcode='23505';end if;
 return jsonb_build_object('transaction_id',inserted_id,'amount_minor',available,'currency',p.currency,'replayed',false);
end;$$;
revoke all on function public.confirm_envelope_investment(uuid,uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.confirm_envelope_investment(uuid,uuid,uuid,bigint) to authenticated;
commit;
