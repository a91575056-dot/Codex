import { notFound } from "next/navigation";
import { DecisionLab, type LabGoal } from "@/components/decision-lab";
import { demoDecisionBaseline } from "@/lib/decision-lab";
import { demoGoals, demoContributions } from "@/lib/demo-goals";
import { goalProgress } from "@/lib/goals";
export const instant = false;
export default async function DemoDecisionPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>;
}) {
  const { goal: id } = await searchParams;
  let goal: LabGoal | undefined;
  if (id) {
    const found = demoGoals.find((g) => g.id === id);
    if (!found) notFound();
    goal = {
      id: found.id,
      name: found.name,
      targetMinor: found.target_minor,
      savedMinor: goalProgress(found, demoContributions, "2026-11-11").saved,
      dueOn: found.due_on,
    };
  }
  return (
    <DecisionLab
      key={id || "manual"}
      baseline={demoDecisionBaseline}
      goal={goal}
    />
  );
}
