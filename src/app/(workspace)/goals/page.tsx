import { GoalsView } from "@/components/goals-view";
import { supabaseConfig } from "@/lib/supabase/config";
import { getGoals } from "@/lib/supabase/goals-repository";
import { demoGoals, demoContributions, demoScenarios } from "@/lib/demo-goals";
export const instant = false;
export default async function GoalsPage() {
  if (!supabaseConfig())
    return (
      <GoalsView
        goals={demoGoals}
        contributions={demoContributions}
        scenarios={demoScenarios}
        demo
      />
    );
  return <GoalsView {...await getGoals()} />;
}
