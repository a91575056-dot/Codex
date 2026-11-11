import { randomUUID } from "node:crypto";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLedger } from "@/lib/supabase/repository";
import {
  getRecurringRules,
  getRecurringOccurrences,
} from "@/lib/supabase/operations-repository";
import { frequencyLabels } from "@/lib/operations";
import { todayISO } from "@/lib/goals";
import { money } from "@/lib/finance";
import { Heading, DemoNotice } from "@/components/finance-view";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  RecurringForm,
  PostOccurrence,
  DeleteOperation,
} from "@/components/operation-forms";
export const instant = false;
export default async function RecurringPage() {
  if (!supabaseConfig())
    return (
      <>
        <Heading
          title="Venituri și plăți recurente"
          description="Organizează salariul, chiria și abonamentele."
        />
        <DemoNotice />
        <p>
          În contul personal poți crea reguli și confirma scadențe. Nicio plată
          nu este efectuată automat.
        </p>
      </>
    );
  const [ledger, rules, occurrences] = await Promise.all([
    getLedger("/recurring"),
    getRecurringRules(),
    getRecurringOccurrences(),
  ]);
  const requestId = randomUUID();
  const today = todayISO();
  const accounts = new Map(ledger.accounts.map((a) => [a.id, a.name]));
  return (
    <>
      <Heading
        title="Venituri și plăți recurente"
        description="Planifică scadențele și confirmă încasarea/plata. Confirmarea adaugă o tranzacție; regula singură nu modifică soldul."
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>O regulă nouă</CardTitle>
        </CardHeader>
        <CardContent>
          <RecurringForm
            accounts={ledger.accounts}
            categories={ledger.categories}
            requestId={requestId}
          />
        </CardContent>
      </Card>
      <h2 className="overview-heading">Calendarul scadențelor</h2>
      {!rules.length && (
        <p className="empty-state">
          Nu ai reguli încă. Adaugă, de exemplu, salariul lunar sau un
          abonament.
        </p>
      )}
      <div className="goal-grid">
        {rules.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle>{r.description}</CardTitle>
            </CardHeader>
            <CardContent>
              <strong className={r.kind === "income" ? "positive" : ""}>
                {r.kind === "income" ? "+" : "−"}
                {money(
                  r.amount_minor / 100,
                  ledger.accounts.find((a) => a.id === r.account_id)?.currency,
                )}
              </strong>
              <p>
                {accounts.get(r.account_id)} · {frequencyLabels[r.frequency]}
              </p>
              <p>
                Scadență: <strong>{r.next_due_on}</strong> ·{" "}
                {!r.active
                  ? "În pauză"
                  : r.next_due_on < today
                    ? "Întârziată"
                    : r.next_due_on === today
                      ? "Astăzi"
                      : "Planificată"}
              </p>
              <p>
                {occurrences.filter((o) => o.rule_id === r.id).length} scadențe
                înregistrate
              </p>
              <details className="goal-detail">
                <summary>Confirmă scadența</summary>
                <PostOccurrence rule={r} />
              </details>
              <details className="goal-detail">
                <summary>Editează sau pune în pauză</summary>
                <RecurringForm
                  key={r.updated_at}
                  accounts={ledger.accounts}
                  categories={ledger.categories}
                  requestId={requestId}
                  rule={r}
                />
              </details>
              <details className="goal-detail">
                <summary>Istoric</summary>
                {occurrences
                  .filter((o) => o.rule_id === r.id)
                  .map((o) => (
                    <p key={o.id}>
                      Scadența {o.due_on} · tranzacție înregistrată
                    </p>
                  ))}
              </details>
              <DeleteOperation type="recurring" id={r.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
