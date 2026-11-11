import { GoalsView } from "@/components/goals-view";
import { demoGoals, demoContributions, demoScenarios } from "@/lib/demo-goals";
export default function DemoGoals() {
  return (
    <GoalsView
      goals={demoGoals}
      contributions={demoContributions}
      scenarios={demoScenarios}
      demo
    />
  );
}
