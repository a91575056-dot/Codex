import type { AccountRow, TransactionRow } from "./supabase/database.types";
import type { SavingsCurrency } from "./finance";
export function transactionsInCurrency(
  accounts: AccountRow[],
  rows: TransactionRow[],
  currency: SavingsCurrency = "MDL",
) {
  const ids = new Set(
    accounts.filter((a) => a.currency === currency).map((a) => a.id),
  );
  return rows.filter((t) => ids.has(t.account_id));
}
