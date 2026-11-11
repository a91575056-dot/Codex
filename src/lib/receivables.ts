import { z } from "zod";
import { transactionSchema } from "./transaction-validation";
import { safeTotal } from "./planning";
import { todayISO } from "./goals";
export type Receivable = {
  id: string;
  user_id: string;
  person: string;
  amount_minor: number;
  currency: "MDL" | "EUR";
  note: string;
  occurred_on: string;
  settled_on: string | null;
  created_at: string;
};
export const receivableSchema = z.object({
  id: z.uuid(),
  person: z.string().trim().min(1, "Scrie numele persoanei.").max(100),
  amount: transactionSchema.shape.amount,
  currency: z.enum(["MDL", "EUR"]),
  note: z.string().trim().max(300).default(""),
  occurred_on: transactionSchema.shape.occurred_on.refine(
    (v) => v <= todayISO(),
    "Data datoriei nu poate fi în viitor.",
  ),
});
export function receivableTotals(rows: Receivable[]) {
  return Object.fromEntries(
    (["MDL", "EUR"] as const).map((currency) => [
      currency,
      safeTotal(
        rows
          .filter((r) => r.currency === currency && !r.settled_on)
          .map((r) => r.amount_minor),
      ),
    ]),
  ) as Record<"MDL" | "EUR", number>;
}
