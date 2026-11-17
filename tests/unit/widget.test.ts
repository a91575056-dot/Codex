import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { widgetSnapshot, widgetToken } from "../../src/lib/widget";
import {
  envelopeBalances,
  type EnvelopeSnapshot,
} from "../../src/lib/envelopes";
import type {
  AccountRow,
  TransactionRow,
  CategoryRow,
} from "../../src/lib/supabase/database.types";
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002";
const token = "ft_wg_" + "d".repeat(64);
test("widget percent means budget remaining, preserves overspending and never fabricates unfunded percentages", () => {
  const raw = {
    currency: "MDL",
    source: "allocations",
    as_of: "2026-11-17",
    updated_at: "2026-11-17T10:00:00Z",
    budgets: [
      {
        id: a,
        name: "Alimente",
        limit_minor: 10000,
        spent_minor: 2500,
        enabled: true,
      },
      {
        id: b,
        name: "Distracții",
        limit_minor: 10000,
        spent_minor: 12500,
        enabled: true,
      },
    ],
  };
  assert.equal(widgetSnapshot(raw).budgets[0].remaining_percent, 75);
  assert.equal(widgetSnapshot(raw).budgets[1].remaining_percent, -25);
  assert.equal(
    widgetSnapshot({ ...raw, budgets: [{ ...raw.budgets[0], limit_minor: 0 }] })
      .budgets[0].remaining_percent,
    null,
  );
  assert.equal(
    widgetToken(
      new Request("https://test.invalid", {
        headers: { Authorization: "Bearer " + token },
      }),
    ),
    token,
  );
  assert.equal(
    widgetToken(new Request("https://test.invalid?token=" + token)),
    null,
  );
  assert.equal(
    widgetToken(
      new Request("https://test.invalid", {
        headers: { Authorization: "Bearer ft_sc_" + "d".repeat(64) },
      }),
    ),
    null,
  );
});
test("widget SQL is owner-isolated, readonly, expiring and revocable; snapshots match finance allocation calculations", async () => {
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
    const account = (
      await db.query<AccountRow>("select * from public.accounts")
    ).rows[0];
    const expense = (
      await db.query<CategoryRow>(
        "select * from public.categories where kind='expense' order by name limit 1",
      )
    ).rows[0];
    const income = (
      await db.query<CategoryRow>(
        "select * from public.categories where kind='income' limit 1",
      )
    ).rows[0];
    const device = (
      await db.query<{ id: string }>(
        "insert into public.widget_devices(user_id,name,token_hash) values($1,'Widget test',$2) returning id",
        [a, createHash("sha256").update(token).digest("hex")],
      )
    ).rows[0].id;
    await db.query(
      "insert into public.budgets(user_id,category_id,month_start,limit_minor) values($1,$2,date_trunc('month',now() at time zone 'Europe/Chisinau')::date,10000)",
      [a, expense.id],
    );
    const tx = async (
      kind: string,
      category: string,
      amount: number,
      accountId = account.id,
    ) =>
      db.query(
        "insert into public.transactions(user_id,account_id,category_id,kind,description,amount_minor,occurred_on) values($1,$2,$3,$4,'Widget QA',$5,(now() at time zone 'Europe/Chisinau')::date)",
        [a, accountId, category, kind, amount],
      );
    await tx("expense", expense.id, 2500);
    const snapshot = () =>
      db.query<{ v: unknown }>("select public.widget_budget_snapshot($1) v", [
        token,
      ]);
    await as();
    let snap = widgetSnapshot((await snapshot()).rows[0].v);
    assert.equal(snap.source, "monthly");
    assert.equal(snap.budgets[0].remaining_minor, 7500);
    assert.equal(snap.budgets[0].remaining_percent, 75);
    await assert.rejects(
      db.query("select * from public.widget_devices"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.shortcut_options($1)", [token]),
      /neautorizat/,
    );
    await as(b);
    await assert.rejects(snapshot(), /neautorizat/);
    assert.equal(
      (await db.query("select * from public.widget_devices")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "delete from public.widget_devices where id=$1 returning id",
          [device],
        )
      ).rows.length,
      0,
    );
    await as(a);
    await db.query("select public.start_envelopes('MDL')");
    await tx("income", income.id, 10001);
    await tx("expense", expense.id, 999);
    const euro = (
      await db.query<{ id: string }>(
        "insert into public.accounts(user_id,name,currency) values($1,'Euro','EUR') returning id",
        [a],
      )
    ).rows[0].id;
    await tx("income", income.id, 999999, euro);
    await tx("expense", expense.id, 88888, euro);
    // Match PostgREST's JSON serialization (PGlite otherwise returns Date objects).
    const rows = async <T>(table: string) =>
      (
        await db.query<{ v: T }>(`select to_jsonb(x) v from public.${table} x`)
      ).rows.map((r) => r.v);
    const expected = envelopeBalances(
      {
        plans: await rows<EnvelopeSnapshot["plans"][number]>("envelope_plans"),
        rules: await rows<EnvelopeSnapshot["rules"][number]>("envelope_rules"),
        funding:
          await rows<EnvelopeSnapshot["funding"][number]>("envelope_funding"),
      },
      await rows<AccountRow>("accounts"),
      await rows<CategoryRow>("categories"),
      await rows<TransactionRow>("transactions"),
    );
    await as();
    snap = widgetSnapshot((await snapshot()).rows[0].v);
    assert.equal(snap.source, "allocations");
    for (const row of snap.budgets) {
      const e = expected.find((e) => e.id === row.id)!;
      assert.equal(row.limit_minor, e.funded);
      assert.equal(row.spent_minor, e.spent);
      assert.equal(row.remaining_minor, e.available);
    }
    assert.ok(!JSON.stringify(snap).includes("Widget QA"));
    await as(a);
    await assert.rejects(
      db.query(
        "update public.widget_devices set expires_at=now()+interval '1 year' where id=$1",
        [device],
      ),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query(
      "update public.widget_devices set rate_count=20,rate_window_at=now() where id=$1",
      [device],
    );
    await as();
    await assert.rejects(snapshot(), /Prea multe/);
    await db.exec("reset role");
    await db.query(
      "update public.widget_devices set rate_count=0,expires_at=now()-interval '1 minute' where id=$1",
      [device],
    );
    await as();
    await assert.rejects(snapshot(), /neautorizat/);
    await as(a);
    await db.query("delete from public.widget_devices where id=$1", [device]);
    await as();
    await assert.rejects(snapshot(), /neautorizat/);
  } finally {
    await db.close();
  }
});
