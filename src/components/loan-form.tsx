"use client";
import { useActionState, useState } from "react";
import { saveLoan, settleLoan } from "@/app/(workspace)/debts/actions";
import type { AccountRow } from "@/lib/supabase/database.types";
import type { Loan } from "@/lib/loans";
import { todayISO } from "@/lib/goals";
import { Button } from "./ui/button";
export function LoanForm({
  requestId,
  accounts,
}: {
  requestId: string;
  accounts: AccountRow[];
}) {
  const [state, action, pending] = useActionState(saveLoan, {});
  const [values, setValues] = useState({
    direction: "lent",
    person: "",
    amount: "",
    note: "",
    account_id: accounts[0]?.id || "",
    occurred_on: todayISO(),
  });
  const change = (key: keyof typeof values, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));
  const currency =
    accounts.find((a) => a.id === values.account_id)?.currency || "MDL";
  return (
    <form action={action} className="form-grid">
      <input name="id" type="hidden" value={requestId} />
      <fieldset
        disabled={pending || !!state.success}
        className="transaction-fields form-grid"
      >
        <label>
          Tipul împrumutului
          <select
            name="direction"
            value={values.direction}
            onChange={(e) => change("direction", e.target.value)}
          >
            <option value="lent">Am dat bani împrumut</option>
            <option value="borrowed">Am primit bani împrumut</option>
          </select>
        </label>
        <label>
          Persoana
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
            Contul împrumutului
            <select
              name="account_id"
              required
              value={values.account_id}
              onChange={(e) => change("account_id", e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.currency}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sumă împrumut ({currency})
            <input
              name="amount"
              required
              inputMode="decimal"
              pattern="[0-9]{1,10}([.,][0-9]{1,2})?"
              value={values.amount}
              onChange={(e) => change("amount", e.target.value)}
            />
          </label>
          <label>
            Data împrumutului
            <input
              name="occurred_on"
              type="date"
              required
              max={todayISO()}
              min="1900-01-01"
              value={values.occurred_on}
              onChange={(e) => change("occurred_on", e.target.value)}
            />
          </label>
        </div>
        <label>
          Detalii împrumut (opțional)
          <input
            name="note"
            maxLength={160}
            value={values.note}
            onChange={(e) => change("note", e.target.value)}
          />
        </label>
      </fieldset>
      <p className="lab-help">
        Banii dați scad soldul contului; banii primiți îl cresc. Principalul nu
        intră în venituri, cheltuieli sau alocările automate.
      </p>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          {state.success}
        </p>
      )}
      <Button disabled={pending || !!state.success || !accounts.length}>
        {pending ? "Se salvează…" : "Salvează împrumutul"}
      </Button>
      {state.success && (
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Adaugă alt împrumut
        </Button>
      )}
    </form>
  );
}
export function LoanSettlement({
  loan,
  accounts,
}: {
  loan: Loan;
  accounts: AccountRow[];
}) {
  const [state, action, pending] = useActionState(settleLoan, {});
  return (
    <form action={action} className="form-grid mt-4">
      <input name="id" type="hidden" value={loan.id} />
      <label>
        Cont pentru rambursare
        <select name="account_id" required defaultValue={loan.account_id}>
          {accounts
            .filter((a) => a.currency === loan.currency)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.currency}
              </option>
            ))}
        </select>
      </label>
      <label className="confirm-label">
        <input name="confirm" type="checkbox" value="yes" required />{" "}
        {loan.direction === "lent"
          ? "Confirm că am primit integral banii în contul ales"
          : "Confirm că am restituit integral banii din contul ales"}
      </label>
      <Button variant="outline" disabled={pending || !!state.success}>
        {pending ? "Se confirmă…" : "Confirmă rambursarea integrală"}
      </Button>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && <p role="status">{state.success}</p>}
    </form>
  );
}
