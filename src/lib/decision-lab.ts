import type { Transaction } from "@/types/finance";
export interface SpendingCategory {
  id: string;
  name: string;
  monthlyMinor: number;
}
export interface DecisionBaseline {
  period: string;
  months: number;
  monthsWithRecords: number;
  transactionCount: number;
  incomeMinor: number;
  expensesMinor: number;
  categories: SpendingCategory[];
  demo: boolean;
}
export interface DecisionInputs {
  targetMinor: number;
  savedMinor: number;
  bufferMinor: number;
  shockPercent: number;
  cuts: Record<string, number>;
}
export function decisionBaseline(
  rows: Transaction[],
  demo = false,
  now = new Date(),
): DecisionBaseline {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Chisinau",
    year: "numeric",
    month: "2-digit",
  }).format(now);
  const [y, m] = date.split("-").map(Number);
  const months = Array.from({ length: 3 }, (_, i) =>
    new Date(Date.UTC(y, m - 4 + i, 1)).toISOString().slice(0, 7),
  );
  const relevant = rows.filter((t) => months.includes(t.date.slice(0, 7)));
  let income = 0,
    expenses = 0;
  const categories = new Map<string, number>();
  for (const t of relevant) {
    const minor = Math.round(Math.abs(t.amount) * 100);
    if (!Number.isSafeInteger(minor))
      throw Error("Sumă în afara limitei de precizie.");
    if (t.amount > 0) income += minor;
    else {
      expenses += minor;
      categories.set(t.category, (categories.get(t.category) || 0) + minor);
    }
  }
  if (!Number.isSafeInteger(income) || !Number.isSafeInteger(expenses))
    throw Error("Istoricul depășește limita de precizie.");
  return {
    period: `${months[0]} — ${months[2]}`,
    months: 3,
    monthsWithRecords: new Set(relevant.map((t) => t.date.slice(0, 7))).size,
    transactionCount: relevant.length,
    incomeMinor: Math.round(income / 3),
    expensesMinor: Math.round(expenses / 3),
    categories: [...categories]
      .map(([name, total]) => ({
        id: name,
        name,
        monthlyMinor: Math.round(total / 3),
      }))
      .sort((a, b) => b.monthlyMinor - a.monthlyMinor),
    demo,
  };
}
export function simulateDecision(
  base: DecisionBaseline,
  input: DecisionInputs,
) {
  for (const [n, limit] of [
    [input.targetMinor, 1000000000000],
    [input.savedMinor, Number.MAX_SAFE_INTEGER],
    [input.bufferMinor, 1000000000000],
  ])
    if (!Number.isSafeInteger(n) || n < 0 || n > limit)
      throw Error("Sume invalide.");
  if (
    input.targetMinor <= 0 ||
    !Number.isFinite(input.shockPercent) ||
    input.shockPercent < 0 ||
    input.shockPercent > 100
  )
    throw Error("Obiectiv sau șoc invalid.");
  const contributions = base.categories.map((c) => {
    const percent = Object.hasOwn(input.cuts, c.id) ? input.cuts[c.id] : 0;
    if (!Number.isFinite(percent) || percent < 0 || percent > 100)
      throw Error("Reducere invalidă.");
    return {
      ...c,
      percent,
      savingMinor: Math.round((c.monthlyMinor * percent) / 100),
    };
  });
  // Cap at total expenses to absorb at most a few bani of category rounding.
  const requestedSavings = contributions.reduce((s, c) => s + c.savingMinor, 0);
  const savingsMinor = Math.min(base.expensesMinor, requestedSavings);
  const gap = Math.max(0, input.targetMinor - input.savedMinor);
  const baselineMonthly =
    base.incomeMinor - base.expensesMinor - input.bufferMinor;
  const planMonthly = baselineMonthly + savingsMinor;
  const shockLossMinor = Math.round(
    (base.incomeMinor * input.shockPercent) / 100,
  );
  const stressedMonthly = planMonthly - shockLossMinor;
  const duration = (monthly: number) =>
    gap === 0 ? 0 : monthly <= 0 ? null : Math.ceil(gap / monthly);
  const baselineMonths = duration(baselineMonthly),
    planMonths = duration(planMonthly),
    stressMonths = duration(stressedMonthly);
  return {
    gap,
    savingsMinor,
    baselineMonthly,
    planMonthly,
    stressedMonthly,
    shockLossMinor,
    baselineMonths,
    planMonths,
    stressMonths,
    monthsGained:
      baselineMonths !== null && planMonths !== null
        ? baselineMonths - planMonths
        : null,
    contributions: contributions.map((c) => ({
      ...c,
      monthsWithout: duration(
        baselineMonthly +
          Math.min(base.expensesMinor, requestedSavings - c.savingMinor),
      ),
    })),
  };
}
export const demoDecisionBaseline: DecisionBaseline = {
  period: "Aug — Oct 2026",
  months: 3,
  monthsWithRecords: 3,
  transactionCount: 42,
  incomeMinor: 700000,
  expensesMinor: 560000,
  demo: true,
  categories: [
    { id: "home", name: "Locuință", monthlyMinor: 250000 },
    { id: "food", name: "Alimente", monthlyMinor: 160000 },
    { id: "fun", name: "Timp liber", monthlyMinor: 90000 },
    { id: "transport", name: "Transport", monthlyMinor: 60000 },
  ],
};
