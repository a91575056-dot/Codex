import { connection } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLedger } from "@/lib/supabase/repository";
import { getPlanning } from "@/lib/supabase/planning-repository";
import { budgetProgress, monthSchema } from "@/lib/planning";
import { todayISO } from "@/lib/goals";
import { money } from "@/lib/finance";
import { budgetFields } from "@/lib/form-fields";
import { Heading } from "@/components/finance-view";
import { DemoSection } from "@/components/demo-section";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResourceForm, DeleteResource } from "@/components/resource-form";
export const instant = false;
export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  if (!supabaseConfig())
    return <DemoSection params={Promise.resolve({ section: "budgets" })} />;
  await connection();
  const params = await searchParams;
  const parsed = monthSchema.safeParse(params.month || todayISO().slice(0, 7));
  const month = parsed.success ? parsed.data : todayISO().slice(0, 7);
  const [ledger, planning] = await Promise.all([getLedger(), getPlanning()]);
  const budgets = planning.budgets.filter((b) =>
    b.month_start.startsWith(month),
  );
  const names = new Map(ledger.categories.map((c) => [c.id, c.name]));
  return (
    <>
      <Heading
        title="Bugete"
        description="Limite lunare pe categorii, calculate din cheltuielile înregistrate."
      />
      {!parsed.success && (
        <p role="alert" className="form-error">
          Luna selectată este invalidă. Se afișează luna curentă.
        </p>
      )}
      <form className="filter-form mb-6" method="get">
        <label>
          Lună
          <input
            name="month"
            type="month"
            defaultValue={month}
            min="1900-01"
            max="2100-12"
            required
          />
        </label>
        <Button>Afișează</Button>
      </form>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Adaugă un buget</CardTitle>
        </CardHeader>
        <CardContent>
          {!ledger.categories.some((c) => c.kind === "expense") ? (
            <p className="empty-state">
              Creează o categorie de cheltuieli în Setări.
            </p>
          ) : (
            <ResourceForm
              resource="budget"
              fields={budgetFields(ledger.categories, month)}
            />
          )}
        </CardContent>
      </Card>
      {!budgets.length && (
        <p className="empty-state" role="status">
          Nu ai bugete pentru {month}. Creează o limită pentru o categorie.
        </p>
      )}
      <div className="goal-grid">
        {budgets.map((b) => {
          const p = budgetProgress(b, ledger.transactions);
          return (
            <Card key={b.id}>
              <CardHeader className="section-heading">
                <CardTitle>{names.get(b.category_id) || "Categorie"}</CardTitle>
                <span className="category">
                  {p.over ? "Buget depășit" : "În limită"}
                </span>
              </CardHeader>
              <CardContent>
                <div className="goal-value">
                  <strong>{money(p.spent / 100)}</strong>
                  <span>din {money(b.limit_minor / 100)}</span>
                </div>
                <div
                  className="budget-track"
                  role="progressbar"
                  aria-label={`Buget ${names.get(b.category_id)}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, p.percent)}
                >
                  <div
                    style={{
                      width: `${Math.min(100, p.percent)}%`,
                      background: p.over ? "#a44236" : "#137d67",
                    }}
                  />
                </div>
                <p className="lab-help mt-4">
                  {p.percent}% consumat ·{" "}
                  {p.remaining >= 0 ? "Disponibil" : "Depășire"}:{" "}
                  {money(Math.abs(p.remaining) / 100)}. Sunt incluse
                  cheltuielile din {month}, până astăzi.
                </p>
                <details className="goal-detail">
                  <summary>Modifică limita</summary>
                  <ResourceForm
                    resource="budget"
                    id={b.id}
                    fields={budgetFields(ledger.categories, month, b)}
                  />
                </details>
                <DeleteResource resource="budget" id={b.id} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
