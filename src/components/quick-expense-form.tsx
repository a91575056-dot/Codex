"use client";
import { useActionState, useRef, useState, useSyncExternalStore } from "react";
import { Banknote, CreditCard, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { saveQuickExpense, type QuickState } from "@/app/quick-expense/actions";
import { storedAccounts } from "@/lib/quick-expense";
import type { AccountRow, CategoryRow } from "@/lib/supabase/database.types";
const readySubscribe = () => () => {};
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("fintrack-quick-accounts", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("fintrack-quick-accounts", listener);
  };
}
export function QuickExpenseForm({
  accounts,
  categories,
  userId,
  requestId,
  demo = false,
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
  userId: string;
  requestId: string;
  demo?: boolean;
}) {
  const ready = useSyncExternalStore(
    readySubscribe,
    () => true,
    () => false,
  );
  const [method, setMethod] = useState<"cash" | "card">("card");
  const [overrides, setOverrides] = useState<
    Partial<Record<"cash" | "card", string>>
  >({});
  const [id, setId] = useState(requestId);
  const ref = useRef<HTMLFormElement>(null);
  const key = "fintrack.quick.accounts." + userId;
  const saved = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key) || "";
      } catch {
        return "";
      }
    },
    () => "",
  );
  const preferences = storedAccounts(
    saved,
    accounts.map((a) => a.id),
  );
  const selected =
    overrides[method] ||
    preferences[method] ||
    (accounts.length === 1 ? accounts[0].id : "");
  const [state, action, pending] = useActionState(
    async (previous: QuickState, form: FormData): Promise<QuickState> => {
      try {
        const result = await saveQuickExpense(previous, form);
        if (result.success) {
          for (const name of ["amount", "description", "category_id"]) {
            const field = ref.current?.elements.namedItem(name);
            if (
              field instanceof HTMLInputElement ||
              field instanceof HTMLSelectElement
            )
              field.value = "";
          }
          if (result.nextRequestId) setId(result.nextRequestId);
        }
        return result;
      } catch {
        return {
          error:
            "Conexiunea s-a întrerupt. Reîncearcă din același formular pentru a evita dublarea.",
        };
      }
    },
    {},
  );
  function remember(value: string) {
    setOverrides({ ...overrides, [method]: value });
    if (demo) return;
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({ ...preferences, [method]: value }),
      );
      window.dispatchEvent(new Event("fintrack-quick-accounts"));
    } catch {
      /* Storage can be unavailable in private mode; the selected account still works. */
    }
  }
  const expenseCategories = categories.filter((c) => c.kind === "expense");
  return (
    <form key={id} ref={ref} action={action} className="quick-form">
      <input name="request_id" type="hidden" value={id} />
      <input name="payment_method" type="hidden" value={method} />
      <fieldset
        disabled={
          !ready ||
          pending ||
          demo ||
          !accounts.length ||
          !expenseCategories.length
        }
      >
        <label className="quick-amount">
          Cât ai cheltuit?{" "}
          <span>
            {accounts.find((a) => a.id === selected)?.currency || "MDL"}
          </span>
          <input
            name="amount"
            aria-label={`Suma cheltuită (${accounts.find((a) => a.id === selected)?.currency || "MDL"})`}
            inputMode="decimal"
            pattern="[0-9]{1,10}([.,][0-9]{1,2})?"
            placeholder="0,00"
            required
            autoComplete="off"
          />
        </label>
        <fieldset className="quick-method">
          <legend>Cum ai plătit?</legend>
          <div>
            <Button
              type="button"
              variant={method === "card" ? "default" : "outline"}
              aria-pressed={method === "card"}
              onClick={() => setMethod("card")}
            >
              <CreditCard /> Card
            </Button>
            <Button
              type="button"
              variant={method === "cash" ? "default" : "outline"}
              aria-pressed={method === "cash"}
              onClick={() => setMethod("cash")}
            >
              <Banknote /> Cash
            </Button>
          </div>
        </fieldset>
        <label>
          Din ce cont?
          <select
            name="account_id"
            value={selected}
            onChange={(e) => remember(e.target.value)}
            required
          >
            <option value="" disabled>
              Selectează contul
            </option>
            {accounts.map((a) => (
              <option value={a.id} key={a.id}>
                {a.name} · {a.currency}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pe ce ai cheltuit?
          <select name="category_id" defaultValue="" required>
            <option value="" disabled>
              Alege categoria
            </option>
            {expenseCategories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Detalii (opțional)
          <input
            name="description"
            maxLength={160}
            placeholder="De exemplu: cafea, cumpărături…"
          />
        </label>
        <Button className="quick-submit" disabled={pending}>
          {pending ? "Se salvează…" : "Salvează cheltuiala"}
        </Button>
      </fieldset>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <div className="form-success" role="status">
          <CheckCircle2 size={20} />
          <strong>{state.success}</strong>
          <Link className="text-link" href="/transactions">
            Vezi în Tranzacții
          </Link>
        </div>
      )}
      <p className="quick-hint">
        Data se completează automat în fusul orar al aplicației. Cash/card este
        metoda declarată; soldul se actualizează pentru contul ales. Reținem
        local doar contul preferat pentru fiecare metodă, separat pe utilizator.
      </p>
      {(!accounts.length || !expenseCategories.length) && (
        <p className="form-error">
          Adaugă un cont și o categorie de cheltuieli în{" "}
          <Link href="/settings">Setări</Link>.
        </p>
      )}
    </form>
  );
}
