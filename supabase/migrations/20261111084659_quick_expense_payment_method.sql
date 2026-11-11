begin;
alter table public.transactions add column payment_method text not null default 'unspecified' check(payment_method in ('cash','card','unspecified'));
comment on column public.transactions.payment_method is 'User-entered payment label. Historical records stay unspecified; it does not connect to a card or move money.';
commit;
