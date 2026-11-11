"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import {
  goalSchema,
  contributionSchema,
  scenarioSchema,
  goalProgress,
} from "@/lib/goals";
import type { ScenarioSnapshot } from "@/lib/goals";
import { getGoals } from "@/lib/supabase/goals-repository";
import { getUserFinance } from "@/lib/supabase/repository";
import { decisionBaseline, simulateDecision } from "@/lib/decision-lab";
import { idSchema } from "@/lib/transaction-validation";
export type GoalState = { error?: string; success?: string };
export async function saveGoal(
  _state: GoalState,
  form: FormData,
): Promise<GoalState> {
  if (!supabaseConfig())
    return { error: "Modul demo este doar pentru citire." };
  const p = goalSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { client, user } = await requireUser();
  const { id, target, ...fields } = p.data;
  const data = { ...fields, target_minor: target, user_id: user.id };
  const r = id
    ? await client
        .from("savings_goals")
        .update(data)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle()
    : await client.from("savings_goals").insert(data).select("id").single();
  if (r.error || !r.data) return { error: "Obiectivul nu a putut fi salvat." };
  revalidatePath("/", "layout");
  return { success: "Obiectivul a fost salvat." };
}
export async function addContribution(
  _state: GoalState,
  form: FormData,
): Promise<GoalState> {
  if (!supabaseConfig())
    return { error: "Modul demo este doar pentru citire." };
  const p = contributionSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const { client, user } = await requireUser();
  const { amount, ...fields } = p.data;
  const { data, error } = await client
    .from("goal_contributions")
    .insert({ ...fields, amount_minor: amount, user_id: user.id })
    .select("id")
    .single();
  if (error || !data)
    return {
      error:
        "Contribuția nu a putut fi adăugată. Verifică obiectivul și conexiunea.",
    };
  revalidatePath("/", "layout");
  return {
    success:
      "Contribuția a fost înregistrată. Soldul tranzacțiilor nu a fost modificat.",
  };
}
export async function removeGoalRecord(
  type: "goal" | "contribution" | "scenario",
  _state: GoalState,
  form: FormData,
): Promise<GoalState> {
  if (!supabaseConfig())
    return { error: "Modul demo este doar pentru citire." };
  const p = idSchema.safeParse(form.get("id"));
  if (!p.success || form.get("confirm") !== "yes")
    return { error: "Confirmă ștergerea." };
  const { client, user } = await requireUser();
  const table =
    type === "goal"
      ? "savings_goals"
      : type === "contribution"
        ? "goal_contributions"
        : "goal_scenarios";
  const { data, error } = await client
    .from(table)
    .delete()
    .eq("id", p.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Înregistrarea nu a putut fi ștearsă." };
  revalidatePath("/", "layout");
  return { success: "Înregistrarea a fost ștearsă." };
}
export async function saveGoalScenario(
  _state: GoalState,
  form: FormData,
): Promise<GoalState> {
  if (!supabaseConfig()) return { error: "Scenariile demo nu sunt salvate." };
  let cuts: unknown;
  try {
    const raw = form.get("cuts");
    if (typeof raw !== "string" || raw.length > 65536) throw Error();
    cuts = JSON.parse(raw);
  } catch {
    return { error: "Reducerile scenariului sunt invalide." };
  }
  const p = scenarioSchema.safeParse({
    goal_id: form.get("goal_id"),
    name: form.get("name"),
    buffer_minor: Number(form.get("buffer_minor")),
    shock_percent: Number(form.get("shock_percent")),
    cuts,
  });
  if (!p.success) return { error: "Verifică numele și ipotezele scenariului." };
  const { client, user } = await requireUser();
  const ledger = await getGoals();
  const goal = ledger.goals.find((g) => g.id === p.data.goal_id);
  if (!goal) return { error: "Obiectivul nu este disponibil." };
  const progress = goalProgress(goal, ledger.contributions);
  if (
    Number(form.get("expected_target")) !== goal.target_minor ||
    Number(form.get("expected_saved")) !== progress.saved
  )
    return {
      error:
        "Obiectivul sau contribuțiile s-au schimbat. Reîncarcă pagina înainte de salvare.",
    };
  const baseline = decisionBaseline((await getUserFinance()).transactions);
  if (!baseline.transactionCount)
    return {
      error:
        "Adaugă tranzacții din ultimele trei luni încheiate înainte de a salva un plan bazat pe istoric.",
    };
  const inputs = {
    targetMinor: goal.target_minor,
    savedMinor: progress.saved,
    bufferMinor: p.data.buffer_minor,
    shockPercent: p.data.shock_percent,
    cuts: p.data.cuts,
  };
  const result = simulateDecision(baseline, inputs);
  const snapshot: ScenarioSnapshot = {
    version: 1,
    baseline,
    inputs,
    goalName: goal.name,
    dueOn: goal.due_on,
    planMonths: result.planMonths,
  };
  const { error } = await client.from("goal_scenarios").insert({
    goal_id: goal.id,
    user_id: user.id,
    name: p.data.name,
    target_minor: goal.target_minor,
    saved_minor: progress.saved,
    monthly_minor: Math.max(0, result.planMonthly),
    snapshot,
  });
  if (error) return { error: "Scenariul nu a putut fi salvat." };
  revalidatePath("/", "layout");
  return {
    success:
      "Scenariul a fost salvat. Îl poți compara cu progresul real în Obiective.",
  };
}
