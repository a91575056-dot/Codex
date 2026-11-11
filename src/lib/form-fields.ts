import type { FieldSpec } from "@/components/resource-form";
import type { AccountRow, CategoryRow } from "./supabase/database.types";
import { assetClasses, type BudgetRow, type HoldingRow } from "./planning";
import { todayISO } from "./goals";
const moneyPattern = "[0-9]{1,10}([.,][0-9]{1,2})?";
export const accountFields = (row?: AccountRow): FieldSpec[] => [
  { name: "name", label: "Numele contului", value: row?.name, maxLength: 80 },
  {
    name: "opening_balance",
    label: "Sold inițial (MDL)",
    value: ((row?.opening_balance_minor || 0) / 100).toFixed(2),
    pattern: "-?" + moneyPattern,
    hint: "Soldul înaintea tranzacțiilor înregistrate. Poate fi negativ.",
  },
];
export const categoryFields = (row?: CategoryRow): FieldSpec[] => [
  { name: "name", label: "Numele categoriei", value: row?.name, maxLength: 80 },
  {
    name: "kind",
    label: "Tipul categoriei",
    value: row?.kind || "expense",
    options: [
      { value: "expense", label: "Cheltuială" },
      { value: "income", label: "Venit" },
    ],
  },
];
export const budgetFields = (
  categories: CategoryRow[],
  month: string,
  row?: BudgetRow,
): FieldSpec[] => [
  {
    name: "category_id",
    label: "Categorie de cheltuieli",
    value: row?.category_id,
    options: categories
      .filter((c) => c.kind === "expense")
      .map((c) => ({ value: c.id, label: c.name })),
  },
  {
    name: "month",
    label: "Luna bugetului",
    type: "month",
    min: "1900-01",
    max: "2100-12",
    value: row?.month_start.slice(0, 7) || month,
  },
  {
    name: "limit",
    label: "Limită lunară (MDL)",
    pattern: moneyPattern,
    value: row ? (row.limit_minor / 100).toFixed(2) : "",
  },
];
export const holdingFields = (row?: HoldingRow): FieldSpec[] => [
  { name: "name", label: "Numele activului", value: row?.name },
  {
    name: "symbol",
    label: "Simbol (opțional)",
    value: row?.symbol,
    required: false,
    maxLength: 20,
  },
  {
    name: "asset_class",
    label: "Clasa activului",
    value: row?.asset_class || "etf",
    options: Object.entries(assetClasses).map(([value, d]) => ({
      value,
      label: d.label,
    })),
  },
  {
    name: "quantity",
    label: "Cantitate",
    value: row ? (row.quantity_micros / 1000000).toString() : "",
    pattern: "[0-9]{1,7}([.,][0-9]{1,6})?",
    hint: "Maximum șase zecimale.",
  },
  {
    name: "cost_price",
    label: "Cost mediu pe unitate (MDL)",
    pattern: moneyPattern,
    value: row ? (row.cost_price_minor / 100).toFixed(2) : "",
  },
  {
    name: "current_price",
    label: "Preț introdus pe unitate (MDL)",
    pattern: moneyPattern,
    value: row ? (row.current_price_minor / 100).toFixed(2) : "",
  },
  {
    name: "price_on",
    label: "Data evaluării manuale",
    type: "date",
    min: "1900-01-01",
    max: todayISO(),
    value: row?.price_on || todayISO(),
  },
];
