import { Dashboard } from "@/components/finance-view";
import { financeRepository } from "@/lib/finance";
export default async function Home() {
  return <Dashboard data={await financeRepository.getSnapshot()} />;
}
