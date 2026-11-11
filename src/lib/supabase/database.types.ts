import type { BudgetRow, HoldingRow } from "@/lib/planning";
import type { Goal, Contribution, Scenario } from "@/lib/goals";
// Local types matching the committed migration. Regenerate with Supabase CLI after applying it.
export type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  currency: "RON";
  opening_balance_minor: number;
  created_at: string;
};
export type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "income" | "expense";
  created_at: string;
};
export type TransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  kind: "income" | "expense";
  description: string;
  amount_minor: number;
  occurred_on: string;
  created_at: string;
};
type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      budgets: Table<
        BudgetRow,
        "user_id" | "category_id" | "month_start" | "limit_minor"
      >;
      holdings: Table<
        HoldingRow,
        | "user_id"
        | "name"
        | "asset_class"
        | "quantity_micros"
        | "cost_price_minor"
        | "current_price_minor"
        | "price_on"
      >;
      savings_goals: Table<
        Goal,
        "user_id" | "name" | "target_minor" | "due_on"
      >;
      goal_contributions: Table<
        Contribution,
        "user_id" | "goal_id" | "amount_minor" | "occurred_on"
      >;
      goal_scenarios: Table<
        Scenario,
        | "user_id"
        | "goal_id"
        | "name"
        | "target_minor"
        | "saved_minor"
        | "monthly_minor"
        | "snapshot"
      >;
      accounts: Table<AccountRow, "user_id" | "name">;
      categories: Table<CategoryRow, "user_id" | "name" | "kind">;
      transactions: Table<
        TransactionRow,
        | "user_id"
        | "account_id"
        | "category_id"
        | "kind"
        | "description"
        | "amount_minor"
        | "occurred_on"
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
