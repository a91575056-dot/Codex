import { supabaseConfig } from "@/lib/supabase/config";
import { getPlanning } from "@/lib/supabase/planning-repository";
import { assetClasses, portfolioSummary } from "@/lib/planning";
import { holdingFields } from "@/lib/form-fields";
import { money } from "@/lib/finance";
import { Heading } from "@/components/finance-view";
import { DemoSection } from "@/components/demo-section";
import { AllocationChart } from "@/components/charts";
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
        description="Portofoliu manual în RON. Înregistrările urmăresc activele; nu execută ordine."
      />
      <div className="demo-banner">
        <p>
          Prețurile sunt introduse de tine și nu se actualizează automat.
          Valorile pot proveni din date de evaluare diferite.
        </p>
      </div>
      <div className="stats-grid">
        <Card className="stat-card featured">
          <span>Valoare portofoliu</span>
          <strong className="stat-value">{money(summary.value / 100)}</strong>
        </Card>
        <Card className="stat-card">
          <span>Costul pozițiilor</span>
          <strong className="stat-value">{money(summary.cost / 100)}</strong>
        </Card>
        <Card className="stat-card">
          <span>Rezultat nerealizat</span>
          <strong className="stat-value">{money(summary.profit / 100)}</strong>
          <small>
            {summary.percent === null
              ? "Fără bază de cost"
              : `${summary.percent.toFixed(2)}% față de cost`}
          </small>
        </Card>
      </div>
      <div className="bottom-grid">
        <Card>
          <CardHeader>
            <CardTitle>Înregistrează un activ</CardTitle>
          </CardHeader>
          <CardContent>
            <ResourceForm resource="holding" fields={holdingFields()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alocare după valoarea introdusă</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.value > 0 ? (
              <AllocationChart data={summary.allocation} />
            ) : (
              <p className="empty-state">
                Adaugă active cu o valoare pozitivă pentru a vedea alocarea.
              </p>
            )}
            <p className="lab-help">
              Rezultatul este diferența dintre valoarea introdusă și costul
              pozițiilor curente. Nu include dividende, comisioane, taxe sau
              operațiuni închise. Valorile nu se adaugă la soldul conturilor de
              numerar.
            </p>
          </CardContent>
        </Card>
      </div>
      {!holdings.length && (
        <p className="empty-state" role="status">
          Portofoliul este gol. Adaugă primul activ manual.
        </p>
      )}
      <div className="goal-grid">
        {summary.positions.map((h) => (
          <Card key={h.id}>
            <CardHeader className="section-heading">
              <CardTitle>
                {h.name}
                {h.symbol ? ` · ${h.symbol}` : ""}
              </CardTitle>
              <span className="category">
                {assetClasses[h.asset_class].label}
              </span>
            </CardHeader>
            <CardContent>
              <div className="goal-value">
                <strong>{money(h.value / 100)}</strong>
                <span>
                  {new Intl.NumberFormat("ro-RO", {
                    maximumFractionDigits: 6,
                  }).format(h.quantity_micros / 1000000)}{" "}
                  unități
                </span>
              </div>
              <p className="lab-help">
                Cost: {money(h.cost / 100)} · Rezultat nerealizat:{" "}
                {money(h.profit / 100)} · Evaluare manuală din {h.price_on}.
              </p>
              <details className="goal-detail">
                <summary>Actualizează poziția sau prețul</summary>
                <ResourceForm
                  resource="holding"
                  id={h.id}
                  fields={holdingFields(h)}
                />
              </details>
              <DeleteResource resource="holding" id={h.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
