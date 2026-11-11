"use client";
import { useActionState, useState, useRef, useEffect } from "react";
import {
  saveTransaction,
  deleteTransaction,
} from "@/app/(workspace)/transactions/actions";
import type {
  AccountRow,
  CategoryRow,
  TransactionRow,
} from "@/lib/supabase/database.types";
import { Button } from "./ui/button";
export function TransactionForm({
  accounts,
  categories,
  transaction,
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
  transaction?: TransactionRow;
}) {
  const [kind, setKind] = useState<"income" | "expense">(
    transaction?.kind || "expense",
  );
  const [state, action, pending] = useActionState(saveTransaction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success && !transaction) formRef.current?.reset();
  }, [state, transaction]);
  return (
    <form ref={formRef} action={action} className="form-grid">
      <input type="hidden" name="id" value={transaction?.id || ""} />
      <label>
        Descriere
        <input
          name="description"
          defaultValue={transaction?.description}
          required
          maxLength={160}
        />
      </label>
      <div className="form-columns">
        <label>
          Tip
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="expense">Cheltuială</option>
            <option value="income">Venit</option>
          </select>
        </label>
        <label>
          Sumă (MDL)
          <input
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={
              transaction ? (transaction.amount_minor / 100).toFixed(2) : ""
            }
            pattern="[0-9]{1,10}([.,][0-9]{1,2})?"
            required
          />
        </label>
        <label>
          Cont
          <select
            name="account_id"
            defaultValue={transaction?.account_id || accounts[0]?.id}
            required
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Categorie
          <select
            key={kind}
            name="category_id"
            defaultValue={
              transaction?.kind === kind ? transaction.category_id : ""
            }
            required
          >
            <option value="" disabled>
              Selectează categoria
            </option>
            {categories
              .filter((c) => c.kind === kind)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Metoda de plată
          <select
            name="payment_method"
            defaultValue={transaction?.payment_method || "unspecified"}
          >
            <option value="unspecified">Nespecificat</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
        </label>
        <label>
          Dată
          <input
            type="date"
            name="occurred_on"
            min="1900-01-01"
            max="2100-12-31"
            defaultValue={
              transaction?.occurred_on ||
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Europe/Chisinau",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date())
            }
            required
          />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="form-success">
          {state.success}
        </p>
      )}
      <Button disabled={pending || !accounts.length || !categories.length}>
        {pending
          ? "Se salvează…"
          : transaction
            ? "Salvează modificările"
            : "Adaugă tranzacția"}
      </Button>
    </form>
  );
}
export function DeleteTransaction({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteTransaction, {});
  return (
    <details className="delete-panel">
      <summary>Șterge tranzacția</summary>
      <form action={action} className="form-grid">
        <input type="hidden" name="id" value={id} />
        <p>Această acțiune șterge definitiv tranzacția.</p>
        <label className="confirm-label">
          <input type="checkbox" name="confirm" value="yes" required /> Confirm
          ștergerea
        </label>
        {state.error && (
          <p role="alert" className="form-error">
            {state.error}
          </p>
        )}
        {state.success && <p role="status">{state.success}</p>}
        <Button disabled={pending}>
          {pending ? "Se șterge…" : "Șterge definitiv"}
        </Button>
      </form>
    </details>
  );
}
