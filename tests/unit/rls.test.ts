import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("migration: two users, owner CRUD, RLS isolation and composite ownership constraints", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
    );
    await db.exec(
      await readFile("supabase/migrations/202611110001_finance.sql", "utf8"),
    );
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
    const accounts = await db.query<{ id: string; user_id: string }>(
      "select id,user_id from public.accounts",
    );
    const categories = await db.query<{
      id: string;
      user_id: string;
      kind: string;
    }>("select id,user_id,kind from public.categories");
    const aa = accounts.rows.find((x) => x.user_id === a)!.id,
      ba = accounts.rows.find((x) => x.user_id === b)!.id,
      ac = categories.rows.find(
        (x) => x.user_id === a && x.kind === "expense",
      )!.id,
      bc = categories.rows.find(
        (x) => x.user_id === b && x.kind === "expense",
      )!.id;
    async function asUser(id: string) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    }
    await asUser(a);
    assert.equal(
      (await db.query("select * from public.accounts")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.transactions")).rows.length,
      0,
    );
    const insert = `insert into public.transactions(user_id,account_id,category_id,kind,description,amount_minor,occurred_on) values($1,$2,$3,'expense','Test',1234,'2026-11-11') returning id`;
    const own = await db.query<{ id: string }>(insert, [a, aa, ac]);
    const id = own.rows[0].id;
    assert.equal(
      (
        await db.query(
          "update public.transactions set amount_minor=2900 where id=$1 returning id",
          [id],
        )
      ).rows.length,
      1,
    );
    await assert.rejects(db.query(insert, [b, ba, bc]), /row-level security/);
    await assert.rejects(db.query(insert, [a, ba, ac]), /foreign key/);
    await assert.rejects(db.query(insert, [a, aa, bc]), /foreign key/);
    await assert.rejects(
      db.query("update public.transactions set kind='income' where id=$1", [
        id,
      ]),
      /foreign key/,
    );
    await assert.rejects(
      db.query("update public.transactions set user_id=$1 where id=$2", [
        b,
        id,
      ]),
    );
    await asUser(b);
    assert.equal(
      (await db.query("select * from public.transactions")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.transactions set amount_minor=1 where id=$1 returning id",
          [id],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "delete from public.transactions where id=$1 returning id",
          [id],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query("update public.accounts set user_id=$1 where id=$2", [a, ba]),
      /row-level security/,
    );
    await asUser(a);
    assert.equal(
      (
        await db.query(
          "delete from public.transactions where id=$1 returning id",
          [id],
        )
      ).rows.length,
      1,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select * from public.transactions"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
