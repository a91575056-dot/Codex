"use server";
import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { z } from "zod";
export type WidgetState = { error?: string; success?: string; token?: string };
export async function createWidget(
  _state: WidgetState,
  form: FormData,
): Promise<WidgetState> {
  if (!supabaseConfig())
    return { error: "Conectează-te la un cont personal pentru widget." };
  const name = z
    .string()
    .trim()
    .min(1, "Scrie numele widgetului.")
    .max(80)
    .safeParse(form.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const { client, user } = await requireUser("/iphone");
  const token = "ft_wg_" + randomBytes(32).toString("hex");
  const { error } = await client
    .from("widget_devices")
    .insert({
      user_id: user.id,
      name: name.data,
      token_hash: createHash("sha256").update(token).digest("hex"),
    });
  if (error)
    return { error: "Widgetul nu a putut fi conectat. Încearcă din nou." };
  revalidatePath("/iphone");
  return {
    success:
      "Cheia este gata. Copiaz-o acum în Scriptable; după închiderea paginii nu o mai afișăm.",
    token,
  };
}
export async function revokeWidget(
  _state: WidgetState,
  form: FormData,
): Promise<WidgetState> {
  if (!supabaseConfig()) return { error: "Modul demo nu modifică widgeturi." };
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success || form.get("confirm") !== "yes")
    return { error: "Confirmă deconectarea widgetului." };
  const { client, user } = await requireUser("/iphone");
  const { data, error } = await client
    .from("widget_devices")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Widgetul nu a putut fi deconectat." };
  revalidatePath("/iphone");
  return { success: "Widget deconectat. Cheia nu mai poate citi bugetele." };
}
