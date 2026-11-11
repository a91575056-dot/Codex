"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { recurringSchema, occurrenceSchema } from "@/lib/operations";
import { idSchema } from "@/lib/transaction-validation";
import type { OperationState } from "../transfers/actions";
export async function saveRecurring(
  _state: OperationState,
  form: FormData,
): Promise<OperationState> {
  if (!supabaseConfig()) return { error: "Modul demo nu salvează reguli." };
  const p = recurringSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { client, user } = await requireUser("/recurring");
  const { id, request_id, amount, ...fields } = p.data;
  const payload = { ...fields, amount_minor: amount, user_id: user.id };
  const r = id
    ? await client
        .from("recurring_rules")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle()
    : await client
        .from("recurring_rules")
        .insert({ ...payload, id: request_id })
        .select("id")
        .single();
  if (r.error?.code === "23505" && !id) {
    const old = await client
      .from("recurring_rules")
      .select("*")
      .eq("id", request_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (
      old.error ||
      !old.data ||
      Object.entries(payload).some(
        ([k, v]) => old.data![k as keyof typeof old.data] !== v,
      )
    )
      return { error: "Cererea există deja cu alte date. Verifică regulile." };
  } else if (r.error || !r.data)
    return {
      error:
        "Regula nu a putut fi salvată. Verifică contul, categoria și datele.",
    };
  revalidatePath("/", "layout");
  return {
    success:
      "Regulă salvată. Soldul se modifică numai când confirmi o scadență.",
    nextRequestId: randomUUID(),
  };
}
export async function postRecurring(
  _state: OperationState,
  form: FormData,
): Promise<OperationState> {
  if (!supabaseConfig())
    return { error: "Modul demo nu înregistrează scadențe." };
  const p = occurrenceSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { client } = await requireUser("/recurring");
  const r = await client.rpc("post_recurring", {
    p_rule_id: p.data.rule_id,
    p_due_on: p.data.due_on,
    p_occurred_on: p.data.occurred_on,
    p_expected_updated_at: p.data.updated_at,
  });
  if (r.error)
    return {
      error:
        r.error.code === "40001"
          ? "Regula a fost modificată. Reîncarcă pagina înainte de confirmare."
          : "Scadența nu poate fi înregistrată. Verifică data, starea regulii și lista de tranzacții.",
    };
  revalidatePath("/", "layout");
  return {
    success: r.data?.replayed
      ? "Scadența era deja înregistrată; nu a fost dublată."
      : "Scadență înregistrată în Tranzacții. Următoarea dată a fost calculată.",
  };
}
export async function deleteRecurring(
  _state: OperationState,
  form: FormData,
): Promise<OperationState> {
  if (!supabaseConfig())
    return { error: "Modul demo este doar pentru citire." };
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success || form.get("confirm") !== "yes")
    return { error: "Confirmă ștergerea regulii." };
  const { client, user } = await requireUser("/recurring");
  const r = await client
    .from("recurring_rules")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (r.error || !r.data) return { error: "Regula nu a putut fi ștearsă." };
  revalidatePath("/", "layout");
  return {
    success: "Regulă ștearsă. Tranzacțiile deja înregistrate se păstrează.",
  };
}
