import type {
  EnvelopePlan,
  EnvelopeRule,
  EnvelopeFunding,
} from "@/lib/envelopes";
import type {
  Transfer,
  RecurringRule,
  RecurringOccurrence,
} from "@/lib/operations";
import type { ImportRow } from "@/lib/csv-import";
import type { ShortcutDevice, ShortcutReceipt } from "@/lib/shortcut";
import type { Receivable } from "@/lib/receivables";
import type { BudgetRow, HoldingRow } from "@/lib/planning";
import type { Goal, Contribution, Scenario } from "@/lib/goals";
// Local types matching the committed migration. Regenerate with Supabase CLI after applying it.
export type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  currency: "MDL" | "EUR";
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
  payment_method: "unspecified" | "cash" | "card";
  amount_minor: number;
  occurred_on: string;
  created_at: string;
  import_fingerprint?: string | null;
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
      envelope_plans: Table<EnvelopePlan, "user_id" | "currency">;
      envelope_rules: Table<
        EnvelopeRule,
        | "user_id"
        | "plan_id"
        | "category_id"
        | "envelope_kind"
        | "basis_points"
        | "sort_order"
      >;
      envelope_funding: Table<EnvelopeFunding, keyof EnvelopeFunding>;
      receivables: Table<
        Receivable,
        | "id"
        | "user_id"
        | "person"
        | "amount_minor"
        | "currency"
        | "occurred_on"
      >;
      transfers: Table<
        Transfer,
        | "id"
        | "user_id"
        | "from_account_id"
        | "to_account_id"
        | "amount_minor"
        | "occurred_on"
      >;
      recurring_rules: Table<
        RecurringRule,
        | "id"
        | "user_id"
        | "account_id"
        | "category_id"
        | "kind"
        | "description"
        | "amount_minor"
        | "frequency"
        | "start_on"
        | "next_due_on"
      >;
      recurring_occurrences: Table<
        RecurringOccurrence,
        "user_id" | "rule_id" | "due_on" | "transaction_id"
      >;
      shortcut_devices: Table<
        ShortcutDevice,
        | "user_id"
        | "name"
        | "token_hash"
        | "cash_account_id"
        | "card_account_id"
      >;
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
    Functions: {
      confirm_envelope_investment: {
        Args: {
          p_rule_id: string;
          p_account_id: string;
          p_request_id: string;
          p_expected_available: number;
        };
        Returns: {
          transaction_id: string;
          amount_minor: number;
          currency: "MDL" | "EUR";
          replayed: boolean;
        };
      };
      start_envelopes: { Args: { p_currency: string }; Returns: string };
      configure_envelopes: {
        Args: {
          p_plan_id: string;
          p_enabled: boolean;
          p_rules: { id: string; basis_points: number }[];
        };
        Returns: boolean;
      };
      configure_shortcut_income: {
        Args: { p_device_id: string; p_enabled: boolean };
        Returns: boolean;
      };
      shortcut_finance_options: {
        Args: { p_token: string };
        Returns: {
          currency: "MDL";
          categories: Record<string, string>;
          income_categories: Record<string, string>;
          income_enabled: boolean;
        };
      };
      shortcut_income: {
        Args: {
          p_token: string;
          p_request_id: string;
          p_amount_minor: number;
          p_payment_method: string;
          p_category_id: string;
          p_description: string;
        };
        Returns: ShortcutReceipt;
      };
      post_recurring: {
        Args: {
          p_rule_id: string;
          p_due_on: string;
          p_occurred_on: string;
          p_expected_updated_at: string;
        };
        Returns: { transaction_id: string; replayed: boolean };
      };
      import_transactions: {
        Args: { p_rows: ImportRow[] };
        Returns: { inserted: number; skipped: number };
      };
      shortcut_options: {
        Args: { p_token: string };
        Returns: { currency: "MDL"; categories: Record<string, string> };
      };
      shortcut_expense: {
        Args: {
          p_token: string;
          p_request_id: string;
          p_amount_minor: number;
          p_payment_method: string;
          p_category_id: string;
          p_description: string;
        };
        Returns: ShortcutReceipt;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
