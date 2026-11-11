export interface Transaction {
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  paymentMethod?: "unspecified" | "cash" | "card";
}
export interface FinanceData {
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
