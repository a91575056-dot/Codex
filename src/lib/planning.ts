import { z } from "zod";
import { todayISO } from "./goals";
import type { TransactionRow, CategoryRow } from "./supabase/database.types";
export type BudgetRow = {
  id: string;
  user_id: string;
  category_id: string;
  category_kind: "expense";
  month_start: string;
  limit_minor: number;
  created_at: string;
};
export type HoldingRow = {
  id: string;
  user_id: string;
  name: string;
  symbol: string;
  asset_class: "stocks" | "etf" | "bonds" | "crypto" | "cash" | "other";
  quantity_micros: number;
  cost_price_minor: number;
  current_price_minor: number;
  price_on: string;
  currency: "RON";
  created_at: string;
};
export const assetClasses = {
  stocks: { label: "Acțiuni", color: "#137d67" },
  etf: { label: "ETF-uri", color: "#79b7a2" },
  bonds: { label: "Obligațiuni", color: "#bdcbbd" },
  crypto: { label: "Criptoactive", color: "#b79bcb" },
  cash: { label: "Numerar", color: "#d8b477" },
  other: { label: "Alte active", color: "#8f9baf" },
} as const;
export const resourceSchema = z.enum([
  "budget",
  "holding",
  "account",
  "category",
]);
export type Resource = z.infer<typeof resourceSchema>;
const optionalId = z.union([z.uuid(), z.literal("")]).optional();
export const decimalMoney = z
  .string()
  .trim()
  .regex(
    /^\d{1,10}([.,]\d{1,2})?$/,
    "Introdu o sumă validă cu maximum două zecimale.",
  )
  .transform((v) => {
    const [w, f = ""] = v.replace(",", ".").split(".");
    return Number(w) * 100 + Number(f.padEnd(2, "0"));
  })
  .pipe(z.number().int().min(0).max(1000000000000));
const signedMoney = z
  .string()
  .trim()
  .regex(
    /^-?\d{1,10}([.,]\d{1,2})?$/,
    "Sold invalid. Folosește cel mult două zecimale.",
  )
  .transform((v) => {
    const negative = v.startsWith("-");
    const [w, f = ""] = (negative ? v.slice(1) : v)
      .replace(",", ".")
      .split(".");
    return (Number(w) * 100 + Number(f.padEnd(2, "0"))) * (negative ? -1 : 1);
  })
  .pipe(z.number().int().min(-1000000000000).max(1000000000000));
export const monthSchema = z
  .string()
  .regex(/^(19\d{2}|20\d{2}|2100)-(0[1-9]|1[0-2])$/, "Lună invalidă.");
export const budgetSchema = z.object({
  id: optionalId,
  category_id: z.uuid("Selectează o categorie."),
  month: monthSchema,
  limit: decimalMoney.pipe(
    z.number().positive("Limita trebuie să fie pozitivă."),
  ),
});
export const accountSchema = z.object({
  id: optionalId,
  name: z.string().trim().min(1, "Numele este obligatoriu.").max(80),
  opening_balance: signedMoney,
});
export const categorySchema = z.object({
  id: optionalId,
  name: z.string().trim().min(1, "Numele este obligatoriu.").max(80),
  kind: z.enum(["income", "expense"]),
});
const quantity = z
  .string()
  .trim()
  .regex(
    /^\d{1,7}([.,]\d{1,6})?$/,
    "Cantitatea trebuie să fie pozitivă și să aibă maximum șase zecimale.",
  )
  .transform((v) => {
    const [w, f = ""] = v.replace(",", ".").split(".");
    return Number(w) * 1000000 + Number(f.padEnd(6, "0"));
  })
  .pipe(
    z
      .number()
      .int()
      .positive("Cantitatea trebuie să fie pozitivă.")
      .max(1000000000000),
  );
export const holdingSchema = z
  .object({
    id: optionalId,
    name: z.string().trim().min(1, "Numele este obligatoriu.").max(100),
    symbol: z.string().trim().max(20).default(""),
    asset_class: z.enum(["stocks", "etf", "bonds", "crypto", "cash", "other"]),
    quantity,
    cost_price: decimalMoney,
    current_price: decimalMoney,
    price_on: z.iso
      .date()
      .refine(
        (d) => d >= "1900-01-01" && d <= todayISO(),
        "Data evaluării nu poate fi în viitor.",
      ),
  })
  .superRefine((v, ctx) => {
    if (
      ![v.quantity, v.cost_price, v.current_price].every(Number.isSafeInteger)
    )
      return;
    if (
      BigInt(v.quantity) * BigInt(Math.max(v.cost_price, v.current_price)) >
      BigInt(Number.MAX_SAFE_INTEGER) * BigInt(1000000)
    )
      ctx.addIssue({
        code: "custom",
        message: "Valoarea poziției depășește limita de precizie.",
      });
  });
export function safeTotal(values: number[]) {
  const total = values.reduce((s, v) => s + BigInt(v), BigInt(0));
  if (
    total > BigInt(Number.MAX_SAFE_INTEGER) ||
    total < -BigInt(Number.MAX_SAFE_INTEGER)
  )
    throw Error("Totalul depășește limita de precizie.");
  return Number(total);
}
export function holdingValue(h: HoldingRow) {
  const rounded = (price: number) =>
    Number(
      (BigInt(h.quantity_micros) * BigInt(price) + BigInt(500000)) /
        BigInt(1000000),
    );
  const value = rounded(h.current_price_minor),
    cost = rounded(h.cost_price_minor);
  return {
    value,
    cost,
    profit: value - cost,
    percent: cost ? ((value - cost) / cost) * 100 : null,
  };
}
export function portfolioSummary(holdings: HoldingRow[]) {
  const positions = holdings.map((h) => ({ ...h, ...holdingValue(h) }));
  const value = safeTotal(positions.map((h) => h.value)),
    cost = safeTotal(positions.map((h) => h.cost));
  return {
    positions,
    value,
    cost,
    profit: value - cost,
    percent: cost ? ((value - cost) / cost) * 100 : null,
    allocation: Object.entries(assetClasses)
      .map(([key, d]) => ({
        ...d,
        name: d.label,
        value: value
          ? Math.round(
              (safeTotal(
                positions
                  .filter((h) => h.asset_class === key)
                  .map((h) => h.value),
              ) /
                value) *
                10000,
            ) / 100
          : 0,
      }))
      .filter((d) => d.value > 0),
  };
}
export function budgetProgress(
  b: BudgetRow,
  rows: TransactionRow[],
  today = todayISO(),
) {
  const spent = safeTotal(
    rows
      .filter(
        (t) =>
          t.kind === "expense" &&
          t.category_id === b.category_id &&
          t.occurred_on.startsWith(b.month_start.slice(0, 7)) &&
          t.occurred_on <= today,
      )
      .map((t) => t.amount_minor),
  );
  return {
    spent,
    remaining: b.limit_minor - spent,
    percent: Math.floor((spent / b.limit_minor) * 100),
    over: spent > b.limit_minor,
  };
}
export function categoryTotals(
  rows: TransactionRow[],
  categories: CategoryRow[],
) {
  return categories
    .map((c) => ({
      ...c,
      total: safeTotal(
        rows.filter((t) => t.category_id === c.id).map((t) => t.amount_minor),
      ),
      count: rows.filter((t) => t.category_id === c.id).length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.total - a.total);
}
