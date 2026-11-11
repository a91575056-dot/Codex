import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("budget and portfolio migration enforces owner CRUD, expense-only categories and referential safety", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;`,
    );
    await db.exec(
      await readFile("supabase/migrations/202611110001_finance.sql", "utf8"),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261111081108_budgets_and_portfolio.sql",
        "utf8",
      ),
    );
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
    const cats = await db.query<{ id: string; user_id: string; kind: string }>(
      "select id,user_id,kind from public.categories",
    );
    const ac = cats.rows.find(
        (c) => c.user_id === a && c.kind === "expense",
      )!.id,
      ai = cats.rows.find((c) => c.user_id === a && c.kind === "income")!.id,
      bc = cats.rows.find((c) => c.user_id === b && c.kind === "expense")!.id;
    async function as(id: string) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    }
    const insert =
      "insert into public.budgets(user_id,category_id,month_start,limit_minor) values($1,$2,'2026-11-01',50000) returning id";
    await as(a);
    const id = (await db.query<{ id: string }>(insert, [a, ac])).rows[0].id;
    await assert.rejects(db.query(insert, [a, ac]), /unique constraint/);
    await assert.rejects(db.query(insert, [a, ai]), /foreign key/);
    await assert.rejects(db.query(insert, [a, bc]), /foreign key/);
    assert.equal(
      (
        await db.query(
          "update public.budgets set limit_minor=60000 where id=$1 returning id",
          [id],
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      db.query("delete from public.categories where id=$1", [ac]),
      /foreign key/,
    );
    await assert.rejects(
      db.query("update public.categories set kind='income' where id=$1", [ac]),
      /foreign key/,
    );
    const holding = (
      await db.query<{ id: string }>(
        "insert into public.holdings(user_id,name,asset_class,quantity_micros,cost_price_minor,current_price_minor,price_on) values($1,'ETF','etf',1000000,100,120,'2026-01-01') returning id",
        [a],
      )
    ).rows[0].id;
    await as(b);
    assert.equal(
      (await db.query("select * from public.budgets")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.holdings")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query("delete from public.budgets where id=$1 returning id", [
          id,
        ])
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.holdings set current_price_minor=1 where id=$1 returning id",
          [holding],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(db.query(insert, [b, ac]), /foreign key/);
    await as(a);
    await db.query("delete from public.budgets where id=$1", [id]);
    await db.query("delete from public.holdings where id=$1", [holding]);
    assert.equal(
      (await db.query("select * from public.budgets")).rows.length,
      0,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select * from public.holdings"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
