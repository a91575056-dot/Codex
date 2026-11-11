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
