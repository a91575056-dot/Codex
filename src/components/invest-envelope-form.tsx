"use client";
import { useActionState, useState } from "react";
import { confirmInvestment } from "@/app/(workspace)/budgets/actions";
import { money } from "@/lib/finance";
import { Button } from "./ui/button";
export type EnvelopeAccount = {
  id: string;
  name: string;
  currency: "MDL" | "EUR";
};
export function InvestEnvelopeForm({
  ruleId,
  amount,
  currency,
  accounts,
  requestId,
}: {
  ruleId: string;
  amount: number;
  currency: "MDL" | "EUR";
  accounts: EnvelopeAccount[];
  requestId: string;
}) {
  const [id] = useState(requestId);
  const [state, action, pending] = useActionState(confirmInvestment, {});
  const matching = accounts.filter((a) => a.currency === currency);
  return (
    <details className="goal-detail">
      <summary>Am investit suma disponibilă</summary>
      <form action={action} className="form-grid">
        <input type="hidden" name="rule_id" value={ruleId} />
        <input type="hidden" name="request_id" value={id} />
        <input type="hidden" name="expected_available" value={amount} />
        <p>
          Se înregistrează o cheltuială de{" "}
          <strong>{money(amount / 100, currency)}</strong> în categoria
          Investiții, din contul ales. Bugetul disponibil ajunge la zero. Nu
          bifa dacă ai înregistrat deja aceeași investiție în Tranzacții.
        </p>
        <label>
          Contul din care ai investit
          <select
            name="account_id"
            required
            defaultValue={matching.length === 1 ? matching[0].id : ""}
          >
            <option value="" disabled>
              Alege contul
            </option>
            {matching.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.currency}
              </option>
            ))}
          </select>
        </label>
        <label className="confirm-label">
          <input type="checkbox" name="confirm" value="yes" required /> Confirm
          că am investit {money(amount / 100, currency)} și nu am înregistrat
          deja această operație
        </label>
        <p className="lab-help">
          Nu se cumpără active automat. Adaugă separat poziția în portofoliu
          dacă vrei să urmărești valoarea investiției.
        </p>
        {state.error && (
          <p role="alert" className="form-error">
            {state.error}
          </p>
        )}
        {state.success && <p role="status">{state.success}</p>}
        <Button disabled={pending || !matching.length || !!state.success}>
          {pending ? "Se înregistrează…" : "Confirmă investiția"}
        </Button>
      </form>
    </details>
  );
}
