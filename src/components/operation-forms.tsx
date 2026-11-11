"use client";
import { useActionState, useState } from "react";
import { Button } from "./ui/button";
import {
  saveTransfer,
  deleteTransfer,
  type OperationState,
} from "@/app/(workspace)/transfers/actions";
import {
  saveRecurring,
  deleteRecurring,
  postRecurring,
} from "@/app/(workspace)/recurring/actions";
import type { AccountRow, CategoryRow } from "@/lib/supabase/database.types";
import type { Transfer, RecurringRule } from "@/lib/operations";
import { frequencyLabels } from "@/lib/operations";
import { todayISO } from "@/lib/goals";
function Messages({ state }: { state: OperationState }) {
  return (
    <>
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
    </>
  );
}
function Field({
  label,
  value,
  onChange,
  name,
  options,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  name: string;
  options?: { value: string; label: string }[];
  type?: string;
}) {
  return (
    <label>
      {label}
      {options ? (
        <select
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        >
          <option value="" disabled>
            Selectează
          </option>
          {options.map((o) => (
            <option value={o.value} key={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          inputMode={name === "amount" ? "decimal" : undefined}
          pattern={
            name === "amount" ? "[0-9]{1,10}([.,][0-9]{1,2})?" : undefined
          }
          min={type === "date" ? "1900-01-01" : undefined}
          max={type === "date" ? "2100-12-31" : undefined}
          maxLength={160}
          required={name !== "description" || label !== "Notă (opțional)"}
        />
      )}
    </label>
  );
}
export function TransferForm({
  accounts,
  requestId,
  transfer,
}: {
  accounts: AccountRow[];
  requestId: string;
  transfer?: Transfer;
}) {
  const [id, setId] = useState(requestId),
    [version, setVersion] = useState(0);
  const [fields, setFields] = useState({
    from_account_id: transfer?.from_account_id || accounts[0]?.id || "",
    to_account_id: transfer?.to_account_id || accounts[1]?.id || "",
    amount: transfer ? (transfer.amount_minor / 100).toFixed(2) : "",
    description: transfer?.description || "",
    occurred_on: transfer?.occurred_on || todayISO(),
  });
  const change = (name: keyof typeof fields, value: string) =>
    setFields((s) => ({ ...s, [name]: value }));
  const [state, action, pending] = useActionState(
    async (prev: OperationState, data: FormData) => {
      const r = await saveTransfer(prev, data);
      if (r.success && !transfer) {
        setFields((s) => ({ ...s, amount: "", description: "" }));
        if (r.nextRequestId) setId(r.nextRequestId);
      }
      setVersion((v) => v + 1);
      return r;
    },
    {},
  );
  const options = accounts.map((a) => ({
    value: a.id,
    label: a.name + " · MDL",
  }));
  return (
    <form key={version} action={action} className="form-grid">
      <input type="hidden" name="id" value={transfer?.id || ""} />
      <input type="hidden" name="request_id" value={id} />
      <fieldset disabled={pending} className="transaction-fields form-grid">
        <div className="form-columns">
          <Field
            name="from_account_id"
            label="Din contul"
            value={fields.from_account_id}
            onChange={(v) => change("from_account_id", v)}
            options={options}
          />
          <Field
            name="to_account_id"
            label="În contul"
            value={fields.to_account_id}
            onChange={(v) => change("to_account_id", v)}
            options={options}
          />
          <Field
            name="amount"
            label="Sumă transferată (MDL)"
            value={fields.amount}
            onChange={(v) => change("amount", v)}
          />
          <Field
            name="occurred_on"
            label="Data transferului"
            value={fields.occurred_on}
            onChange={(v) => change("occurred_on", v)}
            type="date"
          />
        </div>
        <Field
          name="description"
          label="Notă (opțional)"
          value={fields.description}
          onChange={(v) => change("description", v)}
        />
      </fieldset>
      <Messages state={state} />
      <Button disabled={pending || accounts.length < 2}>
        {pending
          ? "Se salvează…"
          : transfer
            ? "Salvează transferul"
            : "Înregistrează transferul"}
      </Button>
    </form>
  );
}
export function RecurringForm({
  accounts,
  categories,
  requestId,
  rule,
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
  requestId: string;
  rule?: RecurringRule;
}) {
  const [id, setId] = useState(requestId),
    [version, setVersion] = useState(0);
  const [f, setF] = useState({
    account_id: rule?.account_id || accounts[0]?.id || "",
    category_id: rule?.category_id || "",
    kind: rule?.kind || "expense",
    description: rule?.description || "",
    amount: rule ? (rule.amount_minor / 100).toFixed(2) : "",
    payment_method: rule?.payment_method || "unspecified",
    frequency: rule?.frequency || "monthly",
    start_on: rule?.start_on || todayISO(),
    next_due_on: rule?.next_due_on || todayISO(),
    active: rule?.active === false ? "false" : "true",
  });
  const change = (name: keyof typeof f, value: string) =>
    setF((s) => ({
      ...s,
      [name]: value,
      ...(name === "kind" ? { category_id: "" } : {}),
      ...(name === "start_on" && !rule ? { next_due_on: value } : {}),
    }));
  const [state, action, pending] = useActionState(
    async (prev: OperationState, data: FormData) => {
      const r = await saveRecurring(prev, data);
      if (r.success && !rule) {
        setF((s) => ({ ...s, description: "", amount: "", category_id: "" }));
        if (r.nextRequestId) setId(r.nextRequestId);
      }
      setVersion((v) => v + 1);
      return r;
    },
    {},
  );
  return (
    <form key={version} action={action} className="form-grid">
      <input type="hidden" name="id" value={rule?.id || ""} />
      <input type="hidden" name="request_id" value={id} />
      <fieldset disabled={pending} className="transaction-fields form-grid">
        <Field
          name="description"
          label="Denumire"
          value={f.description}
          onChange={(v) => change("description", v)}
        />
        <div className="form-columns">
          <Field
            name="kind"
            label="Tipul regulii"
            value={f.kind}
            onChange={(v) => change("kind", v)}
            options={[
              { value: "income", label: "Venit" },
              { value: "expense", label: "Cheltuială" },
            ]}
          />
          <Field
            name="amount"
            label="Sumă recurentă (MDL)"
            value={f.amount}
            onChange={(v) => change("amount", v)}
          />
          <Field
            name="account_id"
            label="Contul regulii"
            value={f.account_id}
            onChange={(v) => change("account_id", v)}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          />
          <Field
            name="category_id"
            label="Categoria regulii"
            value={f.category_id}
            onChange={(v) => change("category_id", v)}
            options={categories
              .filter((c) => c.kind === f.kind)
              .map((c) => ({ value: c.id, label: c.name }))}
          />
          <Field
            name="frequency"
            label="Repetare"
            value={f.frequency}
            onChange={(v) => change("frequency", v)}
            options={Object.entries(frequencyLabels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Field
            name="payment_method"
            label="Metoda regulii"
            value={f.payment_method}
            onChange={(v) => change("payment_method", v)}
            options={[
              { value: "unspecified", label: "Nespecificat" },
              { value: "cash", label: "Cash" },
              { value: "card", label: "Card" },
            ]}
          />
          <Field
            name="start_on"
            label="Prima scadență (ancora calendarului)"
            type="date"
            value={f.start_on}
            onChange={(v) => change("start_on", v)}
          />
          <Field
            name="next_due_on"
            label="Următoarea scadență"
            type="date"
            value={f.next_due_on}
            onChange={(v) => change("next_due_on", v)}
          />
          <Field
            name="active"
            label="Starea regulii"
            value={f.active}
            onChange={(v) => change("active", v)}
            options={[
              { value: "true", label: "Activă" },
              { value: "false", label: "În pauză" },
            ]}
          />
        </div>
      </fieldset>
      <p className="lab-help">
        Zilele 29–31 se ajustează la sfârșitul lunilor scurte, păstrând ziua
        inițială pentru lunile următoare. Regula nu face plăți bancare și nu
        modifică soldul înainte de confirmare.
      </p>
      <Messages state={state} />
      <Button
        disabled={
          pending ||
          !accounts.length ||
          !categories.some((c) => c.kind === f.kind)
        }
      >
        {pending ? "Se salvează…" : rule ? "Salvează regula" : "Creează regula"}
      </Button>
    </form>
  );
}
export function PostOccurrence({ rule }: { rule: RecurringRule }) {
  const [state, action, pending] = useActionState(postRecurring, {});
  const disabled = !rule.active || rule.next_due_on > todayISO();
  return (
    <form action={action} className="form-grid">
      <input name="rule_id" type="hidden" value={rule.id} />
      <input name="due_on" type="hidden" value={rule.next_due_on} />
      <input name="updated_at" type="hidden" value={rule.updated_at} />
      <label>
        Data efectivă a încasării/plății
        <input
          name="occurred_on"
          type="date"
          defaultValue={todayISO()}
          min="1900-01-01"
          max={todayISO()}
          required
          disabled={disabled || pending}
        />
      </label>
      <label className="confirm-label">
        <input
          type="checkbox"
          name="confirm"
          value="yes"
          required
          disabled={disabled || pending}
        />{" "}
        Confirm că această scadență a fost încasată/plătită și nu este deja
        introdusă manual
      </label>
      <Messages state={state} />
      <Button disabled={disabled || pending}>
        {pending ? "Se înregistrează…" : "Înregistrează scadența"}
      </Button>
    </form>
  );
}
export function DeleteOperation({
  id,
  type,
}: {
  id: string;
  type: "transfer" | "recurring";
}) {
  const [state, action, pending] = useActionState(
    type === "transfer" ? deleteTransfer : deleteRecurring,
    {},
  );
  return (
    <details className="delete-panel">
      <summary>
        {type === "transfer" ? "Șterge transferul" : "Șterge regula"}
      </summary>
      <form action={action} className="form-grid">
        <input type="hidden" name="id" value={id} />
        <p>
          {type === "transfer"
            ? "Soldurile se recalculează după ștergere."
            : "Tranzacțiile înregistrate anterior se păstrează."}
        </p>
        <label className="confirm-label">
          <input type="checkbox" name="confirm" value="yes" required /> Confirm
          ștergerea
        </label>
        <Messages state={state} />
        <Button disabled={pending}>Șterge definitiv</Button>
      </form>
    </details>
  );
}
