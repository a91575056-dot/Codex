import type { Loan } from "@/lib/loans";
import type { AccountRow } from "@/lib/supabase/database.types";
import { LoanSection } from "@/components/loan-section";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { allRows } from "@/lib/supabase/planning-repository";
import { type Receivable, receivableTotals } from "@/lib/receivables";
import { money } from "@/lib/finance";
import { Heading, DemoNotice } from "@/components/finance-view";
import { DebtForm, DebtStatus } from "@/components/debt-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export const instant = false;
export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  if (!supabaseConfig())
    return (
      <>
        <Heading
          title="Datorii și împrumuturi"
          description="Datorii în MDL și EUR, cu listă activă și istoric de achitări."
        />
        <DemoNotice />
        <p>
          În contul personal poți nota persoana, suma și moneda, apoi marca
          datoria drept achitată. Demo nu salvează date.
        </p>
      </>
    );
  const { client, user } = await requireUser("/debts");
  const [rows, loans, accounts] = await Promise.all([
    allRows<Receivable>((f, t) =>
      client
        .from("receivables")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_on", { ascending: false })
        .order("id")
        .range(f, t),
    ),
    allRows<Loan>((f, t) =>
      client
        .from("loans")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_on", { ascending: false })
        .order("id")
        .range(f, t),
    ),
    allRows<AccountRow>((f, t) =>
      client
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("name")
        .order("id")
        .range(f, t),
    ),
  ]);
  const history = (await searchParams).view === "history";
  const visible = rows.filter((r) =>
    history ? !!r.settled_on : !r.settled_on,
  );
  const totals = receivableTotals(rows);
  return (
    <>
      <Heading
        title="Datorii și împrumuturi"
        description="Împrumuturi date și primite, rambursări și datorii notate separat. MDL și EUR rămân separate."
      />
      <nav className="lab-actions mb-6" aria-label="Lista datoriilor">
        <Link href="/debts" aria-current={!history ? "page" : undefined}>
          Datorii active (
          {[...rows, ...loans].filter((r) => !r.settled_on).length})
        </Link>
        <Link
          href="/debts?view=history"
          aria-current={history ? "page" : undefined}
        >
          Istoric achitate (
          {[...rows, ...loans].filter((r) => r.settled_on).length})
        </Link>
      </nav>
      <LoanSection history={history} loans={loans} accounts={accounts} />
      <h2 className="overview-heading">Datorii notate fără mișcare de cont</h2>
      <div className="goal-grid mb-6">
        {(["MDL", "EUR"] as const).map((c) => (
          <Card key={c}>
            <CardHeader>
              <CardTitle>De primit în {c}</CardTitle>
            </CardHeader>
            <CardContent>
              <strong className="stat-value">
                {money(totals[c] / 100, c)}
              </strong>
              <p>Doar datorii active</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="lab-help mb-6">
        Datoriile din secțiunea de mai jos sunt o evidență separată. Adăugarea
        sau bifarea „Achitat” nu schimbă soldurile conturilor și nu
        înregistrează automat un venit.
      </p>
      {!history && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Adaugă o datorie</CardTitle>
          </CardHeader>
          <CardContent>
            <DebtForm requestId={randomUUID()} />
          </CardContent>
        </Card>
      )}

      <h2 className="overview-heading">
        {history ? "Datorii achitate" : "Datorii active"}
      </h2>
      {!visible.length && (
        <p className="empty-state">
          {history
            ? "Nu ai datorii marcate ca achitate."
            : "Nicio datorie activă."}
        </p>
      )}
      <div className="goal-grid">
        {visible.map((r) => (
          <Card key={r.id}>
            <CardHeader className="category-card-heading">
              <CardTitle>{r.person}</CardTitle>
              <span className="category">
                {r.settled_on ? "Achitat" : "De primit"}
              </span>
            </CardHeader>
            <CardContent>
              <strong className="stat-value">
                {money(r.amount_minor / 100, r.currency)}
              </strong>
              <p>
                Din {r.occurred_on}
                {r.settled_on ? ` · Achitat la ${r.settled_on}` : ""}
              </p>
              <p className="debt-note">{r.note}</p>
              {!r.settled_on && (
                <details className="goal-detail">
                  <summary>Editează datoria</summary>
                  <DebtForm debt={r} requestId={r.id} />
                </details>
              )}
              <DebtStatus id={r.id} settled={!!r.settled_on} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
