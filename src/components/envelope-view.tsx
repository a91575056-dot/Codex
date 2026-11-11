import { randomUUID } from "node:crypto";
import {
  InvestEnvelopeForm,
  type EnvelopeAccount,
} from "./invest-envelope-form";
import Link from "next/link";
import type { EnvelopeBalance } from "@/lib/envelopes";
import { money } from "@/lib/finance";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
export function EnvelopeCards({
  balances,
  accounts = [],
}: {
  balances: EnvelopeBalance[];
  accounts?: EnvelopeAccount[];
}) {
  return (
    <div className="goal-grid envelope-grid">
      {balances.map((b) => (
        <Card key={b.id}>
          <CardHeader className="category-card-heading">
            <CardTitle>{b.name}</CardTitle>
            <span className="category">
              {b.percent}% · {b.currency}
            </span>
          </CardHeader>
          <CardContent>
            <p>Disponibil{!b.enabled ? " · plan în pauză" : ""}</p>
            <strong
              className={`stat-value ${b.available < 0 ? "negative" : ""}`}
            >
              {money(b.available / 100, b.currency)}
            </strong>
            <p>Alocat: {money(b.funded / 100, b.currency)}</p>
            <p>
              {b.kind === "investment"
                ? "Investiții înregistrate"
                : b.kind === "emergency"
                  ? "Utilizat din fond"
                  : "Cheltuit"}
              : {money(b.spent / 100, b.currency)}
            </p>
            {b.kind === "investment" && b.available > 0 && (
              <InvestEnvelopeForm
                key={`${b.id}:${b.available}:${b.spent}`}
                ruleId={b.id}
                amount={b.available}
                currency={b.currency}
                accounts={accounts}
                requestId={randomUUID()}
              />
            )}
            {b.kind === "investment" && b.available === 0 && (
              <p className="lab-help">
                Bugetul se alimentează la următoarea încasare.
              </p>
            )}
            {b.available < 0 && (
              <p className="form-error">
                Depășire: următoarele alocări vor acoperi mai întâi această
                diferență.
              </p>
            )}
            {b.isFallback && (
              <p className="lab-help">
                Include și cheltuielile din categoriile fără buget separat.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
export function DashboardEnvelopes({
  balances,
  accounts = [],
}: {
  balances: EnvelopeBalance[];
  accounts?: EnvelopeAccount[];
}) {
  return (
    <section className="dashboard-tools" aria-labelledby="envelopes-title">
      <h2 className="overview-heading" id="envelopes-title">
        Alocările veniturilor tale
      </h2>
      {!balances.length ? (
        <p>
          Activează împărțirea automată a veniturilor în bugete, investiții și
          fond de urgență.
        </p>
      ) : (
        <>
          <p className="lab-help mb-4">
            Banii necheltuiți se reportează. MDL și EUR rămân separat; sumele
            rezervate sunt deja incluse în soldul conturilor.
          </p>
          <EnvelopeCards balances={balances} accounts={accounts} />
        </>
      )}
      <Link className="text-link" href="/settings#budget-percentages">
        Setează procentele bugetelor
      </Link>
    </section>
  );
}
