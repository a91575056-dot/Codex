import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  accountBalance,
  transferSchema,
  recurringSchema,
} from "../../src/lib/operations";
import { parseCSV, previewCSV } from "../../src/lib/csv-import";
import { calculateFinance } from "../../src/lib/finance-calculations";
import type {
  AccountRow,
  CategoryRow,
  TransactionRow,
} from "../../src/lib/supabase/database.types";
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002";
const accounts: AccountRow[] = [
  {
    id: a,
    user_id: a,
    name: "Card",
    currency: "MDL",
    opening_balance_minor: 100000,
    created_at: "",
  },
  {
    id: b,
    user_id: a,
    name: "Numerar",
    currency: "MDL",
    opening_balance_minor: 0,
    created_at: "",
  },
];
const categories: CategoryRow[] = [
  { id: a, user_id: a, name: "Salariu", kind: "income", created_at: "" },
  { id: b, user_id: a, name: "Alimente", kind: "expense", created_at: "" },
];
test("CSV parser validates exact money, quoted delimiters, export roundtrips and rejects unsupported or ambiguous data", () => {
  assert.deepEqual(parseCSV('a;b\r\n"unu;doi";"text ""citat""\nlinie"'), [
    ["a", "b"],
    ["unu;doi", 'text "citat"\nlinie'],
  ]);
  const csv =
    'data;descriere;tip;suma;categorie;metoda\n2026-01-01;Salariu;venit;1250,50;Salariu;card\n01.01.2026;"Pâine; lapte";cheltuiala;12,25;Alimente;cash';
  const p = previewCSV(csv, accounts, categories, a);
  assert.equal(p.errors.length, 0);
  assert.equal(p.rows[0].amount_minor, 125050);
  assert.equal(p.rows[1].amount_minor, 1225);
  assert.equal(p.rows[1].occurred_on, "2026-01-01");
  const exported =
    '"FinTrack — Tranzacții personale"\r\n"Dată";"Descriere";"Categorie";"Plată";"Sumă MDL";"Cont"\r\n"2026-01-01";"\'=A1";"Alimente";"Nespecificat";"-12.25";"Numerar"';
  const round = previewCSV(exported, accounts, categories, a);
  assert.equal(round.errors.length, 0);
  assert.equal(round.rows[0].description, "=A1");
  assert.equal(round.rows[0].kind, "expense");
  assert.equal(round.rows[0].account_id, b);
  assert.throws(
    () =>
      previewCSV(
        '"DEMO — Date fictive"\ndata;descriere;categorie;suma',
        accounts,
        categories,
        a,
      ),
    /demo/,
  );
  assert.throws(() => parseCSV('a;b\n"neînchis;b'), /neînchise/);
  assert.throws(
    () =>
      previewCSV(
        "data;descriere;categorie;suma_eur\n2026-01-01;x;Alimente;1",
        accounts,
        categories,
        a,
      ),
    /Antet/,
  );
  for (const line of [
    "2026-01-01;x;venit;-1;Salariu;card",
    "2026-02-30;x;venit;1;Salariu;card",
    "2026-01-01;x;venit;1.234;Salariu;card",
    "2026-01-01;x;venit;1;Alimente;card",
  ])
    assert.equal(
      previewCSV(csv.split("\n")[0] + "\n" + line, accounts, categories, a)
        .errors.length,
      1,
    );
  assert.equal(
    previewCSV(
      csv,
      [
        ...accounts,
        {
          ...accounts[0],
          id: "00000000-0000-4000-8000-000000000004",
          name: "card",
        },
      ],
      categories,
      "unknown",
    ).errors.length,
    2,
  );
  assert.throws(
    () =>
      previewCSV(
        csv.split("\n")[0] +
          "\n" +
          Array.from({ length: 501 }, () => csv.split("\n")[1]).join("\n"),
        accounts,
        categories,
        a,
      ),
    /500/,
  );
});
test("transfers change account balances without distorting income, expenses or total wealth", () => {
  const tx: TransactionRow = {
    id: a,
    user_id: a,
    account_id: a,
    category_id: a,
    kind: "income",
    description: "Salariu",
    payment_method: "card",
    amount_minor: 10000,
    occurred_on: "2026-01-01",
    created_at: "",
  };
  const transfer = {
    id: a,
    user_id: a,
    from_account_id: a,
    to_account_id: b,
    amount_minor: 20000,
    description: "Numerar",
    occurred_on: "2026-01-01",
    created_at: "",
  };
  assert.equal(
    accountBalance(accounts[0], [tx], [transfer], "2026-01-02"),
    90000,
  );
  assert.equal(
    accountBalance(accounts[1], [tx], [transfer], "2026-01-02"),
    20000,
  );
  const f = calculateFinance(
    accounts,
    categories,
    [tx],
    new Date("2026-01-02T12:00:00Z"),
  );
  assert.equal(f.balance, 1100);
  assert.equal(f.income, 100);
  assert.equal(f.expenses, 0);
  assert.equal(
    accountBalance(
      accounts[0],
      [tx],
      [{ ...transfer, occurred_on: "2027-01-01" }],
      "2026-01-02",
    ),
    110000,
  );
  assert.equal(
    transferSchema.safeParse({
      request_id: a,
      from_account_id: a,
      to_account_id: a,
      amount: "1",
      occurred_on: "2026-01-01",
    }).success,
    false,
  );
  assert.equal(
    recurringSchema.safeParse({
      request_id: a,
      account_id: a,
      category_id: b,
      kind: "expense",
      description: "Chirie",
      amount: "100",
      frequency: "monthly",
      start_on: "2026-02-01",
      next_due_on: "2026-01-01",
      active: "true",
    }).success,
    false,
  );
});
test("finance workflow SQL is atomic, idempotent and isolates two owners", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;`,
    );
    for (const f of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
    await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
    const aa = (
      await db.query<{ id: string }>(
        "select id from public.accounts where user_id=$1",
        [a],
      )
    ).rows[0].id;
    const ba = (
      await db.query<{ id: string }>(
        "select id from public.accounts where user_id=$1",
        [b],
      )
    ).rows[0].id;
    const cash = (
      await db.query<{ id: string }>(
        "insert into public.accounts(user_id,name) values($1,'Cash') returning id",
        [a],
      )
    ).rows[0].id;
    const cat = (
      await db.query<{ id: string }>(
        "select id from public.categories where user_id=$1 and name='Alimente'",
        [a],
      )
    ).rows[0].id;
    const foreignCat = (
      await db.query<{ id: string }>(
        "select id from public.categories where user_id=$1 and name='Alimente'",
        [b],
      )
    ).rows[0].id;
    async function as(id?: string) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id || "",
      ]);
      await db.exec(id ? "set role authenticated" : "set role anon");
    }
    await as(a);
    const ins =
      "insert into public.transfers(user_id,from_account_id,to_account_id,amount_minor,occurred_on) values($1,$2,$3,1000,'2026-01-01') returning id";
    const tr = (await db.query<{ id: string }>(ins, [a, aa, cash])).rows[0].id;
    await assert.rejects(db.query(ins, [a, aa, ba]), /foreign key/);
    await assert.rejects(db.query(ins, [a, aa, aa]), /check constraint/);
    await assert.rejects(
      db.query(ins, [b, ba, cash]),
      /row-level security|foreign key/,
    );
    await as(b);
    assert.equal(
      (await db.query("select * from public.transfers")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "delete from public.transfers where id=$1 returning id",
          [tr],
        )
      ).rows.length,
      0,
    );
    await as(a);
    const rule = (
      await db.query<{ id: string; updated_at: Date }>(
        "insert into public.recurring_rules(user_id,account_id,category_id,kind,description,amount_minor,frequency,start_on,next_due_on) values($1,$2,$3,'expense','Abonament',10000,'monthly','2024-01-31','2024-01-31') returning id,updated_at",
        [a, aa, cat],
      )
    ).rows[0];
    const next = async (start: string, due: string, freq: string) =>
      new Date(
        (
          await db.query<{ d: Date }>(
            "select public.finance_next_due($1,$2,$3) as d",
            [start, due, freq],
          )
        ).rows[0].d,
      )
        .toISOString()
        .slice(0, 10);
    assert.equal(
      await next("2024-01-31", "2024-01-31", "monthly"),
      "2024-02-29",
    );
    assert.equal(
      await next("2024-01-31", "2024-02-29", "monthly"),
      "2024-03-31",
    );
    assert.equal(
      await next("2023-01-31", "2023-01-31", "monthly"),
      "2023-02-28",
    );
    assert.equal(
      await next("2024-02-29", "2027-02-28", "yearly"),
      "2028-02-29",
    );
    assert.equal(
      await next("2026-12-28", "2026-12-28", "weekly"),
      "2027-01-04",
    );
    const post = (version: string, due = "2024-01-31") =>
      db.query<{ result: { transaction_id: string; replayed: boolean } }>(
        "select public.post_recurring($1,$2,'2026-01-01',$3) as result",
        [rule.id, due, version],
      );
    await assert.rejects(post("1970-01-01T00:00:00Z"), /modificată/);
    const first = (await post(new Date(rule.updated_at).toISOString())).rows[0]
      .result;
    assert.equal(first.replayed, false);
    const retry = (await post(new Date(rule.updated_at).toISOString())).rows[0]
      .result;
    assert.equal(retry.replayed, true);
    assert.equal(retry.transaction_id, first.transaction_id);
    assert.equal(
      (await db.query("select * from public.transactions")).rows.length,
      1,
    );
    await db.query(
      "update public.recurring_rules set active=false where id=$1",
      [rule.id],
    );
    let updated = (
      await db.query<{ updated_at: Date }>(
        "select updated_at from public.recurring_rules where id=$1",
        [rule.id],
      )
    ).rows[0].updated_at;
    await assert.rejects(
      post(new Date(updated).toISOString(), "2024-02-29"),
      /Scadența/,
    );
    await as(b);
    await assert.rejects(
      post(new Date(updated).toISOString(), "2024-02-29"),
      /disponibilă/,
    );
    await as(a);
    await db.query(
      "update public.recurring_rules set active=true where id=$1",
      [rule.id],
    );
    updated = (
      await db.query<{ updated_at: Date }>(
        "select updated_at from public.recurring_rules where id=$1",
        [rule.id],
      )
    ).rows[0].updated_at;
    await post(new Date(updated).toISOString(), "2024-02-29");
    assert.equal(
      new Date(
        (
          await db.query<{ next_due_on: Date }>(
            "select next_due_on from public.recurring_rules where id=$1",
            [rule.id],
          )
        ).rows[0].next_due_on,
      )
        .toISOString()
        .slice(0, 10),
      "2024-03-31",
    );
    await db.query("delete from public.recurring_rules where id=$1", [rule.id]);
    assert.equal(
      (await db.query("select * from public.recurring_occurrences")).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.transactions")).rows.length,
      2,
    );
    const imported = {
      account_id: aa,
      category_id: cat,
      kind: "expense",
      description: "Import",
      amount_minor: 1225,
      payment_method: "cash",
      occurred_on: "2026-01-01",
    };
    const imp = async (rows: unknown[]) =>
      (
        await db.query<{ result: { inserted: number; skipped: number } }>(
          "select public.import_transactions($1::jsonb) as result",
          [JSON.stringify(rows)],
        )
      ).rows[0].result;
    assert.deepEqual(await imp([imported, imported]), {
      inserted: 2,
      skipped: 0,
    });
    assert.deepEqual(await imp([imported, imported]), {
      inserted: 0,
      skipped: 2,
    });
    await assert.rejects(
      imp([
        { ...imported, description: "Atomic" },
        { ...imported, account_id: ba },
      ]),
      /foreign key/,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.transactions where description='Atomic'",
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      imp(Array.from({ length: 501 }, () => imported)),
      /500/,
    );
    await as(b);
    assert.equal(
      (await db.query("select * from public.transactions")).rows.length,
      0,
    );
    await assert.rejects(imp([imported]), /foreign key/);
    assert.deepEqual(
      await imp([{ ...imported, account_id: ba, category_id: foreignCat }]),
      { inserted: 1, skipped: 0 },
    );
    await as();
    await assert.rejects(imp([imported]), /permission denied/);
    await assert.rejects(
      db.query("select * from public.transfers"),
      /permission denied/,
    );
    await assert.rejects(
      post(new Date(updated).toISOString()),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
