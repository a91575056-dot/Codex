import { test } from "node:test";
import assert from "node:assert/strict";
import {
  quickExpenseSchema,
  storedAccounts,
} from "../../src/lib/quick-expense";
import { transactionSchema } from "../../src/lib/transaction-validation";
import { profileName, displayNameSchema } from "../../src/lib/auth/validation";
const id = "00000000-0000-4000-8000-000000000001";
test("quick expense requires cash/card, own resource identifiers and exact positive money", () => {
  const data = {
    request_id: id,
    account_id: id,
    category_id: id,
    payment_method: "cash",
    amount: "25,50",
  };
  assert.equal(quickExpenseSchema.parse(data).amount, 2550);
  assert.equal(quickExpenseSchema.parse(data).description, "");
  for (const payment_method of ["unspecified", "bank", ""])
    assert.equal(
      quickExpenseSchema.safeParse({ ...data, payment_method }).success,
      false,
    );
  for (const amount of ["0", "-1", "25.555"])
    assert.equal(
      quickExpenseSchema.safeParse({ ...data, amount }).success,
      false,
    );
  assert.equal(
    quickExpenseSchema.safeParse({ ...data, request_id: "bad" }).success,
    false,
  );
  assert.equal(
    transactionSchema.parse({
      account_id: id,
      category_id: id,
      kind: "expense",
      description: "Test",
      amount: "1",
      occurred_on: "2026-01-01",
    }).payment_method,
    "unspecified",
  );
});
test("account preferences reject unknown account IDs and profile names are display-only", () => {
  assert.deepEqual(
    storedAccounts(JSON.stringify({ cash: id, card: "another-user-id" }), [id]),
    { cash: id },
  );
  assert.deepEqual(storedAccounts("bad", [id]), {});
  assert.deepEqual(storedAccounts("null", [id]), {});
  assert.equal(
    profileName({ user_metadata: { display_name: " Dionis " } }),
    "Dionis",
  );
  assert.equal(
    profileName({ user_metadata: { display_name: { role: "admin" } } }),
    "Cont personal",
  );
  assert.equal(displayNameSchema.safeParse(" ").success, false);
});
