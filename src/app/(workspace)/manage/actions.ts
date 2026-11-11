"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import {
  resourceSchema,
  accountSchema,
  categorySchema,
  budgetSchema,
  holdingSchema,
  type Resource,
} from "@/lib/planning";
import { idSchema } from "@/lib/transaction-validation";
export type FormState = { error?: string; success?: string };
export async function saveResource(
  resource: Resource,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  if (!supabaseConfig())
    return { error: "Modul demo este doar pentru citire." };
  if (!resourceSchema.safeParse(resource).success)
    return { error: "Operație invalidă." };
  const raw = Object.fromEntries(form);
  const { client, user } = await requireUser();
  let error: { code?: string } | null = null;
  let found = false;
  if (resource === "account") {
    const p = accountSchema.safeParse(raw);
    if (!p.success) return { error: p.error.issues[0].message };
    const { id, name, opening_balance, currency } = p.data;
    const data = {
      user_id: user.id,
      name,
      opening_balance_minor: opening_balance,
      currency,
    };
    const r = id
      ? await client
          .from("accounts")
          .update(data)
          .eq("id", id)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle()
      : await client.from("accounts").insert(data).select("id").single();
    error = r.error;
    found = !!r.data;
  }
  if (resource === "category") {
    const p = categorySchema.safeParse(raw);
    if (!p.success) return { error: p.error.issues[0].message };
    const { id, ...data } = p.data;
    const r = id
      ? await client
          .from("categories")
          .update({ ...data, user_id: user.id })
          .eq("id", id)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle()
      : await client
          .from("categories")
          .insert({ ...data, user_id: user.id })
          .select("id")
          .single();
    error = r.error;
    found = !!r.data;
  }
  if (resource === "budget") {
    const p = budgetSchema.safeParse(raw);
    if (!p.success) return { error: p.error.issues[0].message };
    const { id, category_id, month, limit } = p.data;
    const data = {
      user_id: user.id,
      category_id,
      month_start: month + "-01",
      limit_minor: limit,
    };
    const r = id
      ? await client
          .from("budgets")
          .update(data)
          .eq("id", id)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle()
      : await client.from("budgets").insert(data).select("id").single();
    error = r.error;
    found = !!r.data;
  }
  if (resource === "holding") {
    const p = holdingSchema.safeParse(raw);
    if (!p.success) return { error: p.error.issues[0].message };
    const { id, quantity, cost_price, current_price, ...fields } = p.data;
    const data = {
      ...fields,
      user_id: user.id,
      quantity_micros: quantity,
      cost_price_minor: cost_price,
      current_price_minor: current_price,
    };
    const r = id
      ? await client
          .from("holdings")
          .update(data)
          .eq("id", id)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle()
      : await client.from("holdings").insert(data).select("id").single();
    error = r.error;
    found = !!r.data;
  }
  if (error?.code === "23514")
    return {
      error:
        "Moneda unui cont existent nu poate fi schimbată. Creează un cont nou în EUR sau MDL.",
    };
  if (error?.code === "23505")
    return {
      error:
        "Există deja această categorie sau un buget pentru categoria și luna selectate.",
    };
  if (error?.code === "23503")
    return {
      error:
        "Resursa este utilizată de alte înregistrări sau categoria nu este o cheltuială proprie.",
    };
  if (error || !found)
    return {
      error:
        "Înregistrarea nu a putut fi salvată. Verifică datele și conexiunea.",
    };
  revalidatePath("/", "layout");
  return { success: "Modificările au fost salvate." };
}
export async function deleteResource(
  resource: Resource,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  if (!supabaseConfig())
    return { error: "Modul demo este doar pentru citire." };
  const p = idSchema.safeParse(form.get("id"));
  if (
    !p.success ||
    form.get("confirm") !== "yes" ||
    !resourceSchema.safeParse(resource).success
  )
    return { error: "Confirmă ștergerea." };
  const { client, user } = await requireUser();
  const table =
    resource === "account"
      ? "accounts"
      : resource === "category"
        ? "categories"
        : resource === "budget"
          ? "budgets"
          : "holdings";
  const { data, error } = await client
    .from(table)
    .delete()
    .eq("id", p.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error?.code === "23503")
    return {
      error:
        "Nu poți șterge un cont sau o categorie folosită de tranzacții ori bugete. Modifică mai întâi înregistrările asociate.",
    };
  if (error || !data) return { error: "Ștergerea nu a reușit." };
  revalidatePath("/", "layout");
  return { success: "Înregistrarea a fost ștearsă." };
}
