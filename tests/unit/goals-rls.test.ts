import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("savings migration isolates two users, preserves snapshots and cascades owned deletions", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;`,
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261111074234_savings_goals.sql",
        "utf8",
      ),
    );
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
    async function as(id: string) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    }
    const insertGoal =
      "insert into public.savings_goals(user_id,name,target_minor,due_on) values($1,'Test',10000,'2027-01-01') returning id";
    await as(a);
    const g = (await db.query<{ id: string }>(insertGoal, [a])).rows[0].id;
    await db.query(
      "insert into public.goal_contributions(user_id,goal_id,amount_minor,occurred_on) values($1,$2,1000,'2026-01-01')",
      [a, g],
    );
    const insertScenario =
      "insert into public.goal_scenarios(user_id,goal_id,name,target_minor,saved_minor,monthly_minor,snapshot) values($1,$2,'Plan',10000,1000,1000,'{\"version\":1}') returning id";
    const s = (await db.query<{ id: string }>(insertScenario, [a, g])).rows[0]
      .id;
    await assert.rejects(
      db.query(
        "update public.goal_scenarios set monthly_minor=10 where id=$1",
        [s],
      ),
      /permission denied/,
    );
    await db.query(
      "update public.savings_goals set target_minor=20000 where id=$1",
      [g],
    );
    assert.equal(
      (
        await db.query<{ target_minor: number }>(
          "select target_minor from public.goal_scenarios where id=$1",
          [s],
        )
      ).rows[0].target_minor,
      10000,
    );
    await assert.rejects(
      db.query(
        "insert into public.goal_contributions(user_id,goal_id,amount_minor,occurred_on) values($1,$2,0,'2026-01-01')",
        [a, g],
      ),
      /check constraint/,
    );
    await assert.rejects(
      db.query(
        "insert into public.goal_scenarios(user_id,goal_id,name,target_minor,saved_minor,monthly_minor,snapshot) values($1,$2,'Bad',100,0,1,'{}')",
        [a, g],
      ),
      /check constraint/,
    );
    await as(b);
    const gb = (await db.query<{ id: string }>(insertGoal, [b])).rows[0].id;
    assert.equal(
      (await db.query("select * from public.savings_goals")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.goal_contributions")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.goal_scenarios")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into public.goal_contributions(user_id,goal_id,amount_minor,occurred_on) values($1,$2,1000,'2026-01-01')",
        [b, g],
      ),
      /foreign key/,
    );
    await assert.rejects(db.query(insertScenario, [b, g]), /foreign key/);
    await assert.rejects(
      db.query("update public.savings_goals set user_id=$1 where id=$2", [
        a,
        gb,
      ]),
      /row-level security/,
    );
    assert.equal(
      (
        await db.query(
          "delete from public.savings_goals where id=$1 returning id",
          [g],
        )
      ).rows.length,
      0,
    );
    await as(a);
    await db.query("delete from public.savings_goals where id=$1", [g]);
    assert.equal(
      (await db.query("select * from public.goal_contributions")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.goal_scenarios")).rows.length,
      0,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select * from public.savings_goals"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
