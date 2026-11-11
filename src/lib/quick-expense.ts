import { z } from "zod";
import { transactionSchema } from "./transaction-validation";
export const quickExpenseSchema = z.object({
  request_id: z.uuid("Formular invalid. Reîncarcă pagina."),
  account_id: transactionSchema.shape.account_id,
  category_id: transactionSchema.shape.category_id,
  amount: transactionSchema.shape.amount,
  payment_method: z.enum(["cash", "card"], { error: "Alege cash sau card." }),
  description: z.string().trim().max(160).default(""),
});
export function storedAccounts(
  value: string,
  validIds: string[],
): Partial<Record<"cash" | "card", string>> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return {};
    const obj = parsed as Record<string, unknown>;
    return Object.fromEntries(
      ["cash", "card"]
        .filter(
          (k) =>
            typeof obj[k] === "string" && validIds.includes(obj[k] as string),
        )
        .map((k) => [k, obj[k]]),
    );
  } catch {
    return {};
  }
}
