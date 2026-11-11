import type { Transfer } from "@/lib/operations";
import { getRecurringRules } from "./operations-repository";
import "server-only";
import { requireUser } from "@/lib/auth/session";
import { calculateFinance } from "@/lib/finance-calculations";
import { getPlanning, allRows } from "./planning-repository";
import { portfolioSummary, budgetProgress } from "@/lib/planning";
import { todayISO } from "@/lib/goals";
import type { AccountRow, CategoryRow, TransactionRow } from "./database.types";
export async function getLedger(next = "/") {
  const { client, user } = await requireUser(next);
  const [a, c, transfers] = await Promise.all([
    allRows<AccountRow>((f, t) =>
      client
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("name")
        .order("id")
        .range(f, t),
    ),
    allRows<CategoryRow>((f, t) =>
      client
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name")
        .order("id")
        .range(f, t),
    ),
    allRows<Transfer>((f, t) =>
      client
        .from("transfers")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_on", { ascending: false })
        .order("id")
        .range(f, t),
    ),
  ]);

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
  return { accounts: a, categories: c, transactions, transfers, user };
}
export async function getUserFinance() {
  const [ledger, planning, recurring] = await Promise.all([
    getLedger(),
    getPlanning(),
    getRecurringRules(),
  ]);
  const data = calculateFinance(
    ledger.accounts,
    ledger.categories,
    ledger.transactions,
  );
  const portfolio = portfolioSummary(planning.holdings);
  const names = new Map(ledger.categories.map((c) => [c.id, c.name]));
  return {
    ...data,
    upcoming: recurring
      .filter((r) => r.active)
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        name: r.description,
        date: r.next_due_on,
        amount: ((r.kind === "income" ? 1 : -1) * r.amount_minor) / 100,
      })),
    portfolio: portfolio.value / 100,
    allocation: portfolio.allocation,
    budgets: planning.budgets
      .filter((b) => b.month_start.startsWith(todayISO().slice(0, 7)))
      .map((b) => ({
        name: names.get(b.category_id) || "Categorie",
        spent: budgetProgress(b, ledger.transactions).spent / 100,
        limit: b.limit_minor / 100,
      })),
  };
}

export const supabaseRepository: import("@/types/finance").FinanceRepository = {
  getSnapshot: getUserFinance,
};
