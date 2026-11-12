import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  loanAccountDelta,
  loanTotals,
  type Loan,
  loanSchema,
} from "../../src/lib/loans";
import { calculateFinance } from "../../src/lib/finance-calculations";
import { accountBalance } from "../../src/lib/operations";
import { shortcutLoanSchema } from "../../src/lib/shortcut";
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002",
  cash = "00000000-0000-4000-8000-000000000011",
  card = "00000000-0000-4000-8000-000000000012";
const loan = (overrides: Partial<Loan> = {}): Loan => ({
  id: a,
  user_id: a,
  direction: "lent",
  account_id: cash,
  currency: "MDL",
  person: "Ana",
  amount_minor: 25000,
  payment_method: "cash",
  note: "",
  occurred_on: "2026-01-02",
  settled_on: null,
  settled_account_id: null,
  created_at: "2026-01-02T00:00:00Z",
  ...overrides,
});
test("loans change cash by direction, settlement account and date without inflating earned income or spending", () => {
  const loans = [
    loan(),
    loan({ id: b, direction: "borrowed", amount_minor: 10000 }),
  ];
  assert.equal(loanAccountDelta(loans, cash, "2026-01-03"), -15000);
  assert.deepEqual(loanTotals(loans, "MDL"), {
    receivable: 25000,
    payable: 10000,
  });
  assert.deepEqual(loanTotals(loans, "EUR"), { receivable: 0, payable: 0 });
  const settled = loan({ settled_on: "2026-01-04", settled_account_id: card });
  assert.equal(loanAccountDelta([settled], cash, "2026-01-05"), -25000);
  assert.equal(loanAccountDelta([settled], card, "2026-01-05"), 25000);
  assert.equal(loanAccountDelta([settled], card, "2026-01-03"), 0);
  assert.equal(loanTotals([settled], "MDL").receivable, 0);
  const account = {
    id: cash,
    user_id: a,
    name: "Cash",
    currency: "MDL" as const,
    opening_balance_minor: 100000,
    created_at: "2026-01-01T00:00:00Z",
  };
  const totals = calculateFinance(
    [account],
    [],
    [],
    new Date("2026-01-03T12:00:00Z"),
    "MDL",
    loans,
  );
  assert.equal(totals.balance, 850);
  assert.equal(totals.income, 0);
  assert.equal(totals.expenses, 0);
  assert.ok(totals.cashFlow.every((r) => r.income === 0 && r.expenses === 0));
  assert.equal(accountBalance(account, [], [], "2026-01-03", loans), 85000);
});
test("loan validation rejects forged account/currency scope and negative or overprecise money", () => {
  const p = {
    request_id: "loan-request-123",
    direction: "borrowed",
    person: " Ana ",
    amount: "12,34",
    payment_method: "cash",
  };
  assert.equal(shortcutLoanSchema.parse(p).amount, 1234);
  assert.equal(shortcutLoanSchema.parse(p).person, "Ana");
  for (const patch of [
    { amount: 0 },
    { amount: "1.234" },
    { person: " " },
    { direction: "income" },
    { account_id: cash },
    { currency: "EUR" },
    { user_id: b },
    { category_id: a },
  ])
    assert.equal(
      shortcutLoanSchema.safeParse({ ...p, ...patch }).success,
      false,
    );
  assert.equal(
    loanSchema.safeParse({
      id: a,
      account_id: cash,
      direction: "lent",
      person: "Ana",
      amount: "25",
      occurred_on: "2200-01-01",
    }).success,
    false,
  );
});
test("loan SQL enforces opt-in, owner/currency isolation, idempotence, cross-kind collisions and one full repayment", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;",
    );
    for (const f of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
    await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
    const as = async (id?: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id || "",
      ]);
      await db.exec(id ? "set role authenticated" : "set role anon");
    };
    await as(a);
    const acc = (
      await db.query<{ id: string }>("select id from public.accounts")
    ).rows[0].id;
    const euro = (
      await db.query<{ id: string }>(
        "insert into public.accounts(user_id,name,currency) values($1,'Euro','EUR') returning id",
        [a],
      )
    ).rows[0].id;
    await db.query("select public.start_envelopes('MDL')");
    const token = "ft_sc_" + "b".repeat(64),
      hash = createHash("sha256").update(token).digest("hex");
    const device = (
      await db.query<{ id: string }>(
        "insert into public.shortcut_devices(user_id,name,token_hash,cash_account_id,card_account_id) values($1,'Loan test',$2,$3,$3) returning id",
        [a, hash, acc],
      )
    ).rows[0].id;
    const post = (request: string, direction = "lent", amount = 25000) =>
      db.query<{ v: { loan_id: string; replayed: boolean } }>(
        "select public.shortcut_loan($1,$2,$3,'Ana',$4,'cash','Detalii') v",
        [token, request, direction, amount],
      );
    await as();
    await assert.rejects(post("loan-request-01"), /Activează/);
    await assert.rejects(
      db.query("select public.configure_shortcut_loans($1,true)", [device]),
      /permission denied/,
    );
    await as(b);
    await assert.rejects(
      db.query("select public.configure_shortcut_loans($1,true)", [device]),
      /indisponibil/,
    );
    await as(a);
    await db.query("select public.configure_shortcut_loans($1,true)", [device]);
    await as();
    const result = (await post("loan-request-01")).rows[0].v;
    assert.equal(result.replayed, false);
    assert.equal((await post("loan-request-01")).rows[0].v.replayed, true);
    await assert.rejects(post("loan-request-01", "borrowed"), /alte date/);
    await assert.rejects(post("loan-request-01", "lent", 10000), /alte date/);
    await assert.rejects(
      db.query("select * from public.loans"),
      /permission denied/,
    );
    await as(b);
    assert.equal((await db.query("select * from public.loans")).rows.length, 0);
    await assert.rejects(
      db.query("select public.settle_loan($1,$2)", [result.loan_id, acc]),
      /indisponibil/,
    );
    await as(a);
    assert.equal(
      (await db.query("select * from public.transactions")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.envelope_funding")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.settle_loan($1,$2)", [result.loan_id, euro]),
      /monedă/,
    );
    await db.query("select public.settle_loan($1,$2)", [result.loan_id, acc]);
    await db.query("select public.settle_loan($1,$2)", [result.loan_id, acc]);
    assert.equal(
      (
        await db.query(
          "select * from public.loans where settled_on is not null",
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      db.query(
        "update public.loans set settled_on=null,settled_account_id=null where id=$1",
        [result.loan_id],
      ),
      /nu poate fi modificată/,
    );
    const expense = (
      await db.query<{ id: string }>(
        "select id from public.categories where kind='expense' limit 1",
      )
    ).rows[0].id;
    await as();
    await assert.rejects(
      db.query(
        "select public.shortcut_expense($1,'loan-request-01',25000,'cash',$2,'Detalii')",
        [token, expense],
      ),
      /alt tip/,
    );
    await db.query(
      "select public.shortcut_expense($1,'normal-request-02',500,'cash',$2,'Detalii')",
      [token, expense],
    );
    await assert.rejects(post("normal-request-02"), /alt tip/);
    await post("borrow-request-03", "borrowed", 10000);
    await as(a);
    assert.equal(
      (await db.query("select * from public.envelope_funding")).rows.length,
      0,
    );
    await db.query("select public.configure_shortcut_loans($1,false)", [
      device,
    ]);
    await as();
    await assert.rejects(post("disabled-request-04"), /Activează/);
    await as(a);
    await db.query("delete from public.shortcut_devices where id=$1", [device]);
    await as();
    await assert.rejects(post("revoked-request-05"), /neautorizat/);
  } finally {
    await db.close();
  }
});
