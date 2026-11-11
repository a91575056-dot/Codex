import { connection } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLedger } from "@/lib/supabase/repository";
import { getPlanning } from "@/lib/supabase/planning-repository";
import { financialReport, reportRangeSchema } from "@/lib/reports";
import { portfolioSummary } from "@/lib/planning";
import { todayISO } from "@/lib/goals";
import { money } from "@/lib/finance";
import { Heading } from "@/components/finance-view";
import { DemoSection } from "@/components/demo-section";
import { ReportDownload } from "@/components/report-download";
import { PrintReport } from "@/components/print-report";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export const instant = false;
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  if (!supabaseConfig())
    return <DemoSection params={Promise.resolve({ section: "reports" })} />;
  await connection();
  const params = await searchParams;
  const defaults = { from: todayISO().slice(0, 7) + "-01", to: todayISO() };
  const parsed = reportRangeSchema.safeParse({
    from: params.from || defaults.from,
    to: params.to || defaults.to,
  });
  const range = parsed.success ? parsed.data : defaults;
  const [ledger, planning] = await Promise.all([getLedger(), getPlanning()]);
  const report = financialReport(
    ledger.transactions,
    ledger.categories,
    range.from,
    range.to,
  );
  const names = new Map(ledger.categories.map((c) => [c.id, c.name]));
  const portfolio = portfolioSummary(planning.holdings);
  return (
    <>
      <Heading
        title="Rapoarte"
        description="Situație financiară pentru intervalul ales, cu export CSV și tipărire."
      />
      <form method="get" className="filter-form mb-6 no-print">
        <label>
          De la
          <input name="from" type="date" defaultValue={range.from} required />
        </label>
        <label>
          Până la
          <input name="to" type="date" defaultValue={range.to} required />
        </label>
        <Button>Generează raportul</Button>
      </form>
      {!parsed.success && (
        <p className="form-error" role="alert">
          Interval invalid. Se afișează luna curentă.
        </p>
      )}
      <p className="lab-help">
        Perioadă inclusivă: {range.from} — {range.to}. {report.rows.length}{" "}
        tranzacții. Dacă selectezi date viitoare, raportul include și
        înregistrările respective.
      </p>
      <div className="stats-grid">
        {[
          { label: "Venituri în interval", value: report.income },
          { label: "Cheltuieli în interval", value: report.expenses },
          { label: "Flux net în interval", value: report.net },
        ].map((c) => (
          <Card key={c.label} className="stat-card">
            <span>{c.label}</span>
            <strong className="stat-value">{money(c.value / 100)}</strong>
          </Card>
        ))}
      </div>
      <div className="lab-actions mb-6 no-print">
        <ReportDownload
          demo={false}
          transactions={report.rows.map((t) => ({
            id: t.id,
            name: t.description,
            account: ledger.accounts.find((a) => a.id === t.account_id)?.name,
            category: names.get(t.category_id) || "Categorie",
            date: t.occurred_on,
            paymentMethod: t.payment_method,
            amount: ((t.kind === "income" ? 1 : -1) * t.amount_minor) / 100,
          }))}
        />
        <PrintReport />
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Distribuție pe categorii</CardTitle>
        </CardHeader>
        <CardContent>
          {!report.categories.length ? (
            <p className="empty-state">
              Nu există tranzacții în intervalul ales.
            </p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Categorie</th>
                    <th>Tip</th>
                    <th>Înregistrări</th>
                    <th>Total MDL</th>
                  </tr>
                </thead>
                <tbody>
                  {report.categories.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.kind === "income" ? "Venit" : "Cheltuială"}</td>
                      <td>{c.count}</td>
                      <td>{money(c.total / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Portofoliu: ultima evaluare introdusă</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Valoare: {money(portfolio.value / 100)} · cost:{" "}
            {money(portfolio.cost / 100)} · rezultat nerealizat:{" "}
            {money(portfolio.profit / 100)}.
          </p>
          <p className="lab-help mt-4">
            Acesta este un instantaneu al pozițiilor curente, cu date de
            evaluare manuale. Nu reprezintă valoarea istorică a portofoliului în
            intervalul raportului. Soldurile conturilor și contribuțiile pentru
            obiective nu se adună automat cu portofoliul, pentru a evita
            dublarea banilor.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
