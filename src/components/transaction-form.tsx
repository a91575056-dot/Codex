"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
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
  initialKind = "expense",
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
  transaction?: TransactionRow;
  initialKind?: "income" | "expense";
}) {
  const [formVersion, setFormVersion] = useState(0);
  const [kind, setKind] = useState<"income" | "expense">(
    transaction?.kind || initialKind,
  );
  const [fields, setFields] = useState({
    description: transaction?.description || "",
    amount: transaction ? (transaction.amount_minor / 100).toFixed(2) : "",
    account_id: transaction?.account_id || accounts[0]?.id || "",
    category_id: transaction?.category_id || "",
    payment_method: transaction?.payment_method || "unspecified",
    occurred_on:
      transaction?.occurred_on ||
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Chisinau",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
  });
  function change(name: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
  }
  const [state, action, pending] = useActionState(
    async (previous: Parameters<typeof saveTransaction>[0], form: FormData) => {
      const result = await saveTransaction(previous, form);
      if (result.success && !transaction)
        setFields((current) => ({
          ...current,
          description: "",
          amount: "",
          category_id: "",
        }));
      setFormVersion((version) => version + 1);
      return result;
    },
    {},
  );
  return (
    <form key={formVersion} action={action} className="form-grid">
      <p className="transaction-hint">
        {kind === "income"
          ? "Înregistrează o încasare: salariu, freelancing sau alte venituri. Suma se adaugă la contul ales și la veniturile lunii datei selectate."
          : "Înregistrează o plată. Suma se scade din contul ales și intră în cheltuielile lunii datei selectate."}
      </p>
      <fieldset disabled={pending} className="transaction-fields form-grid">
        <input type="hidden" name="id" value={transaction?.id || ""} />
        <label>
          Descriere
          <input
            name="description"
            value={fields.description}
            onChange={(e) => change("description", e.target.value)}
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
              onChange={(e) => {
                setKind(e.target.value as typeof kind);
                change("category_id", "");
              }}
            >
              <option value="expense">Cheltuială</option>
              <option value="income">Venit</option>
            </select>
          </label>
          <label>
            Sumă (
            {accounts.find((a) => a.id === fields.account_id)?.currency ||
              "MDL"}
            )
            <input
              name="amount"
              inputMode="decimal"
              placeholder="0,00"
              value={fields.amount}
              onChange={(e) => change("amount", e.target.value)}
              pattern="[0-9]{1,10}([.,][0-9]{1,2})?"
              required
            />
          </label>
          <label>
            Cont
            <select
              name="account_id"
              value={fields.account_id}
              onChange={(e) => change("account_id", e.target.value)}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.currency}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categorie
            <select
              key={kind}
              name="category_id"
              value={fields.category_id}
              onChange={(e) => change("category_id", e.target.value)}
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
              value={fields.payment_method}
              onChange={(e) => change("payment_method", e.target.value)}
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
              value={fields.occurred_on}
              onChange={(e) => change("occurred_on", e.target.value)}
              required
            />
          </label>
        </div>
      </fieldset>
      {!categories.some((category) => category.kind === kind) && (
        <p className="form-error" role="status">
          Nu ai categorii pentru {kind === "income" ? "venituri" : "cheltuieli"}
          .{" "}
          <Link className="text-link" href="/settings">
            Adaugă o categorie în Setări
          </Link>
          .
        </p>
      )}
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
      <Button
        disabled={
          pending ||
          !accounts.length ||
          !categories.some((category) => category.kind === kind)
        }
      >
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
