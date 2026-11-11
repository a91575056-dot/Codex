import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  shortcutTransactionSchema,
  shortcutExpenseSchema,
  deviceSchema,
} from "../../src/lib/shortcut";
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002";
const token = "ft_sc_" + "a".repeat(64);
const hash = createHash("sha256").update(token).digest("hex");

test("native shortcut validation accepts exact cents and rejects forged scope or malformed inputs", () => {
  const valid = {
    request_id: "20261111120000-123456",
    amount: "12,34",
    payment_method: "cash",
    category_id: a,
  };
  assert.equal(shortcutExpenseSchema.parse(valid).amount, 1234);
  assert.equal(
    shortcutTransactionSchema.parse({ ...valid, kind: "income" }).amount,
    1234,
  );
  assert.equal(shortcutTransactionSchema.safeParse(valid).success, false);
  assert.equal(
    shortcutTransactionSchema.safeParse({ ...valid, kind: "transfer" }).success,
    false,
  );
  assert.equal(
    shortcutExpenseSchema.parse({ ...valid, amount: 12.34 }).amount,
    1234,
  );
  for (const amount of [
    0,
    -1,
    1.234,
    "1e2",
    "NaN",
    Infinity,
    "1,234",
    "10000000001",
  ])
    assert.equal(
      shortcutExpenseSchema.safeParse({ ...valid, amount }).success,
      false,
    );
  assert.equal(
    shortcutExpenseSchema.safeParse({ ...valid, user_id: b }).success,
    false,
  );
  assert.equal(
    shortcutExpenseSchema.safeParse({ ...valid, account_id: b }).success,
    false,
  );
  assert.equal(
    shortcutExpenseSchema.safeParse({ ...valid, request_id: "bad" }).success,
    false,
  );
  assert.equal(
    shortcutExpenseSchema.safeParse({ ...valid, payment_method: "income" })
      .success,
    false,
  );
  assert.equal(
    deviceSchema.safeParse({
      name: "iPhone",
      cash_account_id: a,
      card_account_id: b,
    }).success,
    true,
  );
});

