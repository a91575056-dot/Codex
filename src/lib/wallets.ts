import type { AccountRow, TransactionRow } from "./supabase/database.types";
import { accountBalance, type Transfer } from "./operations";
import type { Loan } from "./loans";
import { todayISO } from "./goals";
import { safeTotal } from "./planning";

export function matchesPaymentMethod(
  account: Pick<AccountRow, "account_type">,
  method: string,
) {
  return (
    method === "unspecified" ||
    !account.account_type ||
    account.account_type === "other" ||
    account.account_type === method
  );
}

export type WalletBalance = {
  cash: number;
  card: number;
  other: number;
  total: number;
};
export function walletBalances(
  accounts: AccountRow[],
  transactions: TransactionRow[],
  transfers: Transfer[],
  loans: Loan[] = [],
  today = todayISO(),
): Record<"MDL" | "EUR", WalletBalance> {
  const forCurrency = (currency: "MDL" | "EUR"): WalletBalance => {
    const rows = accounts
      .filter((a) => a.currency === currency)
      .map((a) => ({
        type: a.account_type || "other",
        balance: accountBalance(a, transactions, transfers, today, loans),
      }));
    const sum = (type?: string) =>
      safeTotal(
        rows.filter((r) => !type || r.type === type).map((r) => r.balance),
      ) / 100;
    return {
      cash: sum("cash"),
      card: sum("card"),
      other: sum("other"),
      total: sum(),
    };
  };
  return { MDL: forCurrency("MDL"), EUR: forCurrency("EUR") };
}
