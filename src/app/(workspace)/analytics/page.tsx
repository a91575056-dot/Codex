import { ExpenseChart, SavingsChart } from "@/components/charts";
import { ChartCard } from "@/components/financial-ui";
import { transactionsInCurrency } from "@/lib/currency";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLedger, getUserFinance } from "@/lib/supabase/repository";
import { financialReport } from "@/lib/reports";
import { todayISO } from "@/lib/goals";
import { money } from "@/lib/finance";
import { Heading, Charts } from "@/components/finance-view";
import { ConnectedStats } from "@/components/connected-dashboard";
import { DemoSection } from "@/components/demo-section";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export const instant = false;
export default async function AnalyticsPage() {
  if (!supabaseConfig())
    return <DemoSection params={Promise.resolve({ section: "analytics" })} />;
  const [data, ledger] = await Promise.all([getUserFinance(), getLedger()]);
  const report = financialReport(
    transactionsInCurrency(ledger.accounts, ledger.transactions),
    ledger.categories,
    todayISO().slice(0, 7) + "-01",
    todayISO(),
  );
  return (
    <>
      <Heading
        title="Analize"
        description="Indicatori în MDL, calculați până astăzi. Conturile EUR sunt separate; raportul în EUR este disponibil în Rapoarte."
      />
      <ConnectedStats data={data} />
      <div className="dashboard-charts">
        <Charts data={data} only="cash" demo={false} />
        <ChartCard
          title="Cheltuieli pe categorii"
          description="Luna curentă · MDL"
        >
          <ExpenseChart data={data.expenseDistribution || []} />
        </ChartCard>
      </div>
      <ChartCard
        title="Evoluția surplusului lunar"
        description="Venituri minus cheltuieli; nu reprezintă economii transferate"
      >
        <SavingsChart data={data.cashFlow} />
      </ChartCard>
      <div className="bottom-grid mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Flux net al lunii</CardTitle>
          </CardHeader>
          <CardContent>
            <strong className="stat-value">{money(report.net / 100)}</strong>
            <p className="lab-help">
              Venituri minus cheltuieli.{" "}
              {report.rate === null
                ? "Nu se calculează o rată fără venituri pozitive."
                : `Rată a surplusului: ${report.rate}% din veniturile lunii.`}{" "}
              Indicatorul nu dovedește că surplusul a fost deja economisit.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Unde se duc cheltuielile?</CardTitle>
          </CardHeader>
          <CardContent>
            {report.categories.filter((c) => c.kind === "expense").length ===
            0 ? (
              <p className="empty-state">
                Nu ai cheltuieli înregistrate în luna curentă.
              </p>
            ) : (
              report.categories
                .filter((c) => c.kind === "expense")
                .map((c) => (
                  <div className="budget-title py-3" key={c.id}>
                    <strong>{c.name}</strong>
                    <span>{money(c.total / 100)}</span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
      {data.portfolio > 0 && (
        <Charts data={data} only="allocation" demo={false} />
      )}
    </>
  );
}
