export interface Transaction {
  currency?: "MDL" | "EUR";
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  account?: string;
  paymentMethod?: "unspecified" | "cash" | "card";
}
export interface FinanceData {
  expenseDistribution?: { name: string; amount: number }[];
  portfolioDetails?: {
    cost: number;
    profit: number;
    percent: number | null;
    positions: {
      id: string;
      name: string;
      symbol: string;
      assetClass: string;
      value: number;
      profit: number;
      priceOn: string;
    }[];
  };
  envelopeAccounts?: { id: string; name: string; currency: "MDL" | "EUR" }[];
  envelopes?: import("@/lib/envelopes").EnvelopeBalance[];
  euro?: { balance: number; income: number; expenses: number };
  upcoming?: {
    id: string;
    name: string;
    date: string;
    amount: number;
    currency?: "MDL" | "EUR";
  }[];
  balance: number;
  income: number;
  expenses: number;
  portfolio: number;
  transactions: Transaction[];
  cashFlow: { month: string; income: number; expenses: number }[];
  allocation: { name: string; value: number; color: string }[];
  budgets: { name: string; spent: number; limit: number }[];
}
export interface FinanceRepository {
  getSnapshot(): Promise<FinanceData>;
}
