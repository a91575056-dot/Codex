import { test } from "node:test";
import assert from "node:assert/strict";
import {
  goalSchema,
  contributionSchema,
  goalProgress,
  completedMonths,
  compareScenario,
  readScenarioSnapshot,
} from "../../src/lib/goals";
import {
  demoGoals,
  demoContributions,
  demoScenarios,
} from "../../src/lib/demo-goals";
test("goal progress counts only its own dated contributions, handles overfunding and deadlines", () => {
  const g = demoGoals[0];
  assert.equal(goalProgress(g, demoContributions, "2026-11-11").saved, 550000);
  assert.equal(goalProgress(g, demoContributions, "2026-08-11").saved, 100000);
  assert.equal(goalProgress(g, demoContributions, "2026-11-11").percent, 55);
  assert.equal(
    goalProgress(
      { ...g, due_on: "2026-01-01" },
      demoContributions,
      "2026-11-11",
    ).requiredMonthly,
    null,
  );
  assert.equal(
    goalProgress({ ...g, target_minor: 100 }, demoContributions, "2026-11-11")
      .remaining,
    0,
  );
  assert.equal(
    goalProgress({ ...g, target_minor: 100 }, demoContributions, "2026-11-11")
      .percent,
    100,
  );
  assert.equal(goalProgress(g, [], "2026-11-11").saved, 0);
  assert.equal(
    goalProgress(
      g,
      [{ ...demoContributions[0], goal_id: "other" }],
      "2026-11-11",
    ).saved,
    0,
  );
});
test("plan comparison preserves original target and counts clamped monthly anniversaries", () => {
  assert.equal(completedMonths("2024-01-31", "2024-02-28"), 0);
  assert.equal(completedMonths("2024-01-31", "2024-02-29"), 1);
  assert.equal(completedMonths("2025-01-31", "2025-02-28"), 1);
  assert.equal(completedMonths("2026-08-11", "2026-11-10"), 2);
  assert.equal(completedMonths("2026-08-11", "2026-11-11"), 3);
  assert.equal(completedMonths("2026-08-11", "2026-08-01"), 0);
  const c = compareScenario(demoScenarios[0], 550000, "2026-11-11");
  assert.equal(c.expected, 595000);
  assert.equal(c.delta, -45000);
  assert.equal(
    compareScenario(demoScenarios[0], 2000000, "2029-01-01").expected,
    1000000,
  );
  assert.equal(
    compareScenario(demoScenarios[0], 2000000, "2029-01-01").actual,
    1000000,
  );
});
test("goal and contribution validation reject invalid dates, zero and precision loss", () => {
  const valid = { name: "Fond", target: "10000,25", due_on: "2027-01-01" };
  assert.equal(goalSchema.parse(valid).target, 1000025);
  for (const target of ["0", "-1", "1.234", "1e6"])
    assert.equal(goalSchema.safeParse({ ...valid, target }).success, false);
  assert.equal(
    goalSchema.safeParse({ ...valid, due_on: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    contributionSchema.safeParse({
      goal_id: demoGoals[0].id,
      amount: "100",
      occurred_on: "2100-01-01",
    }).success,
    false,
  );
});

test("snapshot reader accepts the committed demo and rejects malformed JSON structures", () => {
  assert.equal(readScenarioSnapshot(demoScenarios[0].snapshot)?.version, 1);
  for (const value of [null, {}, { version: 1, inputs: {}, baseline: {} }])
    assert.equal(readScenarioSnapshot(value), null);
});
