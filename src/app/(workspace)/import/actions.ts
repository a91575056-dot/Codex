"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { previewCSV, importRowsSchema, type ImportRow } from "@/lib/csv-import";
import { allRows } from "@/lib/supabase/planning-repository";
import type { AccountRow, CategoryRow } from "@/lib/supabase/database.types";
export type PreviewState = {
  error?: string;
  rows?: ImportRow[];
  errors?: string[];
};
export async function previewImport(
  _state: PreviewState,
  form: FormData,
): Promise<PreviewState> {
  if (!supabaseConfig()) return { error: "Modul demo nu importă date." };
  const { client, user } = await requireUser("/import");
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || file.size > 512 * 1024)
    return { error: "Alege un fișier CSV de maximum 512 KiB." };
  const [accounts, categories] = await Promise.all([
    allRows<AccountRow>((f, t) =>
      client
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("id")
        .range(f, t),
    ),
    allRows<CategoryRow>((f, t) =>
      client
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("id")
        .range(f, t),
    ),
  ]);
  try {
    return previewCSV(
      await file.text(),
      accounts,
      categories,
      String(form.get("account_id") || ""),
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Fișier invalid." };
  }
}
export async function commitImport(
  _state: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  if (!supabaseConfig()) return { error: "Modul demo nu importă date." };
  if (form.get("confirm") !== "yes")
    return { error: "Confirmă importul tranzacțiilor în contul personal." };
  const { client } = await requireUser("/import");
  const raw = form.get("rows");
  if (typeof raw !== "string" || raw.length > 512 * 1024)
    return { error: "Import invalid sau prea mare." };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { error: "Datele importului sunt invalide." };
  }
  const p = importRowsSchema.safeParse(value);
  if (!p.success)
    return { error: "Verifică rândurile, conturile și sumele din import." };
  const r = await client.rpc("import_transactions", { p_rows: p.data });
  if (r.error || !r.data)
    return {
      error:
        "Importul a fost anulat integral. Verifică dacă toate conturile și categoriile îți aparțin și corespund tipului tranzacției.",
    };
  revalidatePath("/", "layout");
  return {
    success: `Import finalizat: ${r.data.inserted} adăugate, ${r.data.skipped} duplicate ignorate.`,
  };
}
