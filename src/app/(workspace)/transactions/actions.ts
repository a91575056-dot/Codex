"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { transactionSchema, idSchema } from "@/lib/transaction-validation";
export type MutationState = { error?: string; success?: string };
export async function saveTransaction(
  _previous: MutationState,
  form: FormData,
): Promise<MutationState> {
  if (!supabaseConfig())
    return { error: "Modul demo este doar pentru citire." };
  const parsed = transactionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { client, user } = await requireUser();
  const { id, amount, ...fields } = parsed.data;
  const [a, c] = await Promise.all([
    client
      .from("accounts")
      .select("id")
      .eq("id", fields.account_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    client
      .from("categories")
      .select("id")
      .eq("id", fields.category_id)
      .eq("user_id", user.id)
      .eq("kind", fields.kind)
      .maybeSingle(),
  ]);
  if (a.error || c.error)
    return {
      error: "Nu s-au putut verifica contul și categoria. Încearcă din nou.",
    };
  if (!a.data || !c.data)
    return {
      error:
        "Contul sau categoria nu îți aparține ori nu corespunde tipului selectat.",
    };
  const payload = { ...fields, amount_minor: amount, user_id: user.id };
  const result = id
    ? await client
        .from("transactions")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle()
    : await client.from("transactions").insert(payload).select("id").single();
  if (result.error || !result.data)
    return {
      error:
        "Tranzacția nu a putut fi salvată. Reîncarcă pagina și încearcă din nou.",
    };
  revalidatePath("/", "layout");
  return {
    success: id
      ? "Tranzacția a fost actualizată."
      : "Tranzacția a fost adăugată.",
  };
}
export async function deleteTransaction(
  _previous: MutationState,
  form: FormData,
): Promise<MutationState> {
  if (!supabaseConfig())
    return { error: "Modul demo este doar pentru citire." };
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success || form.get("confirm") !== "yes")
    return { error: "Confirmă ștergerea tranzacției." };
  const { client, user } = await requireUser();
  const { data, error } = await client
    .from("transactions")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Tranzacția nu a putut fi ștearsă." };
  revalidatePath("/", "layout");
  return { success: "Tranzacția a fost ștearsă." };
}
