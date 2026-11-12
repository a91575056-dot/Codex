import { z } from "zod";
import { transactionSchema } from "./transaction-validation";
import { safeTotal } from "./planning";
import { todayISO } from "./goals";
export type Loan = {
  id: string;
  user_id: string;
  direction: "lent" | "borrowed";
  account_id: string;
  currency: "MDL" | "EUR";
  person: string;
  amount_minor: number;
  payment_method: "unspecified" | "cash" | "card";
  note: string;
  occurred_on: string;
  settled_on: string | null;
  settled_account_id: string | null;
  created_at: string;
};
export const loanSchema = z.object({
  id: z.uuid(),
  account_id: z.uuid("Alege contul."),
  direction: z.enum(["lent", "borrowed"]),
  person: z.string().trim().min(1, "Scrie numele persoanei.").max(100),
  amount: transactionSchema.shape.amount,
  occurred_on: transactionSchema.shape.occurred_on.refine(
    (v) => v <= todayISO(),
    "Data nu poate fi în viitor.",
  ),
  note: z.string().trim().max(160).default(""),
});
export function loanAccountDelta(
  rows: Loan[],
  accountId: string,
  today = todayISO(),
) {
  return safeTotal(
    rows.flatMap((l) => {
      const sign = l.direction === "borrowed" ? 1 : -1;
      return [
        l.account_id === accountId && l.occurred_on <= today
          ? sign * l.amount_minor
          : 0,
        l.settled_account_id === accountId &&
        l.settled_on &&
        l.settled_on <= today
          ? -sign * l.amount_minor
          : 0,
      ];
    }),
  );
}
export function loanTotals(rows: Loan[], currency: "MDL" | "EUR") {
  const active = rows.filter((l) => l.currency === currency && !l.settled_on);
  return {
    receivable: safeTotal(
      active.filter((l) => l.direction === "lent").map((l) => l.amount_minor),
    ),
    payable: safeTotal(
      active
        .filter((l) => l.direction === "borrowed")
        .map((l) => l.amount_minor),
    ),
  };
}
export const loanLabels = { lent: "Împrumut dat", borrowed: "Împrumut primit" };

export function loanActivity(
  rows: Loan[],
  accounts: { id: string; name: string }[],
) {
  const names = new Map(accounts.map((a) => [a.id, a.name]));
  return rows.flatMap((l) => {
    const amount =
      ((l.direction === "borrowed" ? 1 : -1) * l.amount_minor) / 100;
    const funding = {
      id: l.id + ":funding",
      name: `${loanLabels[l.direction]} · ${l.person}`,
      category: loanLabels[l.direction],
      date: l.occurred_on,
      amount,
      currency: l.currency,
      account: names.get(l.account_id),
      paymentMethod: l.payment_method,
    };
    return l.settled_on
      ? [
          funding,
          {
            ...funding,
            id: l.id + ":repayment",
            name: `Rambursare împrumut · ${l.person}`,
            category: "Rambursare împrumut",
            date: l.settled_on,
            amount: -amount,
            account: names.get(l.settled_account_id || ""),
            paymentMethod: "unspecified" as const,
          },
        ]
      : [funding];
  });
}
