import "server-only";
import { requireUser } from "@/lib/auth/session";
import { calculateFinance } from "@/lib/finance-calculations";
import type { TransactionRow } from "./database.types";
export async function getLedger() {
  const { client, user } = await requireUser();
  const [a, c] = await Promise.all([
    client.from("accounts").select("*").eq("user_id", user.id).order("name"),
    client.from("categories").select("*").eq("user_id", user.id).order("name"),
  ]);
  if (a.error || c.error)
    throw new Error("Conturile și categoriile nu au putut fi încărcate.");
  const transactions: TransactionRow[] = [];
  // Supabase's default row limit must never silently truncate financial totals.
  for (let start = 0; ; start += 500) {
    const { data, error } = await client
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("occurred_on", { ascending: false })
      .order("id")
      .range(start, start + 499);
    if (error) throw new Error("Tranzacțiile nu au putut fi încărcate.");
    transactions.push(...data);
    if (data.length < 500) break;
  }
  return { accounts: a.data, categories: c.data, transactions, user };
}
export async function getUserFinance() {
  const ledger = await getLedger();
  return calculateFinance(
    ledger.accounts,
    ledger.categories,
    ledger.transactions,
  );
}

export const supabaseRepository: import("@/types/finance").FinanceRepository = {
  getSnapshot: getUserFinance,
};
