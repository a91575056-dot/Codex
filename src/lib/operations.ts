import { z } from "zod";
import { transactionSchema } from "./transaction-validation";
import { safeTotal } from "./planning";
import { todayISO } from "./goals";
import type { AccountRow, TransactionRow } from "./supabase/database.types";
export type Transfer = {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount_minor: number;
  description: string;
  occurred_on: string;
  created_at: string;
};
export type RecurringRule = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  kind: "income" | "expense";
  description: string;
  amount_minor: number;
  payment_method: "unspecified" | "cash" | "card";
  frequency: "weekly" | "monthly" | "yearly";
  start_on: string;
  next_due_on: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};
export type RecurringOccurrence = {
  id: string;
  user_id: string;
  rule_id: string;
  due_on: string;
  transaction_id: string;
  created_at: string;
};
const optionalId = z.union([z.uuid(), z.literal("")]).optional();
export const transferSchema = z
  .object({
    id: optionalId,
    request_id: z.uuid(),
    from_account_id: z.uuid("Alege contul sursă."),
    to_account_id: z.uuid("Alege contul destinație."),
    amount: transactionSchema.shape.amount,
    occurred_on: transactionSchema.shape.occurred_on,
    description: z.string().trim().max(160).default(""),
  })
  .refine(
    (x) => x.from_account_id !== x.to_account_id,
    "Alege două conturi diferite.",
  );
export const recurringSchema = z
  .object({
    id: optionalId,
    request_id: z.uuid(),
    account_id: z.uuid(),
    category_id: z.uuid(),
    kind: transactionSchema.shape.kind,
    description: transactionSchema.shape.description,
    amount: transactionSchema.shape.amount,
    payment_method: transactionSchema.shape.payment_method,
    frequency: z.enum(["weekly", "monthly", "yearly"]),
    start_on: transactionSchema.shape.occurred_on,
    next_due_on: transactionSchema.shape.occurred_on,
    active: z.enum(["true", "false"]).transform((v) => v === "true"),
  })
  .refine(
    (v) => v.next_due_on >= v.start_on,
    "Scadența următoare nu poate preceda începutul regulii.",
  );
export const occurrenceSchema = z.object({
  rule_id: z.uuid(),
  due_on: transactionSchema.shape.occurred_on,
  occurred_on: transactionSchema.shape.occurred_on.refine(
    (v) => v <= todayISO(),
    "Data încasării/plății nu poate fi în viitor.",
  ),
  updated_at: z.iso.datetime({ offset: true }),
  confirm: z.literal("yes", { error: "Confirmă înregistrarea scadenței." }),
});
export function accountBalance(
  account: AccountRow,
  transactions: TransactionRow[],
  transfers: Transfer[],
  today = todayISO(),
) {
  return safeTotal([
    account.opening_balance_minor,
    ...transactions
      .filter((t) => t.account_id === account.id && t.occurred_on <= today)
      .map((t) => (t.kind === "income" ? 1 : -1) * t.amount_minor),
    ...transfers
      .filter(
        (t) =>
          t.occurred_on <= today &&
          (t.from_account_id === account.id || t.to_account_id === account.id),
      )
      .map((t) => (t.to_account_id === account.id ? 1 : -1) * t.amount_minor),
  ]);
}
export const frequencyLabels = {
  weekly: "Săptămânal",
  monthly: "Lunar",
  yearly: "Anual",
};
