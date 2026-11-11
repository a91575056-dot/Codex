import { test } from "node:test";
import assert from "node:assert/strict";
import {
  budgetSchema,
  accountSchema,
  holdingSchema,
  budgetProgress,
  holdingValue,
  portfolioSummary,
  safeTotal,
} from "../../src/lib/planning";
import { financialReport, reportRangeSchema } from "../../src/lib/reports";
import type { HoldingRow, BudgetRow } from "../../src/lib/planning";
import type {
  TransactionRow,
  CategoryRow,
} from "../../src/lib/supabase/database.types";
const uid = "00000000-0000-4000-8000-000000000001",
  category = "00000000-0000-4000-8000-000000000002";
const budget: BudgetRow = {
  id: "b",
  user_id: uid,
  category_id: category,
  category_kind: "expense",
  month_start: "2026-11-01",
  limit_minor: 50000,
  created_at: "",
};
const tx = (
  id: string,
  kind: "income" | "expense",
  amount: number,
  date: string,
  category_id = category,
): TransactionRow => ({
  id,
  user_id: uid,
  account_id: "a",
  category_id,
  kind,
  amount_minor: amount,
  occurred_on: date,
  description: "Test",
  payment_method: "unspecified",
  created_at: "",
});
const holding: HoldingRow = {
  id: "h",
  user_id: uid,
  name: "Exemplu",
  symbol: "TEST",
  asset_class: "etf",
  quantity_micros: 2500000,
  cost_price_minor: 10000,
  current_price_minor: 12000,
  price_on: "2026-11-10",
  currency: "RON",
  created_at: "",
};
test("budgets include only category expenses in selected month up to today", () => {
  const result = budgetProgress(
    budget,
    [
      tx("1", "expense", 30000, "2026-11-01"),
      tx("2", "expense", 25000, "2026-11-10"),
      tx("3", "income", 900000, "2026-11-02"),
      tx("4", "expense", 900000, "2026-10-01"),
      tx("5", "expense", 900000, "2026-11-30"),
      tx("6", "expense", 900000, "2026-11-03", "other"),
    ],
    "2026-11-11",
  );
  assert.equal(result.spent, 55000);
  assert.equal(result.remaining, -5000);
  assert.equal(result.over, true);
  assert.equal(result.percent, 110);
});
test("portfolio uses micro quantities and integer prices with penny rounding", () => {
  const value = holdingValue(holding);
  assert.deepEqual(value, {
    value: 30000,
    cost: 25000,
    profit: 5000,
    percent: 20,
  });
  assert.equal(
    holdingValue({
      ...holding,
      quantity_micros: 500000,
      cost_price_minor: 0,
      current_price_minor: 1,
    }).value,
    1,
  );
  const p = portfolioSummary([
    holding,
    { ...holding, id: "h2", asset_class: "cash" },
  ]);
  assert.equal(p.value, 60000);
  assert.equal(p.cost, 50000);
  assert.equal(p.allocation.length, 2);
  assert.equal(p.allocation[0].value, 50);
  assert.equal(portfolioSummary([]).percent, null);
  assert.deepEqual(portfolioSummary([]).allocation, []);
  assert.throws(() => safeTotal([Number.MAX_SAFE_INTEGER, 1]));
});
test("resource schemas validate negative initial balances, month ranges and unsafe positions", () => {
  assert.equal(
    accountSchema.parse({ name: "Cont", opening_balance: "-120,25" })
      .opening_balance,
    -12025,
  );
  assert.equal(
    budgetSchema.safeParse({
      category_id: category,
      month: "2026-13",
      limit: "500",
    }).success,
    false,
  );
  assert.equal(
    budgetSchema.safeParse({
      category_id: category,
      month: "2026-11",
      limit: "0",
    }).success,
    false,
  );
  const data = {
    name: "ETF",
    symbol: "X",
    asset_class: "etf",
    quantity: "2,500001",
    cost_price: "100",
    current_price: "120",
    price_on: "2026-01-01",
  };
  assert.equal(holdingSchema.parse(data).quantity, 2500001);
  for (const quantity of ["0", "-1", "1.1234567", "NaN"])
    assert.equal(holdingSchema.safeParse({ ...data, quantity }).success, false);
  assert.equal(
    holdingSchema.safeParse({
      ...data,
      quantity: "1000000",
      current_price: "1000000000",
    }).success,
    false,
  );
  assert.equal(
    holdingSchema.safeParse({ ...data, price_on: "2100-01-01" }).success,
    false,
  );
});
test("reports respect inclusive bounds and do not count holdings or goals as cash flow", () => {
  const categories: CategoryRow[] = [
    {
      id: category,
      user_id: uid,
      name: "Alimente",
      kind: "expense",
      created_at: "",
    },
  ];
  const r = financialReport(
    [
      tx("1", "expense", 1000, "2026-11-01"),
      tx("2", "income", 10000, "2026-11-30"),
      tx("3", "expense", 9999, "2026-10-31"),
    ],
    categories,
    "2026-11-01",
    "2026-11-30",
  );
  assert.equal(r.rows.length, 2);
  assert.equal(r.income, 10000);
  assert.equal(r.expenses, 1000);
  assert.equal(r.net, 9000);
  assert.equal(r.rate, 90);
  assert.equal(financialReport([], [], "2026-11-01", "2026-11-30").rate, null);
  assert.equal(
    reportRangeSchema.safeParse({ from: "2026-11-30", to: "2026-11-01" })
      .success,
    false,
  );
});
