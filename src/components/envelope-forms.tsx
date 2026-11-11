"use client";
import { useActionState, useState } from "react";
import {
  startEnvelopes,
  configureEnvelopes,
} from "@/app/(workspace)/budgets/actions";
import type { EnvelopePlan, EnvelopeRule } from "@/lib/envelopes";
import { Button } from "./ui/button";
export function StartEnvelopes({
  currencies,
}: {
  currencies: ("MDL" | "EUR")[];
}) {
  const [state, action, pending] = useActionState(startEnvelopes, {});
  if (!currencies.length) return null;
  return (
    <form action={action} className="form-grid">
      <label>
        Moneda bugetelor automate
        <select name="currency">
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <p>
        Plan inițial: alimente 25%, locuință 25%, transport 10%, distracții 10%,
        investiții 15%, fond de urgență 10%, alte cheltuieli 5%. Procentele se
        pot modifica.
      </p>
      <label className="confirm-label">
        <input type="checkbox" name="confirm" value="yes" required /> Activez
        împărțirea automată a tuturor veniturilor noi în această monedă.
        Veniturile deja înregistrate nu se redistribuie.
      </label>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.success && <p role="status">{state.success}</p>}
      <Button disabled={pending}>
        {pending ? "Se activează…" : "Activează bugetele automate"}
      </Button>
    </form>
  );
}
export function EnvelopeConfig({
  plan,
  rules,
  names,
}: {
  plan: EnvelopePlan;
  rules: EnvelopeRule[];
  names: Record<string, string>;
}) {
  const [version, setVersion] = useState(0);
  const [percent, setPercent] = useState(
    Object.fromEntries(rules.map((r) => [r.id, String(r.basis_points / 100)])),
  );
  const [enabled, setEnabled] = useState(plan.enabled ? "true" : "false");
  const [state, action, pending] = useActionState(
    async (
      previous: Parameters<typeof configureEnvelopes>[0],
      form: FormData,
    ) => {
      const result = await configureEnvelopes(previous, form);
      setVersion((v) => v + 1);
      return result;
    },
    {},
  );
  const total = rules.reduce(
    (s, r) => s + Math.round(Number(percent[r.id]?.replace(",", ".")) * 100),
    0,
  );
  return (
    <form key={version} action={action} className="form-grid">
      <input type="hidden" name="plan_id" value={plan.id} />
      <fieldset className="transaction-fields form-grid" disabled={pending}>
        <div className="envelope-percent-grid">
          {rules.map((r) => (
            <label key={r.id}>
              {names[r.category_id]} (%)
              <input type="hidden" name="rule_id" value={r.id} />
              <input
                name={"percent_" + r.id}
                inputMode="decimal"
                required
                pattern="[0-9]{1,3}([.,][0-9]{1,2})?"
                value={percent[r.id]}
                onChange={(e) =>
                  setPercent((p) => ({ ...p, [r.id]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>
        <p className={total === 10000 ? "form-success" : "form-error"}>
          Total: {Number.isFinite(total) ? total / 100 : "—"}% din 100%
        </p>
        <label>
          Împărțirea veniturilor noi
          <select
            name="enabled"
            value={enabled}
            onChange={(e) => setEnabled(e.target.value)}
          >
            <option value="true">Activă</option>
            <option value="false">În pauză</option>
          </select>
        </label>
      </fieldset>
      <p>
        Soldurile existente se păstrează. Schimbarea procentelor nu redistribuie
        veniturile vechi. În pauză nu se alocă bani din încasările noi, dar
        cheltuielile continuă să scadă din bugetele existente.
      </p>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.success && <p role="status">{state.success}</p>}
      <Button disabled={pending || total !== 10000}>
        {pending ? "Se salvează…" : "Salvează procentele"}
      </Button>
    </form>
  );
}
