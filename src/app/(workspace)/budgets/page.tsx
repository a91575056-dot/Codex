import Link from "next/link";
import { getEnvelopes } from "@/lib/supabase/envelope-repository";
import { envelopeBalances } from "@/lib/envelopes";
import { StartEnvelopes } from "@/components/envelope-forms";
import { EnvelopeCards } from "@/components/envelope-view";
import { transactionsInCurrency } from "@/lib/currency";
import { connection } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLedger } from "@/lib/supabase/repository";
import { getPlanning } from "@/lib/supabase/planning-repository";
import { budgetProgress, monthSchema, safeTotal } from "@/lib/planning";
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
  const [ledger, planning, envelopes] = await Promise.all([
    getLedger(),
    getPlanning(),
    getEnvelopes(),
  ]);
  const balances = envelopeBalances(
    envelopes,
    ledger.accounts,
    ledger.categories,
    ledger.transactions,
  );
  const budgets = planning.budgets.filter((b) =>
    b.month_start.startsWith(month),
  );
  const progress = budgets.map((b) =>
    budgetProgress(
      b,
      transactionsInCurrency(ledger.accounts, ledger.transactions),
    ),
  );
  const totalLimits = safeTotal(budgets.map((b) => b.limit_minor));
  const totalSpent = safeTotal(progress.map((p) => p.spent));
  const names = new Map(ledger.categories.map((c) => [c.id, c.name]));
  return (
    <>
      <Heading
        title="Bugete"
        description="Împarte veniturile automat și urmărește banii disponibili în fiecare buget."
      />
      <section id="automatic-budgets" className="mb-8">
        <h2 className="overview-heading">Bugete automate din venituri</h2>
        <p className="lab-help mb-4">
          Salariul, bonusurile și celelalte venituri noi se împart automat după
          procente. Banii necheltuiți se păstrează și se adună cu alocările
          următoare, inclusiv peste schimbarea lunii. Nu se mută bani între
          conturi și nu se cumpără investiții automat.
        </p>
        {envelopes.plans.map((plan) => (
          <section
            key={plan.id}
            className="mb-8"
            aria-label={`Bugete automate ${plan.currency}`}
          >
            <h3 className="overview-heading">
              {plan.currency} · {plan.enabled ? "Activ" : "În pauză"} · din{" "}
              {plan.start_on}
            </h3>
            <EnvelopeCards
              balances={balances.filter((b) => b.plan_id === plan.id)}
              accounts={ledger.accounts}
            />
            <Link className="text-link" href="/settings#budget-percentages">
              Modifică procentele pentru {plan.currency} în Setări
            </Link>
          </section>
        ))}
        <StartEnvelopes
          currencies={(["MDL", "EUR"] as const).filter(
            (c) => !envelopes.plans.some((p) => p.currency === c),
          )}
        />
        <p className="lab-help mt-4">
          Cheltuielile se scad din bugetul categoriei lor; categoriile fără
          regulă separată intră în Alte cheltuieli. Sumele rezervate pentru
          investiții și urgențe scad doar când înregistrezi o cheltuială în
          categoria respectivă. Aceste alocări nu se adaugă la soldul conturilor
          sau la valoarea portofoliului.
        </p>
      </section>
      <h2 className="overview-heading">Limite lunare manuale în MDL</h2>
      <p className="lab-help mb-4">
        Limitele de mai jos sunt opționale și independente de bugetele automate.
        Nu se alimentează din venit și nu se adună cu alocările de mai sus.
      </p>
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
      <div className="stats-grid report-metrics">
        {[
          { label: "Limite stabilite", value: totalLimits },
          { label: "Cheltuit în aceste categorii", value: totalSpent },
          { label: "Rămas în limite", value: totalLimits - totalSpent },
        ].map((c) => (
          <Card key={c.label} className="stat-card">
            <span className="stat-top">{c.label}</span>
            <strong className={`stat-value ${c.value < 0 ? "negative" : ""}`}>
              {money(c.value / 100)}
            </strong>
            <small className="text-muted-foreground">
              {month} · MDL · bugete manuale
            </small>
          </Card>
        ))}
      </div>
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
          const p = budgetProgress(
            b,
            transactionsInCurrency(ledger.accounts, ledger.transactions),
          );
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
                      background: p.over ? "var(--negative)" : "var(--chart-1)",
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
