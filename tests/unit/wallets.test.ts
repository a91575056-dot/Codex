import { test } from "node:test";
import assert from "node:assert/strict";
import { walletBalances, matchesPaymentMethod } from "../../src/lib/wallets";
import { loanActivity, type Loan } from "../../src/lib/loans";
import type {
  AccountRow,
  TransactionRow,
} from "../../src/lib/supabase/database.types";
const accounts: AccountRow[] = [
  {
    id: "cash",
    name: "Cash",
    account_type: "cash",
    currency: "MDL",
    opening_balance_minor: 10000,
    user_id: "a",
    created_at: "",
  },
  {
    id: "card",
    name: "Card",
    account_type: "card",
    currency: "MDL",
    opening_balance_minor: 20000,
    user_id: "a",
    created_at: "",
  },
  {
    id: "eur",
    name: "Euro",
    account_type: "cash",
    currency: "EUR",
    opening_balance_minor: 5000,
    user_id: "a",
    created_at: "",
  },
];
const opening: Loan = {
  id: "loan",
  user_id: "a",
  account_id: "cash",
  currency: "MDL",
  direction: "lent",
  person: "Ana",
  amount_minor: 25000,
  payment_method: "cash",
  opening_loan: true,
  occurred_on: "2026-01-01",
  settled_on: null,
  settled_account_id: null,
  created_at: "",
  note: "",
};
test("wallets preserve separate cash/card balances, currency and transfer conservation", () => {
  const transactions: TransactionRow[] = [
    {
      id: "1",
      user_id: "a",
      account_id: "cash",
      category_id: "food",
      kind: "expense",
      amount_minor: 2500,
      occurred_on: "2026-01-02",
      payment_method: "cash",
      description: "Food",
      created_at: "",
    },
    {
      id: "2",
      user_id: "a",
      account_id: "card",
      category_id: "food",
      kind: "expense",
      amount_minor: 4000,
      occurred_on: "2026-01-02",
      payment_method: "card",
      description: "Food",
      created_at: "",
    },
  ];
  const balances = walletBalances(
    accounts,
    transactions,
    [],
    [opening],
    "2026-01-03",
  );
  assert.deepEqual(balances.MDL, { cash: 75, card: 160, other: 0, total: 235 });
  assert.deepEqual(balances.EUR, { cash: 50, card: 0, other: 0, total: 50 });
  const transfers = [
    {
      id: "t",
      user_id: "a",
      from_account_id: "cash",
      to_account_id: "card",
      amount_minor: 5000,
      occurred_on: "2026-01-02",
      description: "",
      created_at: "",
    },
  ];
  assert.deepEqual(
    walletBalances(accounts, transactions, transfers, [], "2026-01-03").MDL,
    { cash: 25, card: 210, other: 0, total: 235 },
  );
  // Negative balances remain real: no blanket clamp hides new spending or loans.
  assert.equal(
    walletBalances(
      accounts,
      transactions,
      [],
      [{ ...opening, opening_loan: false }],
      "2026-01-03",
    ).MDL.cash,
    -175,
  );
});
test("opening debt has no initial movement; repayment credits chosen wallet exactly once", () => {
  assert.deepEqual(loanActivity([opening], accounts), []);
  const repaid = {
    ...opening,
    settled_on: "2026-01-03",
    settled_account_id: "card",
  };
  assert.deepEqual(
    walletBalances(accounts, [], [], [repaid], "2026-01-03").MDL,
    { cash: 100, card: 450, other: 0, total: 550 },
  );
  const activity = loanActivity([repaid], accounts);
  assert.equal(activity.length, 1);
  assert.equal(activity[0].amount, 250);
  assert.equal(activity[0].account, "Card");
  const borrowed = { ...repaid, direction: "borrowed" as const };
  assert.equal(
    walletBalances(accounts, [], [], [borrowed], "2026-01-03").MDL.card,
    -50,
  );
});
test("typed accounts match their method and legacy accounts remain compatible", () => {
  assert.equal(matchesPaymentMethod(accounts[0], "card"), false);
  assert.equal(matchesPaymentMethod(accounts[1], "cash"), false);
  assert.equal(matchesPaymentMethod(accounts[0], "cash"), true);
  assert.equal(matchesPaymentMethod(accounts[1], "unspecified"), true);
  assert.equal(matchesPaymentMethod({}, "card"), true);
});
