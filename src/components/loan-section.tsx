import { randomUUID } from "node:crypto";
import type { AccountRow } from "@/lib/supabase/database.types";
import type { Loan } from "@/lib/loans";
import { loanTotals, loanLabels } from "@/lib/loans";
import { money } from "@/lib/finance";
import { LoanForm, LoanSettlement } from "./loan-form";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Modal } from "./ui/modal";
export function LoanSection({
  history,
  loans,
  accounts,
}: {
  history: boolean;
  loans: Loan[];
  accounts: AccountRow[];
}) {
  const rows = loans.filter((l) => (history ? !!l.settled_on : !l.settled_on));
  const names = new Map(accounts.map((a) => [a.id, a.name]));
  return (
    <section aria-label="Împrumuturi date și primite" className="mb-8">
      <h2 className="overview-heading">Împrumuturi date și primite</h2>
      <p className="lab-help">
        Înregistrările de aici schimbă soldul contului. Sunt separate de
        salariu, consum și bugete. Rambursarea integrală inversează mișcarea de
        numerar, o singură dată.
      </p>
      <div className="goal-grid mb-6">
        {(["MDL", "EUR"] as const)
          .filter((c) => accounts.some((a) => a.currency === c))
          .map((c) => {
            const totals = loanTotals(loans, c);
            return (
              <Card key={c}>
                <CardHeader>
                  <CardTitle>Împrumuturi în {c}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    De primit:{" "}
                    <strong>{money(totals.receivable / 100, c)}</strong>
                  </p>
                  <p>
                    De restituit:{" "}
                    <strong>{money(totals.payable / 100, c)}</strong>
                  </p>
                </CardContent>
              </Card>
            );
          })}
      </div>
      {!history && (
        <div className="mb-6">
          <Modal trigger="Adaugă împrumut" title="Înregistrează un împrumut">
            <LoanForm requestId={randomUUID()} accounts={accounts} />
          </Modal>
        </div>
      )}
      {!rows.length && (
        <p className="empty-state">
          {history
            ? "Nu ai împrumuturi rambursate."
            : "Nu ai împrumuturi active."}
        </p>
      )}
      <div className="goal-grid">
        {rows.map((l) => (
          <Card key={l.id}>
            <CardHeader>
              <CardTitle>{l.person}</CardTitle>
              <span className="category">
                {loanLabels[l.direction]} ·{" "}
                {l.settled_on
                  ? "Rambursat"
                  : l.direction === "lent"
                    ? "De primit"
                    : "De restituit"}
              </span>
            </CardHeader>
            <CardContent>
              <strong className="stat-value">
                {money(l.amount_minor / 100, l.currency)}
              </strong>
              <p>
                {l.occurred_on} · {names.get(l.account_id)}
              </p>
              <p className="debt-note">{l.note}</p>
              {l.settled_on ? (
                <p>
                  Rambursat la {l.settled_on} ·{" "}
                  {names.get(l.settled_account_id || "")}
                </p>
              ) : (
                <details className="goal-detail">
                  <summary>Înregistrează rambursarea</summary>
                  <LoanSettlement loan={l} accounts={accounts} />
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
