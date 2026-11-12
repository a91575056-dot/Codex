"use server";
import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { deviceSchema } from "@/lib/shortcut";
import { idSchema } from "@/lib/transaction-validation";
export type DeviceState = { error?: string; success?: string; token?: string };
export async function createShortcutDevice(
  _state: DeviceState,
  form: FormData,
): Promise<DeviceState> {
  if (!supabaseConfig())
    return { error: "Modul demo nu conectează telefoane." };
  const parsed = deviceSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { client, user } = await requireUser("/iphone");
  const p = parsed.data;
  const [cash, card] = await Promise.all([
    client
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", p.cash_account_id)
      .eq("currency", "MDL")
      .maybeSingle(),
    client
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", p.card_account_id)
      .eq("currency", "MDL")
      .maybeSingle(),
  ]);
  if (cash.error || card.error || !cash.data || !card.data)
    return { error: "Alege conturile tale în MDL pentru cash și card." };
  const token = "ft_sc_" + randomBytes(32).toString("hex");
  const token_hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await client
    .from("shortcut_devices")
    .insert({ ...p, user_id: user.id, token_hash })
    .select("id")
    .single();
  if (error || !data)
    return {
      error: "Telefonul nu a putut fi conectat. Încearcă din nou mai târziu.",
    };
  revalidatePath("/iphone");
  return {
    success:
      "Telefon conectat. Copiază acum tokenul în scurtătura ta; nu îl mai afișăm după închiderea acestui mesaj.",
    token,
  };
}
export async function revokeShortcutDevice(
  _state: DeviceState,
  form: FormData,
): Promise<DeviceState> {
  if (!supabaseConfig())
    return { error: "Modul demo nu modifică dispozitive." };
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success || form.get("confirm") !== "yes")
    return { error: "Confirmă revocarea telefonului." };
  const { client, user } = await requireUser("/iphone");
  const { data, error } = await client
    .from("shortcut_devices")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Telefonul nu a putut fi revocat." };
  revalidatePath("/iphone");
  return {
    success:
      "Acces revocat. Scurtătura de pe acel telefon nu mai poate trimite tranzacții. Tranzacțiile existente se păstrează.",
  };
}

export async function setShortcutIncome(
  _state: DeviceState,
  form: FormData,
): Promise<DeviceState> {
  if (!supabaseConfig())
    return { error: "Modul demo nu modifică dispozitive." };
  const id = idSchema.safeParse(form.get("id"));
  const enabled = form.get("enabled");
  if (!id.success || !["yes", "no"].includes(String(enabled)))
    return { error: "Alege telefonul și permisiunea." };
  const { client } = await requireUser("/iphone");
  const { error } = await client.rpc("configure_shortcut_income", {
    p_device_id: id.data,
    p_enabled: enabled === "yes",
  });
  if (error) return { error: "Permisiunea nu a putut fi actualizată." };
  revalidatePath("/iphone");
  revalidatePath("/settings");
  return {
    success:
      enabled === "yes"
        ? "Venituri activate. Categoriile Salariu, Bonus și Alte venituri sunt disponibile."
        : "Venituri dezactivate. Cheltuielile rămân disponibile.",
  };
}

export async function setShortcutLoans(
  _state: DeviceState,
  form: FormData,
): Promise<DeviceState> {
  if (!supabaseConfig())
    return { error: "Modul demo nu modifică dispozitive." };
  const id = idSchema.safeParse(form.get("id")),
    enabled = form.get("enabled");
  if (!id.success || !["yes", "no"].includes(String(enabled)))
    return { error: "Alege telefonul și permisiunea." };
  const { client } = await requireUser("/iphone");
  const { error } = await client.rpc("configure_shortcut_loans", {
    p_device_id: id.data,
    p_enabled: enabled === "yes",
  });
  if (error)
    return {
      error: "Permisiunea pentru împrumuturi nu a putut fi actualizată.",
    };
  revalidatePath("/iphone");
  return {
    success:
      enabled === "yes"
        ? "Împrumuturi activate pentru acest telefon."
        : "Împrumuturi dezactivate. Înregistrările existente se păstrează.",
  };
}
