import { test } from "node:test";
import assert from "node:assert/strict";
import {
  transactionSchema,
  filterSchema,
} from "../../src/lib/transaction-validation";
import { credentialsSchema, safeNext } from "../../src/lib/auth/validation";
import { calculateFinance } from "../../src/lib/finance-calculations";
import type { TransactionRow } from "../../src/lib/supabase/database.types";
const valid = {
  account_id: "00000000-0000-4000-8000-000000000001",
  category_id: "00000000-0000-4000-8000-000000000002",
  description: "  Cumpărături ",
  kind: "expense",
  amount: "12,34",
  occurred_on: "2026-11-11",
};
test("validates money exactly in minor units and rejects invalid dates, precision and amounts", () => {
  assert.equal(transactionSchema.parse(valid).amount, 1234);
  assert.equal(
    transactionSchema.parse({ ...valid, amount: "0.29" }).amount,
    29,
  );
  assert.equal(transactionSchema.parse(valid).description, "Cumpărături");
  for (const amount of [
    "0",
    "-2",
    "1.234",
    "NaN",
    "1e3",
    "10000000001",
    "1,2.3",
  ])
    assert.equal(
      transactionSchema.safeParse({ ...valid, amount }).success,
      false,
    );
  for (const occurred_on of ["2026-02-30", "2026-13-01", "1899-01-01"])
    assert.equal(
      transactionSchema.safeParse({ ...valid, occurred_on }).success,
      false,
    );
  assert.equal(
    filterSchema.safeParse({ from: "2026-12-01", to: "2026-11-01" }).success,
    false,
  );
});
test("auth validation and local redirects reject external or malformed destinations", () => {
  assert.equal(
    credentialsSchema.safeParse({ email: "bad", password: "short" }).success,
    false,
  );
  for (const next of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/auth/login",
    "/\n/evil.example",
  ])
    assert.equal(safeNext(next), "/");
  assert.equal(safeNext("/transactions?q=abc"), "/transactions?q=abc");
});
test("calculates month totals and balance without demo data, excludes future entries", () => {
  const row = (
    id: string,
    kind: "income" | "expense",
    amount_minor: number,
    occurred_on: string,
  ): TransactionRow => ({
    id,
    user_id: "a",
    account_id: "b",
    category_id: "c",
    description: "Test",
    payment_method: "unspecified",
    kind,
    amount_minor,
    occurred_on,
    created_at: "",
  });
  const result = calculateFinance(
    [
      {
        id: "b",
        user_id: "a",
        name: "Cont",
        currency: "MDL",
        opening_balance_minor: 1000,
        created_at: "",
      },
    ],
    [],
    [
      row("1", "income", 10000, "2026-10-10"),
      row("2", "expense", 29, "2026-11-10"),
      row("3", "income", 500, "2026-11-11"),
      row("4", "income", 99999, "2026-11-30"),
    ],
    new Date("2026-11-11T12:00:00Z"),
  );
  assert.equal(result.balance, 114.71);
  assert.equal(result.income, 5);
  assert.equal(result.expenses, 0.29);
  assert.equal(result.cashFlow.length, 6);
  assert.equal(result.cashFlow.at(-1)?.expenses, 0.29);
  assert.deepEqual(result.allocation, []);
  assert.deepEqual(result.budgets, []);
  assert.equal(
    calculateFinance([], [], [], new Date("2026-01-01T12:00:00Z")).cashFlow
      .length,
    6,
  );
});
