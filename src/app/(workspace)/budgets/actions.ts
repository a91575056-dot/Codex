"use server";
import { z } from "zod";
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

export async function confirmInvestment(
  _state: EnvelopeState,
  form: FormData,
): Promise<EnvelopeState> {
  if (!supabaseConfig())
    return { error: "Modul demo nu înregistrează investiții." };
  const parsed = z
    .object({
      rule_id: z.uuid(),
      account_id: z.uuid(),
      request_id: z.uuid(),
      expected_available: z.coerce.number().int().min(1).max(1000000000000),
      confirm: z.literal("yes"),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "Alege contul și confirmă că ai investit suma afișată." };
  const { client } = await requireUser("/budgets");
  const p = parsed.data;
  const { error } = await client.rpc("confirm_envelope_investment", {
    p_rule_id: p.rule_id,
    p_account_id: p.account_id,
    p_request_id: p.request_id,
    p_expected_available: p.expected_available,
  });
  if (error)
    return {
      error:
        error.code === "40001"
          ? "Suma disponibilă s-a schimbat. Reîncarcă pagina și verifică înainte să confirmi din nou."
          : "Investiția nu a putut fi confirmată. Verifică tranzacțiile înainte de o nouă încercare.",
    };
  revalidatePath("/", "layout");
  return {
    success:
      "Investiție înregistrată. Bugetul se alimentează din nou la următoarea încasare.",
  };
}
