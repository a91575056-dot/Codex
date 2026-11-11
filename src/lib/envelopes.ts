import { z } from "zod";
import { safeTotal } from "./planning";
import { todayISO } from "./goals";
import type {
  AccountRow,
  CategoryRow,
  TransactionRow,
} from "./supabase/database.types";
export type EnvelopePlan = {
  id: string;
  user_id: string;
  currency: "MDL" | "EUR";
  enabled: boolean;
  start_on: string;
  created_at: string;
};
export type EnvelopeRule = {
  id: string;
  user_id: string;
  plan_id: string;
  category_id: string;
  category_kind: "expense";
  envelope_kind: "spending" | "investment" | "emergency";
  basis_points: number;
  sort_order: number;
  is_fallback: boolean;
};
export type EnvelopeFunding = {
  transaction_id: string;
  rule_id: string;
  user_id: string;
  basis_points: number;
  amount_minor: number;
};
export type EnvelopeSnapshot = {
  plans: EnvelopePlan[];
  rules: EnvelopeRule[];
  funding: EnvelopeFunding[];
};
export type EnvelopeBalance = {
  id: string;
  plan_id: string;
  name: string;
  currency: "MDL" | "EUR";
  kind: EnvelopeRule["envelope_kind"];
  percent: number;
  funded: number;
  spent: number;
  available: number;
  enabled: boolean;
  isFallback: boolean;
};
const percent = z
  .string()
  .trim()
  .regex(/^\d{1,3}([.,]\d{1,2})?$/, "Procent invalid; maximum două zecimale.")
  .transform((v) => {
    const [whole, fraction = ""] = v.replace(",", ".").split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  })
  .pipe(z.number().int().min(0).max(10000));
export const envelopeConfigSchema = z
  .object({
    plan_id: z.uuid(),
    enabled: z.enum(["true", "false"]).transform((v) => v === "true"),
    rules: z
      .array(z.object({ id: z.uuid(), percent }))
      .min(1)
      .max(20),
  })
  .refine(
    (v) => v.rules.reduce((s, r) => s + r.percent, 0) === 10000,
    "Procentele trebuie să totalizeze exact 100%.",
  )
  .refine(
    (v) => new Set(v.rules.map((r) => r.id)).size === v.rules.length,
    "Un buget apare de două ori.",
  );
export function envelopeBalances(
  snapshot: EnvelopeSnapshot,
  accounts: AccountRow[],
  categories: CategoryRow[],
  transactions: TransactionRow[],
  today = todayISO(),
): EnvelopeBalance[] {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const units = new Map(accounts.map((a) => [a.id, a.currency]));
  const tx = new Map(transactions.map((t) => [t.id, t]));
  return snapshot.plans.flatMap((plan) => {
    const rules = snapshot.rules
      .filter((r) => r.plan_id === plan.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const fallback = rules.find((r) => r.is_fallback);
    const spending = new Map<string, number[]>();
    for (const t of transactions) {
      if (
        t.kind !== "expense" ||
        units.get(t.account_id) !== plan.currency ||
        t.occurred_on < plan.start_on ||
        t.occurred_on > today ||
        Date.parse(t.created_at) < Date.parse(plan.created_at)
      )
        continue;
      const destination =
        rules.find((r) => r.category_id === t.category_id) || fallback;
      if (destination)
        spending.set(destination.id, [
          ...(spending.get(destination.id) || []),
          t.amount_minor,
        ]);
    }
    return rules.map((rule) => {
      const funded = safeTotal(
        snapshot.funding
          .filter((f) => f.rule_id === rule.id)
          .filter((f) => {
            const t = tx.get(f.transaction_id);
            return (
              t?.kind === "income" &&
              units.get(t.account_id) === plan.currency &&
              t.occurred_on >= plan.start_on &&
              t.occurred_on <= today
            );
          })
          .map((f) => f.amount_minor),
      );
      const spent = safeTotal(spending.get(rule.id) || []);
      return {
        id: rule.id,
        plan_id: plan.id,
        name: names.get(rule.category_id) || "Categorie",
        currency: plan.currency,
        kind: rule.envelope_kind,
        percent: rule.basis_points / 100,
        funded,
        spent,
        available: safeTotal([funded, -spent]),
        enabled: plan.enabled,
        isFallback: rule.is_fallback,
      };
    });
  });
}

export function splitIncome(
  amount: number,
  rules: Pick<EnvelopeRule, "id" | "basis_points" | "sort_order">[],
) {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > 1000000000000 ||
    !rules.length ||
    rules.reduce((s, r) => s + r.basis_points, 0) !== 10000 ||
    rules.some(
      (r) =>
        !Number.isInteger(r.basis_points) ||
        r.basis_points < 0 ||
        r.basis_points > 10000,
    )
  )
    throw Error("Sumă sau procente invalide.");
  const shares = rules.map((r) => {
    const product = BigInt(amount) * BigInt(r.basis_points);
    return {
      id: r.id,
      amount: Number(product / BigInt(10000)),
      fraction: Number(product % BigInt(10000)),
      order: r.sort_order,
    };
  });
  let remaining = amount - shares.reduce((s, r) => s + r.amount, 0);
  shares.sort(
    (a, b) =>
      b.fraction - a.fraction || a.order - b.order || a.id.localeCompare(b.id),
  );
  for (const share of shares) {
    if (!remaining) break;
    share.amount++;
    remaining--;
  }
  return Object.fromEntries(shares.map((s) => [s.id, s.amount]));
}
