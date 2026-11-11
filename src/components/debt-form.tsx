"use client";
import { useActionState, useState } from "react";
import { saveDebt, changeDebtStatus } from "@/app/(workspace)/debts/actions";
import type { Receivable } from "@/lib/receivables";
import { todayISO } from "@/lib/goals";
import { Button } from "./ui/button";
export function DebtForm({
  requestId,
  debt,
}: {
  requestId: string;
  debt?: Receivable;
}) {
  const [version, setVersion] = useState(0);
  const [values, setValues] = useState({
    person: debt?.person || "",
    amount: debt ? (debt.amount_minor / 100).toFixed(2) : "",
    occurred_on: debt?.occurred_on || todayISO(),
    note: debt?.note || "",
  });
  const change = (name: keyof typeof values, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));
  const [state, action, pending] = useActionState(
    async (previous: Parameters<typeof saveDebt>[0], form: FormData) => {
      const result = await saveDebt(previous, form);
      setVersion((v) => v + 1);
      return result;
    },
    {},
  );
  const [currency, setCurrency] = useState(debt?.currency || "MDL");
  return (
    <form key={version} action={action} className="form-grid">
      <input type="hidden" name="id" value={debt?.id || requestId} />
      <input type="hidden" name="editing" value={debt ? "yes" : "no"} />
      <fieldset
        disabled={pending || (!!state.success && !debt)}
        className="transaction-fields form-grid"
      >
        <label>
          Cine îți datorează bani?
          <input
            name="person"
            required
            maxLength={100}
            value={values.person}
            onChange={(e) => change("person", e.target.value)}
          />
        </label>
        <div className="form-columns">
          <label>
            Moneda datoriei
            <select
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as typeof currency)}
            >
              <option value="MDL">MDL · Leu moldovenesc</option>
              <option value="EUR">EUR · Euro</option>
            </select>
          </label>
          <label>
            Sumă ({currency})
            <input
              name="amount"
              inputMode="decimal"
              required
              pattern="[0-9]{1,10}([.,][0-9]{1,2})?"
              value={values.amount}
              onChange={(e) => change("amount", e.target.value)}
            />
          </label>
          <label>
            Data datoriei
            <input
              type="date"
              name="occurred_on"
              required
              min="1900-01-01"
              max={todayISO()}
              value={values.occurred_on}
              onChange={(e) => change("occurred_on", e.target.value)}
            />
          </label>
        </div>
        <label>
          Detalii (opțional)
          <textarea
            name="note"
            maxLength={300}
            value={values.note}
            onChange={(e) => change("note", e.target.value)}
          />
        </label>
      </fieldset>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.success && <p role="status">{state.success}</p>}
      <Button disabled={pending || (!!state.success && !debt)}>
        {pending
          ? "Se salvează…"
          : debt
            ? "Salvează datoria"
            : "Adaugă datoria"}
      </Button>
      {state.success && !debt && (
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Adaugă altă datorie
        </Button>
      )}
    </form>
  );
}
export function DebtStatus({ id, settled }: { id: string; settled: boolean }) {
  const [state, action, pending] = useActionState(changeDebtStatus, {});
  return (
    <div className="form-grid">
      <form action={action} className="form-grid">
        <input type="hidden" name="id" value={id} />
        <input
          type="hidden"
          name="operation"
          value={settled ? "reopen" : "settle"}
        />
        <label className="confirm-label">
          <input type="checkbox" name="confirm" value="yes" required />{" "}
          {settled
            ? "Confirm că datoria este încă neachitată"
            : "Confirm că am primit toată suma"}
        </label>
        <Button disabled={pending}>
          {settled ? "Mută în lista activă" : "Marchează achitat"}
        </Button>
      </form>
      <details className="delete-panel">
        <summary>Șterge datoria</summary>
        <form action={action} className="form-grid">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="operation" value="delete" />
          <label className="confirm-label">
            <input type="checkbox" name="confirm" value="yes" required />{" "}
            Confirm ștergerea definitivă
          </label>
          <Button variant="outline" disabled={pending}>
            Șterge definitiv
          </Button>
        </form>
      </details>
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
    </div>
  );
}
