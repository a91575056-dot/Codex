import type { Goal, Contribution, Scenario } from "./goals";
import { demoDecisionBaseline } from "./decision-lab";
export const demoGoals: Goal[] = [
  {
    id: "00000000-0000-4000-8000-000000000010",
    user_id: "demo",
    name: "Fond de urgență · DEMO",
    target_minor: 1000000,
    due_on: "2027-05-31",
    currency: "MDL",
    created_at: "2026-08-11T12:00:00Z",
  },
];
export const demoContributions: Contribution[] = [
  {
    id: "demo-1",
    user_id: "demo",
    goal_id: demoGoals[0].id,
    amount_minor: 100000,
    occurred_on: "2026-08-11",
    note: "Economii inițiale fictive",
    created_at: "2026-08-11T12:00:00Z",
  },
  {
    id: "demo-2",
    user_id: "demo",
    goal_id: demoGoals[0].id,
    amount_minor: 450000,
    occurred_on: "2026-11-10",
    note: "Contribuție fictivă acumulată",
    created_at: "2026-11-10T12:00:00Z",
  },
];
export const demoScenarios: Scenario[] = [
  {
    id: "demo-plan",
    goal_id: demoGoals[0].id,
    user_id: "demo",
    name: "Mai puține ieșiri · DEMO",
    target_minor: 1000000,
    saved_minor: 100000,
    monthly_minor: 165000,
    saved_on: "2026-08-11",
    created_at: "2026-08-11T12:00:00Z",
    snapshot: {
      version: 1,
      goalName: demoGoals[0].name,
      dueOn: "2027-05-31",
      planMonths: 6,
      baseline: { ...demoDecisionBaseline, period: "Mai — Iul 2026" },
      inputs: {
        targetMinor: 1000000,
        savedMinor: 100000,
        bufferMinor: 20000,
        shockPercent: 20,
        cuts: { fun: 50 },
      },
    },
  },
];