test("device SQL enforces owner isolation, expiry, revocation, scope, idempotency and rate limits", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema public,auth to anon,authenticated;`,
    );
    for (const file of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
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
    const category = (
      await db.query<{ id: string }>(
        "select id from public.categories where user_id=$1 and name='Alimente'",
        [a],
      )
    ).rows[0].id;
    const foreignCategory = (
      await db.query<{ id: string }>(
        "select id from public.categories where user_id=$1 and name='Alimente'",
        [b],
      )
    ).rows[0].id;
    const incomeCategory = (
      await db.query<{ id: string }>(
        "select id from public.categories where user_id=$1 and kind='income' limit 1",
        [a],
      )
    ).rows[0].id;
    async function as(id?: string) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id || "",
      ]);
      await db.exec(id ? "set role authenticated" : "set role anon");
    }
    const insert =
      "insert into public.shortcut_devices(user_id,name,token_hash,cash_account_id,card_account_id) values($1,'iPhone',$2,$3,$4) returning id";
    await as(a);
    await assert.rejects(db.query(insert, [a, hash, ba, aa]), /foreign key/);
    const device = (await db.query<{ id: string }>(insert, [a, hash, cash, aa]))
      .rows[0].id;
    await assert.rejects(
      db.query(
        "update public.shortcut_devices set expires_at=now()+interval '10 years' where id=$1",
        [device],
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "insert into public.shortcut_devices(user_id,name,token_hash,cash_account_id,card_account_id,expires_at) values($1,'bad',$2,$3,$3,now()+interval '10 years')",
        [a, "b".repeat(64), aa],
      ),
      /permission denied/,
    );
    await as(b);
    assert.equal(
      (await db.query("select * from public.shortcut_devices")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "delete from public.shortcut_devices where id=$1 returning id",
          [device],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.shortcut_options($1)", [token]),
      /neautorizat/,
    );
    await as();
    await assert.rejects(
      db.query("select * from public.shortcut_devices"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select fintrack_private.check_shortcut($1)", [token]),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.shortcut_options($1)", ["bad"]),
      /neautorizat/,
    );
    await assert.rejects(
      db.query("select public.shortcut_options($1)", [
        "ft_sc_" + "b".repeat(64),
      ]),
      /neautorizat/,
    );
    const options = (
      await db.query<{
        result: { currency: string; categories: Record<string, string> };
      }>("select public.shortcut_options($1) as result", [token])
    ).rows[0].result;
    assert.equal(options.currency, "MDL");
    assert.equal(options.categories.Alimente, category);
    assert.equal(
      Object.values(options.categories).includes(foreignCategory),
      false,
    );
    const save = (id: string, amount = 1234, method = "cash", cat = category) =>
      db.query<{ result: { transaction_id: string; replayed: boolean } }>(
        "select public.shortcut_expense($1,$2,$3,$4,$5,'Cafea') as result",
        [token, id, amount, method, cat],
      );
    const first = (await save("request-0001")).rows[0].result;
    assert.equal(first.replayed, false);
    const retry = (await save("request-0001")).rows[0].result;
    assert.equal(retry.transaction_id, first.transaction_id);
    assert.equal(retry.replayed, true);
    await assert.rejects(save("request-0001", 999), /alte date/);
    await assert.rejects(
      save("request-0002", 1234, "cash", foreignCategory),
      /Categoria/,
    );
    await assert.rejects(
      save("request-0003", 1234, "cash", incomeCategory),
      /Categoria/,
    );
    await assert.rejects(save("request-0004", 0), /invalide/);
    await assert.rejects(save("request-0005", 1234, "income"), /invalide/);
    await save("request-0006", 500, "card");
    await as(a);
    const rows = (
      await db.query<{
        account_id: string;
        amount_minor: number;
        payment_method: string;
      }>(
        "select account_id,amount_minor,payment_method from public.transactions order by amount_minor",
      )
    ).rows;
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], {
      account_id: aa,
      amount_minor: 500,
      payment_method: "card",
    });
    assert.deepEqual(rows[1], {
      account_id: cash,
      amount_minor: 1234,
      payment_method: "cash",
    });
    await as(b);
    assert.equal(
      (await db.query("select * from public.transactions")).rows.length,
      0,
    );
    await db.exec("reset role");
    await db.query(
      "update public.shortcut_devices set rate_count=20,rate_window_at=now() where id=$1",
      [device],
    );
    await as();
    await assert.rejects(save("request-0007"), /multe cereri/);
    await db.exec("reset role");
    await db.query(
      "update public.shortcut_devices set rate_window_at=now()-interval '2 minutes' where id=$1",
      [device],
    );
    await as();
    await db.query("select public.shortcut_options($1)", [token]);
    await db.exec("reset role");
    await db.query(
      "update public.shortcut_devices set expires_at=now()-interval '1 second' where id=$1",
      [device],
    );
    await as();
    await assert.rejects(save("request-0008"), /neautorizat/);
    await as(a);
    await db.query("delete from public.shortcut_devices where id=$1", [device]);
    await as();
    await assert.rejects(save("request-0009"), /neautorizat/);
    await as(a);
    assert.equal(
      (await db.query("select * from public.transactions")).rows.length,
      2,
    );
  } finally {
    await db.close();
  }
});

test("income device scope is opt-in, owner-only, typed, idempotent and revocable", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema public,auth to anon,authenticated;`,
    );
    for (const file of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
    await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
    const account = (
      await db.query<{ id: string }>(
        "select id from public.accounts where user_id=$1",
        [a],
      )
    ).rows[0].id;
    const device = (
      await db.query<{ id: string }>(
        "insert into public.shortcut_devices(user_id,name,token_hash,cash_account_id,card_account_id) values($1,'iPhone',$2,$3,$3) returning id",
        [a, hash, account],
      )
    ).rows[0].id;
    async function as(id?: string) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id || "",
      ]);
      await db.exec(id ? "set role authenticated" : "set role anon");
    }
    const options = async () =>
      (
        await db.query<{
          v: {
            categories: Record<string, string>;
            income_categories: Record<string, string>;
            income_enabled: boolean;
          };
        }>("select public.shortcut_finance_options($1) v", [token])
      ).rows[0].v;
    const income = (id: string, cat: string, amount = 120000) =>
      db.query<{ v: { transaction_id: string; replayed: boolean } }>(
        "select public.shortcut_income($1,$2,$3,'card',$4,'') v",
        [token, id, amount, cat],
      );
    await as();
    assert.equal((await options()).income_enabled, false);
    assert.deepEqual((await options()).income_categories, {});
    await assert.rejects(
      db.query("select public.configure_shortcut_income($1,true)", [device]),
      /permission denied/,
    );
    await assert.rejects(income("salary-request-1", a), /Activează/);
    await as(b);
    await assert.rejects(
      db.query("select public.configure_shortcut_income($1,true)", [device]),
      /indisponibil/,
    );
    await as(a);
    await db.query("select public.configure_shortcut_income($1,true)", [
      device,
    ]);
    // Enabling again never creates duplicate categories.
    await db.query("select public.configure_shortcut_income($1,true)", [
      device,
    ]);
    assert.equal(
      (await db.query("select id from public.categories where name='Bonus'"))
        .rows.length,
      1,
    );
    await as();
    const opts = await options();
    assert.equal(opts.income_enabled, true);
    assert.deepEqual(Object.keys(opts.income_categories).sort(), [
      "Alte venituri",
      "Bonus",
      "Salariu",
    ]);
    assert.ok(opts.categories.Alimente);
    const first = (
      await income("salary-request-1", opts.income_categories.Salariu)
    ).rows[0].v;
    assert.equal(first.replayed, false);
    assert.equal(
      (await income("salary-request-1", opts.income_categories.Salariu)).rows[0]
        .v.replayed,
      true,
    );
    await assert.rejects(
      income("salary-request-1", opts.income_categories.Salariu, 999),
      /alte date/,
    );
    await assert.rejects(
      income("salary-request-2", opts.categories.Alimente),
      /Categoria/,
    );
    await assert.rejects(
      db.query(
        "select public.shortcut_expense($1,'salary-request-1',120000,'card',$2,'')",
        [token, opts.categories.Alimente],
      ),
      /alte date/,
    );
    await as(b);
    const foreign = (
      await db.query<{ id: string }>(
        "select id from public.categories where kind='income' limit 1",
      )
    ).rows[0].id;
    await as();
    await assert.rejects(income("foreign-request", foreign), /Categoria/);
    await as(a);
    const row = (
      await db.query<{
        kind: string;
        amount_minor: number;
        account_id: string;
      }>(
        "select kind,amount_minor,account_id from public.transactions where id=$1",
        [first.transaction_id],
      )
    ).rows[0];
    assert.deepEqual(row, {
      kind: "income",
      amount_minor: 120000,
      account_id: account,
    });
    await db.query("select public.configure_shortcut_income($1,false)", [
      device,
    ]);
    await as();
    assert.deepEqual((await options()).income_categories, {});
    await assert.rejects(
      income("disabled-request", opts.income_categories.Salariu),
      /Activează/,
    );
    await db.query(
      "select public.shortcut_expense($1,'expense-still-ok',100,'cash',$2,'')",
      [token, opts.categories.Alimente],
    );
    await as(a);
    await db.query("delete from public.shortcut_devices where id=$1", [device]);
    await as();
    await assert.rejects(
      income("revoked-request", opts.income_categories.Salariu),
      /neautorizat/,
    );
  } finally {
    await db.close();
  }
});
