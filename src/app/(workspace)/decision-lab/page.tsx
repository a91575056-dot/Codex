import { notFound } from "next/navigation";
import { DecisionLab, type LabGoal } from "@/components/decision-lab";
import { supabaseConfig } from "@/lib/supabase/config";
import { getUserFinance } from "@/lib/supabase/repository";
import { getGoals } from "@/lib/supabase/goals-repository";
import { decisionBaseline, demoDecisionBaseline } from "@/lib/decision-lab";
import { demoGoals, demoContributions } from "@/lib/demo-goals";
import { goalProgress } from "@/lib/goals";
import { idSchema } from "@/lib/transaction-validation";
export const instant = false;
export default async function DecisionPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>;
}) {
  const params = await searchParams;
  const connected = !!supabaseConfig();
  const baseline = connected
    ? decisionBaseline((await getUserFinance()).transactions)
    : demoDecisionBaseline;
  let goal: LabGoal | undefined;
  if (params.goal) {
    if (!idSchema.safeParse(params.goal).success) notFound();
    const ledger = connected
      ? await getGoals()
      : { goals: demoGoals, contributions: demoContributions };
    const found = ledger.goals.find((g) => g.id === params.goal);
    if (!found) notFound();
    if (found.currency !== "MDL")
      return (
        <section>
          <h1>Obiectiv în EUR</h1>
          <p>
            Economiile în EUR sunt separate de veniturile și cheltuielile în
            MDL. Simularea necesită un curs de schimb și nu este disponibilă
            pentru acest obiectiv.
          </p>
          <a href="/goals">Înapoi la obiective</a>
        </section>
      );
    goal = {
      id: found.id,
      name: found.name,
      targetMinor: found.target_minor,
      savedMinor: goalProgress(
        found,
        ledger.contributions,
        connected ? undefined : "2026-11-11",
      ).saved,
      dueOn: found.due_on,
    };
  }
  return (
    <DecisionLab key={goal?.id || "manual"} baseline={baseline} goal={goal} />
  );
}
