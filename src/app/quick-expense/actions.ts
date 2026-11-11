"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireUser } from "@/lib/auth/session";
import { quickExpenseSchema } from "@/lib/quick-expense";
import { todayISO } from "@/lib/goals";
import { money } from "@/lib/finance";
import { paymentLabels } from "@/lib/payment";
export type QuickState = {
  success?: string;
  error?: string;
  transactionId?: string;
  nextRequestId?: string;
};
export async function saveQuickExpense(
  _state: QuickState,
  form: FormData,
): Promise<QuickState> {
  if (!supabaseConfig()) return { error: "Modul demo nu salvează cheltuieli." };
  const p = quickExpenseSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { client, user } = await requireUser("/quick-expense");
  const { request_id, amount, ...fields } = p.data;
  const [account, category] = await Promise.all([
    client
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", fields.account_id)
      .maybeSingle(),
    client
      .from("categories")
      .select("id,name")
      .eq("user_id", user.id)
      .eq("id", fields.category_id)
      .eq("kind", "expense")
      .maybeSingle(),
  ]);
  if (account.error || category.error)
    return {
      error:
        "Nu am putut verifica datele. Încearcă din nou; formularul păstrează aceeași cerere pentru a evita dublarea.",
    };
  if (!account.data || !category.data)
    return {
      error: "Alege un cont și o categorie de cheltuieli care îți aparțin.",
    };
  const payload = {
    id: request_id,
    user_id: user.id,
    account_id: fields.account_id,
    category_id: fields.category_id,
    kind: "expense" as const,
    amount_minor: amount,
    payment_method: fields.payment_method,
    description: fields.description || category.data.name,
    occurred_on: todayISO(),
  };
  const result = await client
    .from("transactions")
    .insert(payload)
    .select("id")
    .single();
  if (result.error) {
    if (result.error.code !== "23505")
      return {
        error:
          "Nu s-a putut confirma salvarea. Încearcă din nou din acest formular; cererea nu se dublează.",
      };
    const { data: existing, error } = await client
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", request_id)
      .maybeSingle();
    if (
      error ||
      !existing ||
      existing.account_id !== payload.account_id ||
      existing.category_id !== payload.category_id ||
      existing.amount_minor !== amount ||
      existing.kind !== "expense" ||
      existing.payment_method !== payload.payment_method ||
      existing.description !== payload.description ||
      existing.occurred_on !== payload.occurred_on
    )
      return {
        error:
          "Cererea există deja cu alte date. Verifică Tranzacții înainte de a începe un formular nou.",
      };
  }
  revalidatePath("/", "layout");
  return {
    success: `Salvat: ${money(amount / 100)} · ${paymentLabels[fields.payment_method]} · ${category.data.name}.`,
    transactionId: request_id,
    nextRequestId: randomUUID(),
  };
}
