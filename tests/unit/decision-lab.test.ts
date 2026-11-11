import { test } from "node:test";
import assert from "node:assert/strict";
import {
  simulateDecision,
  decisionBaseline,
  demoDecisionBaseline as base,
} from "../../src/lib/decision-lab";
const input = {
  targetMinor: 1000000,
  savedMinor: 100000,
  bufferMinor: 20000,
  shockPercent: 20,
  cuts: { fun: 50 },
};
test("counterfactual goal and income stress are exact and category attribution removes one cut", () => {
  const r = simulateDecision(base, input);
  assert.equal(r.baselineMonthly, 120000);
  assert.equal(r.savingsMinor, 45000);
  assert.equal(r.planMonthly, 165000);
  assert.equal(r.stressedMonthly, 25000);
  assert.equal(r.baselineMonths, 8);
  assert.equal(r.planMonths, 6);
  assert.equal(r.stressMonths, 36);
  assert.equal(r.monthsGained, 2);
  assert.equal(r.contributions.find((c) => c.id === "fun")?.monthsWithout, 8);
});
test("unreachable goals, completed goals, deficit and invalid inputs do not produce fake durations", () => {
  assert.equal(
    simulateDecision(base, { ...input, shockPercent: 100 }).stressMonths,
    null,
  );
  assert.equal(
    simulateDecision(base, { ...input, savedMinor: 1000000 }).planMonths,
    0,
  );
  assert.equal(
    simulateDecision(base, { ...input, bufferMinor: 900000 }).planMonths,
    null,
  );
  for (const targetMinor of [NaN, -1, 0, Infinity, 1.5])
    assert.throws(() => simulateDecision(base, { ...input, targetMinor }));
  assert.throws(() => simulateDecision(base, { ...input, cuts: { fun: 101 } }));
  assert.throws(() => simulateDecision(base, { ...input, shockPercent: -1 }));
  assert.equal(simulateDecision(base, { ...input, cuts: {} }).monthsGained, 0);
});
test("baseline uses three completed months with zeros; excludes current month and future entries", () => {
  const b = decisionBaseline(
    [
      {
        id: "1",
        name: "a",
        category: "Alimente",
        date: "2026-08-01",
        amount: -100,
      },
      {
        id: "2",
        name: "b",
        category: "Venit",
        date: "2026-10-31",
        amount: 600,
      },
      {
        id: "3",
        name: "c",
        category: "Venit",
        date: "2026-11-01",
        amount: 9999,
      },
    ],
    false,
    new Date("2026-11-11T12:00:00Z"),
  );
  assert.equal(b.incomeMinor, 20000);
  assert.equal(b.expensesMinor, 3333);
  assert.equal(b.transactionCount, 2);
  assert.equal(b.monthsWithRecords, 2);
  assert.equal(b.demo, false);
  assert.equal(b.period, "2026-08 — 2026-10");
  assert.equal(
    simulateDecision(
      {
        ...b,
        categories: [{ id: "__proto__", name: "__proto__", monthlyMinor: 100 }],
      },
      { ...input, cuts: {} },
    ).savingsMinor,
    0,
  );
  const empty = decisionBaseline([], false, new Date("2026-01-15T12:00:00Z"));
  assert.equal(empty.period, "2025-10 — 2025-12");
  assert.equal(empty.incomeMinor, 0);
  assert.equal(simulateDecision(empty, input).planMonths, null);
});

test("marginal impact recalculates the expense cap after category rounding", () => {
  const b = {
    ...base,
    incomeMinor: 10,
    expensesMinor: 1,
    categories: [
      { id: "a", name: "A", monthlyMinor: 1 },
      { id: "b", name: "B", monthlyMinor: 1 },
    ],
  };
  const r = simulateDecision(b, {
    targetMinor: 100,
    savedMinor: 0,
    bufferMinor: 0,
    shockPercent: 0,
    cuts: { a: 100, b: 100 },
  });
  assert.equal(r.savingsMinor, 1);
  assert.equal(r.planMonths, 10);
  assert.equal(r.contributions[0].monthsWithout, 10);
});
