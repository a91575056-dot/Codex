import { Dashboard } from "@/components/finance-view";
import { ConnectedDashboard } from "@/components/connected-dashboard";
import { financeRepository } from "@/lib/finance";
import { supabaseConfig } from "@/lib/supabase/config";
import { getUserFinance } from "@/lib/supabase/repository";
export const instant = false;
export default async function Home() {
  if (!supabaseConfig())
    return <Dashboard data={await financeRepository.getSnapshot()} />;
  return <ConnectedDashboard data={await getUserFinance()} />;
}
