import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { calculateFinance } from "../../src/lib/finance-calculations";
import { receivableSchema, receivableTotals } from "../../src/lib/receivables";
import { decisionBaseline } from "../../src/lib/decision-lab";
import type {
  AccountRow,
  TransactionRow,
} from "../../src/lib/supabase/database.types";
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002";
test("currency totals and receivables never sum MDL with EUR or settled debts", () => {
  const accounts: AccountRow[] = [
    {
      id: a,
      user_id: a,
      name: "Lei",
      currency: "MDL",
      opening_balance_minor: 100000,
      created_at: "",
    },
    {
      id: b,
      user_id: a,
      name: "Euro",
      currency: "EUR",
      opening_balance_minor: 50000,
      created_at: "",
    },
  ];
  const rows: TransactionRow[] = [
    {
      id: "1",
      user_id: a,
      account_id: a,
      category_id: a,
      kind: "income",
      amount_minor: 10000,
      payment_method: "card",
      description: "Lei",
      occurred_on: "2026-10-01",
      created_at: "",
    },
    {
      id: "2",
      user_id: a,
      account_id: b,
      category_id: a,
      kind: "income",
      amount_minor: 25000,
      payment_method: "card",
      description: "Euro",
      occurred_on: "2026-10-01",
      created_at: "",
    },
  ];
  const now = new Date("2026-11-11T12:00:00Z");
  const mdl = calculateFinance(accounts, [], rows, now),
    eur = calculateFinance(accounts, [], rows, now, "EUR");
  assert.equal(mdl.balance, 1100);
  assert.equal(eur.balance, 750);
  const baseline = decisionBaseline(
    [...mdl.transactions, ...eur.transactions],
    false,
    now,
  );
  assert.equal(baseline.incomeMinor, 3333);
  assert.equal(baseline.transactionCount, 1);
  const base = {
    id: a,
    user_id: a,
    person: "Ion",
    amount_minor: 12345,
    currency: "EUR" as const,
    note: "",
    occurred_on: "2026-01-01",
    settled_on: null,
    created_at: "",
  };
  assert.deepEqual(
    receivableTotals([
      base,
      { ...base, id: b, currency: "MDL", amount_minor: 500 },
      { ...base, id: "paid", amount_minor: 99999, settled_on: "2026-02-01" },
    ]),
    { MDL: 500, EUR: 12345 },
  );
  assert.equal(
    receivableSchema.parse({
      id: a,
      person: "Ion",
      amount: "123,45",
      currency: "EUR",
      occurred_on: "2026-01-01",
    }).amount,
    12345,
  );
  for (const amount of ["0", "-1", "1.234"])
    assert.equal(
      receivableSchema.safeParse({
        id: a,
        person: "Ion",
        amount,
        currency: "EUR",
        occurred_on: "2026-01-01",
      }).success,
      false,
    );
});
test("euro account and debt SQL protects units, ownership, settlement history and transfers", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;`,
    );
    for (const name of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
    await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
    async function as(id?: string) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id || "",
      ]);
      await db.exec(id ? "set role authenticated" : "set role anon");
    }
    await as(a);
    const mdl = (
      await db.query<{ id: string }>("select id from public.accounts")
    ).rows[0].id;
    const eur = (
      await db.query<{ id: string }>(
        "insert into public.accounts(user_id,name,currency,opening_balance_minor) values($1,'Euro','EUR',12345) returning id",
        [a],
      )
    ).rows[0].id;
    const eur2 = (
      await db.query<{ id: string }>(
        "insert into public.accounts(user_id,name,currency) values($1,'Cash EUR','EUR') returning id",
        [a],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query("update public.accounts set currency='MDL' where id=$1", [eur]),
      /Moneda/,
    );
    const transfer =
      "insert into public.transfers(user_id,from_account_id,to_account_id,amount_minor,occurred_on) values($1,$2,$3,100,'2026-01-01')";
    await assert.rejects(db.query(transfer, [a, mdl, eur]), /aceeași monedă/);
    await db.query(transfer, [a, eur, eur2]);
    const category = (
      await db.query<{ id: string }>(
        "select id from public.categories where kind='income' limit 1",
      )
    ).rows[0].id;
    const tx = (
      await db.query<{ id: string }>(
        "insert into public.transactions(user_id,account_id,category_id,kind,description,amount_minor,occurred_on) values($1,$2,$3,'income','Euro',100,'2026-01-01') returning id",
        [a, eur, category],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query("update public.transactions set account_id=$1 where id=$2", [
        mdl,
        tx,
      ]),
      /altă monedă/,
    );
    const add =
      "insert into public.receivables(user_id,person,amount_minor,currency,occurred_on) values($1,'Ion',50000,'EUR','2026-01-01') returning id";
    const debt = (await db.query<{ id: string }>(add, [a])).rows[0].id;
    await assert.rejects(
      db.query("update public.receivables set amount_minor=0 where id=$1", [
        debt,
      ]),
      /check constraint/,
    );
    await db.query(
      "update public.receivables set settled_on='2026-02-01' where id=$1",
      [debt],
    );
    assert.equal(
      (
        await db.query(
          "select id from public.receivables where settled_on is null",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select id from public.receivables where settled_on is not null",
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select id from public.transactions")).rows.length,
      1,
    );
    await as(b);
    assert.equal(
      (await db.query("select * from public.receivables")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.receivables set settled_on=null where id=$1 returning id",
          [debt],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(db.query(add, [a]), /row-level security/);
    await as(a);
    await db.query(
      "update public.receivables set settled_on=null where id=$1",
      [debt],
    );
    assert.equal(
      (
        await db.query(
          "select id from public.receivables where settled_on is null",
        )
      ).rows.length,
      1,
    );
    await as();
    await assert.rejects(
      db.query("select * from public.receivables"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
