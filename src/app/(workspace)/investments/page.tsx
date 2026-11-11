import { supabaseConfig } from "@/lib/supabase/config";
import { getPlanning } from "@/lib/supabase/planning-repository";
import { assetClasses, portfolioSummary } from "@/lib/planning";
import { holdingFields } from "@/lib/form-fields";
import { money } from "@/lib/finance";
import { Heading } from "@/components/finance-view";
import { DemoSection } from "@/components/demo-section";
import { AllocationChart } from "@/components/charts";
import {
  FinancialAmount,
  PerformanceBadge,
  EmptyState,
} from "@/components/financial-ui";
import { Modal } from "@/components/ui/modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ResourceForm, DeleteResource } from "@/components/resource-form";
export const instant = false;
export default async function InvestmentsPage() {
  if (!supabaseConfig())
    return <DemoSection params={Promise.resolve({ section: "investments" })} />;
  const { holdings } = await getPlanning();
  const summary = portfolioSummary(holdings);
  return (
    <>
      <Heading
        title="Investiții"
        description="Poziții, alocare și performanță nerealizată. Valori în MDL, actualizate manual."
      />
      <div className="demo-banner">
        <span className="status-badge">Evaluare manuală</span>
        <p>
          Prețurile nu sunt în timp real. Fiecare poziție păstrează data
          evaluării introduse de tine.
        </p>
      </div>
      <div className="stats-grid">
        <Card className="stat-card featured">
          <span className="stat-top">Valoare portofoliu</span>
          <strong className="stat-value">{money(summary.value / 100)}</strong>
          <small className="text-muted-foreground">
            Valoarea pozițiilor curente
          </small>
        </Card>
        <Card className="stat-card">
          <span className="stat-top">Capital în poziții</span>
          <strong className="stat-value">{money(summary.cost / 100)}</strong>
          <small className="text-muted-foreground">
            Costul cumulat al activelor deținute
          </small>
        </Card>
        <Card className="stat-card">
          <span className="stat-top">Rezultat nerealizat</span>
          <strong className="stat-value">
            <FinancialAmount value={summary.profit / 100} signed />
          </strong>
          <PerformanceBadge
            value={summary.profit / 100}
            percent={summary.percent}
          />
        </Card>
        <Card className="stat-card">
          <span className="stat-top">Rezultat realizat</span>
          <strong className="stat-value">—</strong>
          <small className="text-muted-foreground">
            Nu există un istoric de poziții închise.
          </small>
        </Card>
      </div>
      <div className="portfolio-layout">
        <Card>
          <CardHeader className="section-heading">
            <div>
              <CardTitle>Pozițiile tale</CardTitle>
              <p>{holdings.length} active · acțiuni, ETF-uri și criptoactive</p>
            </div>
          </CardHeader>
          <CardContent>
            {!holdings.length ? (
              <EmptyState
                title="Primul pas în portofoliul tău"
                description="Adaugă un activ, cantitatea deținută, costul mediu și prețul evaluării manuale."
              />
            ) : (
              <div className="table-scroll">
                <table className="holdings-table">
                  <thead>
                    <tr>
                      <th>Activ</th>
                      <th>Cantitate / cost unitar</th>
                      <th className="text-right">Valoare</th>
                      <th className="text-right">Rezultat</th>
                      <th>Evaluare / acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.positions.map((h) => (
                      <tr key={h.id} className="holding-row">
                        <td>
                          <h2>{h.name}</h2>
                          <p className="table-meta">
                            {h.symbol || "Fără simbol"}
                          </p>
                          <span className="asset-badge">
                            {assetClasses[h.asset_class].label}
                          </span>
                        </td>
                        <td>
                          {new Intl.NumberFormat("ro-RO", {
                            maximumFractionDigits: 6,
                          }).format(h.quantity_micros / 1000000)}{" "}
                          unități
                          <p className="table-meta">
                            {money(h.cost_price_minor / 100)} / unitate
                          </p>
                        </td>
                        <td className="amount">
                          <FinancialAmount value={h.value / 100} />
                          <p className="table-meta">
                            Preț: {money(h.current_price_minor / 100)}
                          </p>
                        </td>
                        <td className="amount">
                          <FinancialAmount value={h.profit / 100} signed />
                          <p>
                            <PerformanceBadge
                              value={h.profit / 100}
                              percent={h.percent}
                            />
                          </p>
                        </td>
                        <td>
                          <time dateTime={h.price_on}>{h.price_on}</time>
                          <div className="row-actions">
                            <Modal
                              trigger="Actualizează poziția sau prețul"
                              title={h.name}
                              description={`Evaluare manuală din ${h.price_on}. Valorile curente nu reprezintă un istoric de tranzacționare.`}
                            >
                              <ResourceForm
                                resource="holding"
                                id={h.id}
                                fields={holdingFields(h)}
                              />
                              <DeleteResource resource="holding" id={h.id} />
                            </Modal>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="form-grid">
          <Card id="new-investment">
            <CardHeader>
              <CardTitle>Înregistrează un activ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="lab-help">
                Adaugă o poziție deținută deja. Înregistrarea nu execută o
                cumpărare sau o plată.
              </p>
              <Modal
                trigger="Adaugă investiție"
                title="Adaugă o poziție în portofoliu"
                description="Costul, cantitatea și prețul sunt introduse manual."
              >
                <ResourceForm resource="holding" fields={holdingFields()} />
              </Modal>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Alocarea portofoliului</CardTitle>
            </CardHeader>
            <CardContent>
              <AllocationChart data={summary.allocation} />
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="demo-note mt-6">
        <strong>Ce include performanța afișată</strong>
        <p>
          Rezultatul nerealizat reprezintă valoarea introdusă minus costul
          pozițiilor curente. Nu include dividende, comisioane, taxe sau
          operațiuni închise. Registrul curent nu stochează cumpărări, vânzări
          sau serii istorice de prețuri; acestea nu sunt deduse din modificarea
          unei poziții.
        </p>
      </div>
    </>
  );
}
