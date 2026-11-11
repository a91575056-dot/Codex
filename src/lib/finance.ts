import type { FinanceData, FinanceRepository } from "@/types/finance";
export type SavingsCurrency = "MDL" | "EUR";
export const money = (n: number, currency: SavingsCurrency = "MDL") =>
  new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
const demo: FinanceData = {
  balance: 48520,
  income: 12500,
  expenses: 6840,
  portfolio: 32680,
  cashFlow: [
    { month: "Iun", income: 10200, expenses: 6100 },
    { month: "Iul", income: 11800, expenses: 7200 },
    { month: "Aug", income: 10800, expenses: 5800 },
    { month: "Sep", income: 14200, expenses: 8100 },
    { month: "Oct", income: 11900, expenses: 6300 },
    { month: "Noi", income: 12500, expenses: 6840 },
  ],
  allocation: [
    { name: "Acțiuni", value: 55, color: "#137d67" },
    { name: "ETF-uri", value: 25, color: "#79b7a2" },
    { name: "Obligațiuni", value: 15, color: "#c7ddd2" },
    { name: "Numerar", value: 5, color: "#d8b477" },
  ],
  budgets: [
    { name: "Alimente", spent: 1240, limit: 1800 },
    { name: "Transport", spent: 480, limit: 800 },
    { name: "Timp liber", spent: 620, limit: 700 },
  ],
  transactions: [
    {
      id: "1",
      name: "Salariu · companie demo",
      category: "Venit salarial",
      date: "2026-11-10",
      amount: 10500,
    },
    {
      id: "2",
      name: "Piața Verde · magazin fictiv",
      category: "Alimente",
      date: "2026-11-09",
      amount: -286.5,
    },
    {
      id: "3",
      name: "Casa Urbană · chirie demo",
      category: "Locuință",
      date: "2026-11-08",
      amount: -2400,
    },
    {
      id: "4",
      name: "Studio Nord · proiect demo",
      category: "Freelancing",
      date: "2026-11-07",
      amount: 2000,
    },
  ],
};
// Read-only fictional adapter; authenticated pages use the separate Supabase repository.
export const financeRepository: FinanceRepository = {
  async getSnapshot() {
    return structuredClone(demo);
  },
};
