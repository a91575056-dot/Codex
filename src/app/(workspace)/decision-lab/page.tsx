import { DecisionLab } from "@/components/decision-lab";
import { supabaseConfig } from "@/lib/supabase/config";
import { getUserFinance } from "@/lib/supabase/repository";
import { decisionBaseline, demoDecisionBaseline } from "@/lib/decision-lab";
export const instant = false;
export default async function DecisionPage() {
  const baseline = supabaseConfig()
    ? decisionBaseline((await getUserFinance()).transactions)
    : demoDecisionBaseline;
  return <DecisionLab baseline={baseline} />;
}
