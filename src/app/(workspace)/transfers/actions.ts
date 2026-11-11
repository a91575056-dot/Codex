"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { transferSchema } from "@/lib/operations";
import { idSchema } from "@/lib/transaction-validation";
export type OperationState = {
  error?: string;
  success?: string;
  nextRequestId?: string;
};
export async function saveTransfer(
  _state: OperationState,
  form: FormData,
): Promise<OperationState> {
  if (!supabaseConfig())
    return { error: "Modul demo nu salvează transferuri." };
  const p = transferSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { client, user } = await requireUser("/transfers");
  const { id, request_id, amount, ...fields } = p.data;
  const { data: currencies, error: currencyError } = await client
    .from("accounts")
    .select("id,currency")
    .eq("user_id", user.id)
    .in("id", [fields.from_account_id, fields.to_account_id]);
  if (
    currencyError ||
    currencies?.length !== 2 ||
    currencies[0].currency !== currencies[1].currency
  )
    return {
      error:
        "Alege două conturi proprii în aceeași monedă. Nu se efectuează conversii valutare.",
    };
  const payload = { ...fields, amount_minor: amount, user_id: user.id };
  const result = id
    ? await client
        .from("transfers")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle()
    : await client
        .from("transfers")
        .insert({ ...payload, id: request_id })
        .select("id")
        .single();
  if (result.error?.code === "23505" && !id) {
    const existing = await client
      .from("transfers")
      .select("*")
      .eq("id", request_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (
      existing.error ||
      !existing.data ||
      Object.entries(payload).some(
        ([k, v]) => existing.data![k as keyof typeof existing.data] !== v,
      )
    )
      return {
        error:
          "Această cerere există cu alte date. Verifică lista de transferuri.",
      };
  } else if (result.error || !result.data)
    return {
      error:
        "Transferul nu a putut fi salvat. Alege două conturi proprii diferite și verifică suma.",
    };
  revalidatePath("/", "layout");
  return {
    success:
      "Transfer salvat. Soldurile conturilor au fost actualizate; veniturile și cheltuielile nu s-au modificat.",
    nextRequestId: randomUUID(),
  };
}
export async function deleteTransfer(
  _state: OperationState,
  form: FormData,
): Promise<OperationState> {
  if (!supabaseConfig())
    return { error: "Modul demo este doar pentru citire." };
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success || form.get("confirm") !== "yes")
    return { error: "Confirmă ștergerea transferului." };
  const { client, user } = await requireUser("/transfers");
  const r = await client
    .from("transfers")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (r.error || !r.data) return { error: "Transferul nu a putut fi șters." };
  revalidatePath("/", "layout");
  return { success: "Transfer șters. Soldurile au fost recalculate." };
}
