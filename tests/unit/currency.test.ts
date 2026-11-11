import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { money } from "../../src/lib/finance";
import { goalSchema, goalProgress, type Goal } from "../../src/lib/goals";

test("MDL is the default; EUR savings retain euro cents and currency labels", () => {
  assert.match(money(12.34), /12,34\s+MDL/);
  assert.match(money(12.34, "EUR"), /12,34\s+EUR/);
  const input = { name: "Vacanță", target: "1234,56", due_on: "2027-01-01" };
  assert.equal(goalSchema.parse(input).currency, "MDL");
  const parsed = goalSchema.parse({ ...input, currency: "EUR" });
  assert.equal(parsed.target, 123456);
  assert.equal(parsed.currency, "EUR");
  assert.equal(
    goalSchema.safeParse({ ...input, currency: "USD" }).success,
    false,
  );
  const goal: Goal = {
    id: "euro",
    user_id: "a",
    name: "Vacanță",
    target_minor: parsed.target,
    currency: "EUR",
    due_on: input.due_on,
    created_at: "",
  };
  assert.equal(
    goalProgress(
      goal,
      [
        {
          id: "1",
          user_id: "a",
          goal_id: "euro",
          amount_minor: 23456,
          occurred_on: "2026-01-01",
          note: "",
          created_at: "",
        },
      ],
      "2026-11-11",
    ).remaining,
    100000,
  );
});

test("currency migration preserves numeric amounts, restricts currencies and prevents EUR/MDL scenario mixing under RLS", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema public,auth to anon,authenticated;`,
    );
    const files = (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files.filter((f) => !f.includes("mdl_and_euro")))
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
    await db.query(
      "update public.accounts set opening_balance_minor=12345 where user_id=$1",
      [a],
    );
    const old = (
      await db.query<{ id: string }>(
        "insert into public.savings_goals(user_id,name,target_minor,due_on) values($1,'Istoric',50000,'2027-01-01') returning id",
        [a],
      )
    ).rows[0].id;
    await db.exec(
      await readFile(
        `supabase/migrations/${files.find((f) => f.includes("mdl_and_euro"))}`,
        "utf8",
      ),
    );
    assert.deepEqual(
      (
        await db.query(
          "select currency, opening_balance_minor from public.accounts where user_id=$1",
          [a],
        )
      ).rows[0],
      { currency: "MDL", opening_balance_minor: 12345 },
    );
    assert.deepEqual(
      (
        await db.query(
          "select currency,target_minor from public.savings_goals where id=$1",
          [old],
        )
      ).rows[0],
      { currency: "MDL", target_minor: 50000 },
    );
    const as = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    await as(a);
    const euro = (
      await db.query<{ id: string }>(
        "insert into public.savings_goals(user_id,name,target_minor,due_on,currency) values($1,'Euro',200000,'2027-01-01','EUR') returning id",
        [a],
      )
    ).rows[0].id;
    await db.query(
      "insert into public.goal_contributions(user_id,goal_id,amount_minor,occurred_on) values($1,$2,12345,'2026-01-01')",
      [a, euro],
    );
    await assert.rejects(
      db.query("update public.savings_goals set currency='MDL' where id=$1", [
        euro,
      ]),
      /Moneda/,
    );
    await assert.rejects(
      db.query(
        "insert into public.savings_goals(user_id,name,target_minor,due_on,currency) values($1,'USD',100,'2027-01-01','USD')",
        [a],
      ),
      /check constraint/,
    );
    const scenario =
      "insert into public.goal_scenarios(user_id,goal_id,name,target_minor,saved_minor,monthly_minor,snapshot) values($1,$2,'Plan',100,0,1,'{\"version\":1}')";
    await assert.rejects(db.query(scenario, [a, euro]), /MDL/);
    await db.query(scenario, [a, old]);
    await as(b);
    assert.equal(
      (await db.query("select * from public.savings_goals")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.goal_contributions")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into public.goal_contributions(user_id,goal_id,amount_minor,occurred_on) values($1,$2,100,'2026-01-01')",
        [b, euro],
      ),
      /foreign key/,
    );
    await assert.rejects(db.query(scenario, [b, old]), /MDL/);
  } finally {
    await db.close();
  }
});
