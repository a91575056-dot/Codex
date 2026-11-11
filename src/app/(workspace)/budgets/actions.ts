"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { envelopeConfigSchema } from "@/lib/envelopes";
export type EnvelopeState = { error?: string; success?: string };
export async function startEnvelopes(
  _state: EnvelopeState,
  form: FormData,
): Promise<EnvelopeState> {
  if (!supabaseConfig())
    return { error: "Modul demo nu activează bugete automate." };
  const currency = form.get("currency");
  if (
    !["MDL", "EUR"].includes(String(currency)) ||
    form.get("confirm") !== "yes"
  )
    return {
      error: "Alege moneda și confirmă activarea pentru veniturile noi.",
    };
  const { client } = await requireUser("/budgets");
  const { error } = await client.rpc("start_envelopes", {
    p_currency: String(currency),
  });
  if (error) return { error: "Bugetele automate nu au putut fi activate." };
  revalidatePath("/", "layout");
  return {
    success:
      "Bugete activate. Încasările noi se împart automat; veniturile vechi nu sunt redistribuite.",
  };
}
export async function configureEnvelopes(
  _state: EnvelopeState,
  form: FormData,
): Promise<EnvelopeState> {
  if (!supabaseConfig())
    return { error: "Modul demo nu modifică bugete automate." };
  const ids = form.getAll("rule_id");
  const input = {
    plan_id: form.get("plan_id"),
    enabled: form.get("enabled"),
    rules: ids.map((id) => ({ id, percent: form.get("percent_" + id) })),
  };
  const parsed = envelopeConfigSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { client } = await requireUser("/budgets");
  const p = parsed.data;
  const { error } = await client.rpc("configure_envelopes", {
    p_plan_id: p.plan_id,
    p_enabled: p.enabled,
    p_rules: p.rules.map((r) => ({ id: r.id, basis_points: r.percent })),
  });
  if (error)
    return {
      error:
        "Planul nu a putut fi salvat. Reîncarcă pagina și verifică procentele.",
    };
  revalidatePath("/", "layout");
  return {
    success:
      "Plan salvat. Noile procente se aplică doar încasărilor viitoare; alocările existente rămân neschimbate.",
  };
}
