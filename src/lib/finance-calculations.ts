import type {
  AccountRow,
  CategoryRow,
  TransactionRow,
} from "./supabase/database.types";
import type { FinanceData } from "@/types/finance";
export function currentMonth(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Chisinau",
    year: "numeric",
    month: "2-digit",
  }).format(now);
}
export function calculateFinance(
  accounts: AccountRow[],
  categories: CategoryRow[],
  rows: TransactionRow[],
  now = new Date(),
): FinanceData {
  const month = currentMonth(now);
  const [year, m] = month.split("-").map(Number);
  const cashFlow = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(year, m - 6 + i, 1));
    return {
      key: d.toISOString().slice(0, 7),
      month: new Intl.DateTimeFormat("ro-RO", {
        month: "short",
        timeZone: "UTC",
      }).format(d),
      income: BigInt(0),
      expenses: BigInt(0),
    };
  });
  let balanceMinor = accounts.reduce(
      (sum, a) => sum + BigInt(a.opening_balance_minor),
      BigInt(0),
    ),
    incomeMinor = BigInt(0),
    expenseMinor = BigInt(0);
  // Future-dated entries remain visible in the ledger but do not affect today's balance.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Chisinau",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  for (const t of rows) {
    if (t.occurred_on > today) continue;
    const signed =
      t.kind === "income" ? BigInt(t.amount_minor) : -BigInt(t.amount_minor);
    balanceMinor += signed;
    if (t.occurred_on.startsWith(month)) {
      if (t.kind === "income") incomeMinor += BigInt(t.amount_minor);
      else expenseMinor += BigInt(t.amount_minor);
    }
    const bucket = cashFlow.find((b) => b.key === t.occurred_on.slice(0, 7));
    if (bucket) {
      if (t.kind === "income") bucket.income += BigInt(t.amount_minor);
      else bucket.expenses += BigInt(t.amount_minor);
    }
  }
  const names = new Map(categories.map((c) => [c.id, c.name]));
  function asRON(minor: bigint) {
    if (
      minor > BigInt(Number.MAX_SAFE_INTEGER) ||
      minor < -BigInt(Number.MAX_SAFE_INTEGER)
    )
      throw new Error("Totalul depășește limita de precizie acceptată.");
    return Number(minor) / 100;
  }
  return {
    balance: asRON(balanceMinor),
    income: asRON(incomeMinor),
    expenses: asRON(expenseMinor),
    portfolio: 0,
    budgets: [],
    allocation: [],
    cashFlow: cashFlow.map((b) => ({
      month: b.month,
      income: asRON(b.income),
      expenses: asRON(b.expenses),
    })),
    transactions: rows.map((t) => ({
      id: t.id,
      name: t.description,
      category: names.get(t.category_id) || "Categorie indisponibilă",
      date: t.occurred_on,
      paymentMethod: t.payment_method,
      amount: asRON(
        t.kind === "income" ? BigInt(t.amount_minor) : -BigInt(t.amount_minor),
      ),
    })),
  };
}
