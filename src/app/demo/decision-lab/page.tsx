import { DecisionLab } from "@/components/decision-lab";
import { demoDecisionBaseline } from "@/lib/decision-lab";
export default function DemoDecisionPage() {
  return <DecisionLab baseline={demoDecisionBaseline} />;
}
