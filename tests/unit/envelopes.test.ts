import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  splitIncome,
  envelopeBalances,
  envelopeConfigSchema,
  type EnvelopeRule,
  type EnvelopeSnapshot,
} from "../../src/lib/envelopes";
import type {
  AccountRow,
  TransactionRow,
} from "../../src/lib/supabase/database.types";
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002";
const percentages = [2500, 2500, 1000, 1000, 1500, 1000, 500];
test("income splits conserve exact pennies, validates percentages and balances carry over by currency", () => {
  const rules = percentages.map((basis_points, sort_order) => ({
    id: String(sort_order),
    basis_points,
    sort_order,
  }));
  for (const amount of [1, 2, 3, 7, 99, 100, 10001, 1000000000000])
    assert.equal(
      Object.values(splitIncome(amount, rules)).reduce((s, v) => s + v, 0),
      amount,
    );
  assert.deepEqual(
    Object.values(splitIncome(10001, rules)).sort((x, y) => x - y),
    [500, 1000, 1000, 1000, 1500, 2500, 2501],
  );
  const config = {
    plan_id: a,
    enabled: "true",
    rules: [
      { id: a, percent: "33,33" },
      { id: b, percent: "66.67" },
    ],
  };
  assert.equal(envelopeConfigSchema.parse(config).rules[0].percent, 3333);
  assert.equal(
    envelopeConfigSchema.safeParse({
      ...config,
      rules: [{ id: a, percent: "99" }],
    }).success,
    false,
  );
  const plans = [
    {
      id: a,
      user_id: a,
      currency: "MDL" as const,
      enabled: true,
      start_on: "2026-01-01",
      created_at: "2026-01-01T00:00:00Z",
    },
  ];
  const snapshot: EnvelopeSnapshot = {
    plans,
    rules: rules.map((r, i) => ({
      ...r,
      user_id: a,
      plan_id: a,
      category_id: String(i),
      category_kind: "expense",
      envelope_kind:
        i === 5 ? "emergency" : i === 4 ? "investment" : "spending",
      is_fallback: i === 6,
    })),
    funding: rules.flatMap((r) => [
      {
        transaction_id: "jan",
        rule_id: r.id,
        user_id: a,
        basis_points: r.basis_points,
        amount_minor: splitIncome(10000, rules)[r.id],
      },
      {
        transaction_id: "feb",
        rule_id: r.id,
        user_id: a,
        basis_points: r.basis_points,
        amount_minor: splitIncome(20000, rules)[r.id],
      },
    ]),
  };
  const accounts: AccountRow[] = [
    {
      id: a,
      user_id: a,
      name: "Lei",
      currency: "MDL",
      opening_balance_minor: 99999,
      created_at: "",
    },
    {
      id: b,
      user_id: a,
      name: "Euro",
      currency: "EUR",
      opening_balance_minor: 0,
      created_at: "",
    },
  ];
  const tx = (
    id: string,
    kind: "income" | "expense",
    amount_minor: number,
    category_id: string,
    date: string,
    account_id = a,
  ): TransactionRow => ({
    id,
    user_id: a,
    account_id,
    kind,
    amount_minor,
    category_id,
    description: "Test",
    payment_method: "cash",
    occurred_on: date,
    created_at: date + "T12:00:00Z",
  });
  const rows = [
    tx("jan", "income", 10000, "income", "2026-01-02"),
    tx("feb", "income", 20000, "income", "2026-02-02"),
    tx("food", "expense", 1000, "0", "2026-01-03"),
    tx("other", "expense", 3000, "unmapped", "2026-02-03"),
    tx("euros", "expense", 10000, "0", "2026-01-03", b),
    tx("future", "expense", 99999, "0", "2026-12-31"),
  ];
  const balances = envelopeBalances(snapshot, accounts, [], rows, "2026-02-04");
  assert.equal(balances[0].funded, 7500);
  assert.equal(balances[0].spent, 1000);
  assert.equal(balances[0].available, 6500);
  assert.equal(balances[6].funded, 1500);
  assert.equal(balances[6].available, -1500);
  assert.equal(balances[5].available, 3000);
});
test("SQL funds every income atomically once, freezes old ratios, handles edits, pause, currencies and private scope", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;`,
    );
    for (const file of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
    await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
    async function as(id?: string) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id || "",
      ]);
      await db.exec(id ? "set role authenticated" : "set role anon");
    }
    await as(a);
    const account = (
      await db.query<{ id: string }>("select id from public.accounts")
    ).rows[0].id;
    const income = (
      await db.query<{ id: string }>(
        "select id from public.categories where kind='income' limit 1",
      )
    ).rows[0].id;
    const add = (amount: number, accountId = account) =>
      db.query<{ id: string }>(
        "insert into public.transactions(user_id,account_id,category_id,kind,description,amount_minor,occurred_on) values($1,$2,$3,'income','Încasare',$4,(now() at time zone 'Europe/Chisinau')::date) returning id",
        [a, accountId, income, amount],
      );
    const before = (await add(99999)).rows[0].id;
    const plan = (
      await db.query<{ id: string }>("select public.start_envelopes('MDL') id")
    ).rows[0].id;
    assert.equal(
      (
        await db.query<{ id: string }>(
          "select public.start_envelopes('MDL') id",
        )
      ).rows[0].id,
      plan,
    );
    const rules = (
      await db.query<EnvelopeRule>(
        "select * from public.envelope_rules order by sort_order",
      )
    ).rows;
    assert.equal(rules.length, 7);
    assert.equal(
      (await db.query("select * from public.envelope_funding")).rows.length,
      0,
    );
    const first = (await add(10001)).rows[0].id;
    const funding = async (id: string) =>
      (
        await db.query<{
          basis_points: number;
          amount_minor: number;
          sort_order: number;
        }>(
          "select f.basis_points,f.amount_minor,r.sort_order from public.envelope_funding f join public.envelope_rules r on r.id=f.rule_id where transaction_id=$1 order by sort_order",
          [id],
        )
      ).rows;
    assert.deepEqual(
      (await funding(first)).map((f) => f.amount_minor),
      [2501, 2500, 1000, 1000, 1500, 1000, 500],
    );
    await assert.rejects(
      db.query("update public.envelope_funding set amount_minor=0"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select fintrack_private.fund_income_envelopes()"),
      /permission denied/,
    );
    const changed = rules.map((r, i) => ({
      id: r.id,
      basis_points: [4000, 2000, 500, 500, 1500, 1000, 500][i],
    }));
    const configure = (enabled: boolean, rows = changed) =>
      db.query("select public.configure_envelopes($1,$2,$3)", [
        plan,
        enabled,
        JSON.stringify(rows),
      ]);
    await assert.rejects(
      configure(
        true,
        changed.map((r, i) => ({
          ...r,
          basis_points: i === 0 ? 3999 : r.basis_points,
        })),
      ),
      /totalizeze/,
    );
    await configure(true);
    assert.equal((await funding(first))[0].basis_points, 2500);
    const second = (await add(20000)).rows[0].id;
    assert.deepEqual(
      (await funding(second)).map((f) => f.amount_minor),
      [8000, 4000, 1000, 1000, 3000, 2000, 1000],
    );
    await db.query(
      "update public.transactions set amount_minor=20002 where id=$1",
      [first],
    );
    assert.deepEqual(
      (await funding(first)).map((f) => f.amount_minor),
      [5001, 5001, 2000, 2000, 3000, 2000, 1000],
    );
    await db.query(
      "update public.transactions set description='Actualizat' where id=$1",
      [first],
    );
    assert.equal((await funding(first)).length, 7);
    await configure(false);
    const paused = (await add(11111)).rows[0].id;
    assert.equal((await funding(paused)).length, 0);
    await configure(true);
    await db.query(
      "update public.transactions set amount_minor=22222 where id=$1",
      [paused],
    );
    await db.query(
      "update public.transactions set amount_minor=88888 where id=$1",
      [before],
    );
    assert.equal((await funding(paused)).length, 0);
    assert.equal((await funding(before)).length, 0);
    await db.query("delete from public.transactions where id=$1", [second]);
    assert.equal((await funding(second)).length, 0);
    const euro = (
      await db.query<{ id: string }>(
        "insert into public.accounts(user_id,name,currency) values($1,'Euro','EUR') returning id",
        [a],
      )
    ).rows[0].id;
    const euroBefore = (await add(10000, euro)).rows[0].id;
    assert.equal((await funding(euroBefore)).length, 0);
    await db.query("select public.start_envelopes('EUR')");
    const euroAfter = (await add(10000, euro)).rows[0].id;
    assert.equal((await funding(euroAfter))[0].basis_points, 2500);
    // A token-based income enters through the same transaction trigger.
    const token = "ft_sc_" + "a".repeat(64),
      hash = createHash("sha256").update(token).digest("hex");
    const device = (
      await db.query<{ id: string }>(
        "insert into public.shortcut_devices(user_id,name,token_hash,cash_account_id,card_account_id) values($1,'Test',$2,$3,$3) returning id",
        [a, hash, account],
      )
    ).rows[0].id;
    await db.query("select public.configure_shortcut_income($1,true)", [
      device,
    ]);
    await as();
    const native = (
      await db.query<{ v: { transaction_id: string } }>(
        "select public.shortcut_income($1,'native-allocation-1',10000,'card',$2,'') v",
        [token, income],
      )
    ).rows[0].v.transaction_id;
    await db.query(
      "select public.shortcut_income($1,'native-allocation-1',10000,'card',$2,'')",
      [token, income],
    );
    await assert.rejects(
      db.query("select public.start_envelopes('MDL')"),
      /permission denied/,
    );
    await as(a);
    assert.equal((await funding(native)).length, 7);
    const recurring = (
      await db.query<{ id: string }>(
        "insert into public.recurring_rules(user_id,account_id,category_id,kind,description,amount_minor,frequency,start_on,next_due_on) values($1,$2,$3,'income','Salariu recurent',10000,'monthly',(now() at time zone 'Europe/Chisinau')::date,(now() at time zone 'Europe/Chisinau')::date) returning id",
        [a, account, income],
      )
    ).rows[0].id;
    const posted = (
      await db.query<{ v: { transaction_id: string } }>(
        "select public.post_recurring(id,next_due_on,next_due_on,updated_at) v from public.recurring_rules where id=$1",
        [recurring],
      )
    ).rows[0].v.transaction_id;
    assert.equal((await funding(posted)).length, 7);
    const day = (
      await db.query<{ business_day: string }>(
        "select to_char(now() at time zone 'Europe/Chisinau','YYYY-MM-DD') as business_day",
      )
    ).rows[0].business_day;
    const importRows = JSON.stringify([
      {
        account_id: account,
        category_id: income,
        kind: "income",
        description: "Încasare CSV",
        amount_minor: 10000,
        payment_method: "card",
        occurred_on: day,
      },
    ]);
    await db.query("select public.import_transactions($1)", [importRows]);
    const imported = (
      await db.query<{ id: string }>(
        "select id from public.transactions where description='Încasare CSV'",
      )
    ).rows[0].id;
    assert.equal((await funding(imported)).length, 7);
    await db.query("select public.import_transactions($1)", [importRows]);
    assert.equal((await funding(imported)).length, 7);
    const investId = "00000000-0000-4000-8000-000000000003";
    const confirm = (
      expected: number,
      requestId = investId,
      accountId = account,
      ruleId = rules[4].id,
    ) =>
      db.query<{
        v: { transaction_id: string; replayed: boolean; amount_minor: number };
      }>("select public.confirm_envelope_investment($1,$2,$3,$4) v", [
        ruleId,
        accountId,
        requestId,
        expected,
      ]);
    await assert.rejects(confirm(7500, investId, euro), /moneda/);
    await assert.rejects(
      confirm(7500, investId, account, rules[0].id),
      /indisponibil/,
    );
    const confirmation = (await confirm(7500)).rows[0].v;
    assert.equal(confirmation.amount_minor, 7500);
    assert.equal(confirmation.replayed, false);
    assert.equal((await confirm(7500)).rows[0].v.replayed, true);
    const newIncome = (await add(10000)).rows[0].id;
    assert.equal((await funding(newIncome))[4].amount_minor, 1500);
    assert.equal((await confirm(7500)).rows[0].v.replayed, true);
    await assert.rejects(
      confirm(7500, "00000000-0000-4000-8000-000000000004"),
      /Disponibilul/,
    );
    await confirm(1500, "00000000-0000-4000-8000-000000000004");
    assert.equal(
      (
        await db.query(
          "select id from public.transactions where description='Investiție confirmată din buget'",
        )
      ).rows.length,
      2,
    );
    await as();
    await assert.rejects(confirm(7500), /permission denied/);
    await as(b);
    await assert.rejects(confirm(7500), /indisponibil/);
    assert.equal(
      (await db.query("select * from public.envelope_funding")).rows.length,
      0,
    );
    await assert.rejects(configure(true), /indisponibil/);
    await assert.rejects(
      db.query("update public.envelope_plans set start_on='1900-01-01'"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
