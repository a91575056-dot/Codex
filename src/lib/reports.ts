import { z } from "zod";
import type { TransactionRow, CategoryRow } from "./supabase/database.types";
import { safeTotal, categoryTotals } from "./planning";
export const reportRangeSchema = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .refine(
    (r) => r.from <= r.to,
    "Data de început trebuie să fie înaintea datei de sfârșit.",
  );
export function financialReport(
  rows: TransactionRow[],
  categories: CategoryRow[],
  from: string,
  to: string,
) {
  const parsed = reportRangeSchema.parse({ from, to });
  const filtered = rows.filter(
    (t) => t.occurred_on >= parsed.from && t.occurred_on <= parsed.to,
  );
  const income = safeTotal(
    filtered.filter((t) => t.kind === "income").map((t) => t.amount_minor),
  );
  const expenses = safeTotal(
    filtered.filter((t) => t.kind === "expense").map((t) => t.amount_minor),
  );
  return {
    rows: filtered,
    income,
    expenses,
    net: income - expenses,
    rate:
      income > 0
        ? Math.round(((income - expenses) / income) * 10000) / 100
        : null,
    categories: categoryTotals(filtered, categories),
  };
}
