"use server";
import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { receivableSchema } from "@/lib/receivables";
import { idSchema } from "@/lib/transaction-validation";
import { todayISO } from "@/lib/goals";
import { revalidatePath } from "next/cache";
export type DebtState = { error?: string; success?: string };
export async function saveDebt(
  _state: DebtState,
  form: FormData,
): Promise<DebtState> {
  if (!supabaseConfig()) return { error: "Modul demo nu salvează datorii." };
  const p = receivableSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { client, user } = await requireUser("/debts");
  const { amount, ...fields } = p.data;
  const payload = { ...fields, user_id: user.id, amount_minor: amount };
  const existing = await client
    .from("receivables")
    .select("*")
    .eq("id", fields.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing.error) return { error: "Datoria nu a putut fi verificată." };
  // Create requests are idempotent. Editing is explicit and never reopens a settled debt.
  if (form.get("editing") !== "yes" && existing.data) {
    if (
      Object.entries(payload).some(
        ([key, value]) =>
          existing.data![key as keyof typeof existing.data] !== value,
      )
    )
      return { error: "Această cerere există cu alte date. Verifică lista." };
    return { success: "Datoria este deja salvată." };
  }
  if (
    form.get("editing") === "yes" &&
    (!existing.data || existing.data.settled_on)
  )
    return { error: "Doar datoriile active pot fi editate." };
  const result =
    form.get("editing") === "yes"
      ? await client
          .from("receivables")
          .update(payload)
          .eq("id", fields.id)
          .eq("user_id", user.id)
          .is("settled_on", null)
          .select("id")
          .maybeSingle()
      : await client.from("receivables").insert(payload).select("id").single();
  if (result.error || !result.data)
    return {
      error:
        "Datoria nu a putut fi salvată. Verifică lista înainte de a încerca din nou.",
    };
  revalidatePath("/debts");
  return { success: "Datoria a fost salvată." };
}
export async function changeDebtStatus(
  _state: DebtState,
  form: FormData,
): Promise<DebtState> {
  if (!supabaseConfig()) return { error: "Modul demo nu modifică datorii." };
  const id = idSchema.safeParse(form.get("id"));
  const action = form.get("operation");
  if (
    !id.success ||
    !["settle", "reopen", "delete"].includes(String(action)) ||
    form.get("confirm") !== "yes"
  )
    return { error: "Confirmă operația pentru această datorie." };
  const { client, user } = await requireUser("/debts");
  const query =
    action === "delete"
      ? client.from("receivables").delete()
      : client
          .from("receivables")
          .update({ settled_on: action === "settle" ? todayISO() : null });
  const { data, error } = await query
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Datoria nu a putut fi actualizată." };
  revalidatePath("/debts");
  return {
    success:
      action === "settle"
        ? "Achitat. Datoria a fost mutată în istoric."
        : action === "reopen"
          ? "Datoria este din nou activă."
          : "Datoria a fost ștearsă.",
  };
}
