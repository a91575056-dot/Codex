import { z } from "zod";
import { transactionSchema } from "./transaction-validation";
export const deviceSchema = z.object({
  name: z.string().trim().min(1, "Denumește telefonul.").max(80),
  cash_account_id: z.uuid("Alege contul pentru cash."),
  card_account_id: z.uuid("Alege contul pentru card."),
});
export const shortcutExpenseSchema = z
  .object({
    request_id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{8,128}$/, "Identificatorul cererii este invalid."),
    amount: z
      .union([z.string(), z.number().finite()])
      .transform(String)
      .pipe(transactionSchema.shape.amount),
    payment_method: z.enum(["cash", "card"], { error: "Alege cash sau card." }),
    category_id: z.uuid("Alege o categorie validă."),
    description: z.string().trim().max(160).default(""),
  })
  .strict();
export const shortcutTransactionSchema = shortcutExpenseSchema
  .extend({
    kind: z.enum(["income", "expense"], {
      error: "Alege Venit sau Cheltuială.",
    }),
  })
  .strict();
export type ShortcutDevice = {
  allow_income: boolean;
  allow_loans: boolean;
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  cash_account_id: string;
  card_account_id: string;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  rate_window_at: string;
  rate_count: number;
};
export type DeviceView = Pick<
  ShortcutDevice,
  | "id"
  | "name"
  | "cash_account_id"
  | "card_account_id"
  | "created_at"
  | "expires_at"
  | "last_used_at"
  | "allow_income"
  | "allow_loans"
>;
export type ShortcutReceipt = {
  transaction_id: string;
  amount_minor: number;
  currency: "MDL";
  category: string;
  payment_method: "cash" | "card";
  occurred_on: string;
  replayed: boolean;
};

export const shortcutLoanSchema = shortcutExpenseSchema
  .omit({ category_id: true })
  .extend({
    direction: z.enum(["lent", "borrowed"]),
    person: z.string().trim().min(1, "Scrie numele persoanei.").max(100),
  })
  .strict();
