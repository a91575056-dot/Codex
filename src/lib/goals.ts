import { z } from "zod";
import type { DecisionBaseline, DecisionInputs } from "./decision-lab";
export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_minor: number;
  due_on: string;
  currency: "RON";
  created_at: string;
};
export type Contribution = {
  id: string;
  user_id: string;
  goal_id: string;
  amount_minor: number;
  occurred_on: string;
  note: string;
  created_at: string;
};
export type ScenarioSnapshot = {
  version: 1;
  baseline: DecisionBaseline;
  inputs: DecisionInputs;
  goalName: string;
  dueOn: string;
  planMonths: number | null;
};
export type Scenario = {
  id: string;
  user_id: string;
  goal_id: string;
  name: string;
  target_minor: number;
  saved_minor: number;
  monthly_minor: number;
  saved_on: string;
  snapshot: ScenarioSnapshot;
  created_at: string;
};
export const todayISO = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Chisinau",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
const amount = z
  .string()
  .trim()
  .regex(/^\d{1,10}([.,]\d{1,2})?$/, "Introdu o sumă cu maximum două zecimale.")
  .transform((v) => {
    const [w, f = ""] = v.replace(",", ".").split(".");
    return Number(w) * 100 + Number(f.padEnd(2, "0"));
  })
  .pipe(
    z.number().int().min(1, "Suma trebuie să fie pozitivă.").max(1000000000000),
  );
export const goalSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]).optional(),
  name: z.string().trim().min(1, "Numele este obligatoriu.").max(100),
  target: amount,
  due_on: z.iso
    .date("Alege o dată validă.")
    .refine(
      (v) => v >= "1900-01-01" && v <= "2100-12-31",
      "Dată în afara intervalului permis.",
    ),
});
export const contributionSchema = z.object({
  goal_id: z.uuid(),
  amount,
  occurred_on: z.iso
    .date()
    .refine(
      (v) => v >= "1900-01-01" && v <= todayISO(),
      "Contribuția trebuie să fie din trecut sau de astăzi.",
    ),
  note: z.string().trim().max(160).default(""),
});
export const scenarioSchema = z.object({
  goal_id: z.uuid(),
  name: z.string().trim().min(1, "Denumește scenariul.").max(100),
  buffer_minor: z.number().int().min(0).max(1000000000000),
  shock_percent: z.number().min(0).max(100),
  cuts: z.record(z.string().max(100), z.number().min(0).max(100)),
});
export function goalProgress(
  goal: Goal,
  entries: Contribution[],
  today = todayISO(),
) {
  const total = entries
    .filter((c) => c.goal_id === goal.id && c.occurred_on <= today)
    .reduce((sum, c) => sum + BigInt(c.amount_minor), BigInt(0));
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw Error("Contribuțiile depășesc limita de precizie.");
  const saved = Number(total),
    remaining = Math.max(0, goal.target_minor - saved);
  const [y, m] = today.split("-").map(Number),
    [dy, dm] = goal.due_on.split("-").map(Number);
  const slots = Math.max(1, (dy - y) * 12 + dm - m + 1);
  return {
    saved,
    remaining,
    percent: Math.min(100, Math.floor((saved / goal.target_minor) * 100)),
    overdue: remaining > 0 && goal.due_on < today,
    requiredMonthly:
      remaining === 0
        ? 0
        : goal.due_on < today
          ? null
          : Math.ceil(remaining / slots),
  };
}
export function completedMonths(start: string, end: string) {
  if (end < start) return 0;
  const [sy, sm, sd] = start.split("-").map(Number),
    [ey, em, ed] = end.split("-").map(Number);
  let n = (ey - sy) * 12 + em - sm;
  const anniversary = Math.min(sd, new Date(Date.UTC(ey, em, 0)).getUTCDate());
  if (ed < anniversary) n--;
  return Math.max(0, n);
}
export function compareScenario(
  s: Scenario,
  actualSaved: number,
  today = todayISO(),
) {
  const months = completedMonths(s.saved_on, today);
  const sum = BigInt(s.saved_minor) + BigInt(s.monthly_minor) * BigInt(months);
  const expected = Number(
    sum > BigInt(s.target_minor) ? BigInt(s.target_minor) : sum,
  );
  // Compare against the original goal; overfunding the current goal does not distort the comparison.
  const actual = Math.min(actualSaved, s.target_minor);
  return {
    months,
    expected,
    actual,
    delta: actual - expected,
  };
}

const safeMinor = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const snapshotSchema = z.object({
  version: z.literal(1),
  goalName: z.string().max(100),
  dueOn: z.iso.date(),
  planMonths: z.number().int().nonnegative().nullable(),
  baseline: z.object({
    period: z.string().max(100),
    months: z.literal(3),
    monthsWithRecords: z.number().int().min(0).max(3),
    transactionCount: z.number().int().nonnegative(),
    incomeMinor: safeMinor,
    expensesMinor: safeMinor,
    demo: z.boolean(),
    categories: z.array(
      z.object({
        id: z.string().max(100),
        name: z.string().max(100),
        monthlyMinor: safeMinor,
      }),
    ),
  }),
  inputs: z.object({
    targetMinor: safeMinor.positive(),
    savedMinor: safeMinor,
    bufferMinor: safeMinor,
    shockPercent: z.number().min(0).max(100),
    cuts: z.record(z.string().max(100), z.number().min(0).max(100)),
  }),
});
export function readScenarioSnapshot(value: unknown): ScenarioSnapshot | null {
  const p = snapshotSchema.safeParse(value);
  return p.success ? p.data : null;
}
