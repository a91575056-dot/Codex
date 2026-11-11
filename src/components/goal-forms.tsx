"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  saveGoal,
  addContribution,
  removeGoalRecord,
  saveGoalScenario,
} from "@/app/(workspace)/goals/actions";
import { Button } from "./ui/button";
import { todayISO, type Goal } from "@/lib/goals";
function Messages({ state }: { state: { error?: string; success?: string } }) {
  return (
    <>
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
    </>
  );
}
export function GoalForm({ goal }: { goal?: Goal }) {
  const [state, action, pending] = useActionState(saveGoal, {});
  const [currency, setCurrency] = useState<"MDL" | "EUR">(
    goal?.currency || "MDL",
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success && !goal) {
      for (const name of ["name", "target", "due_on"]) {
        const field = ref.current?.elements.namedItem(name);
        if (field instanceof HTMLInputElement) field.value = "";
      }
    }
  }, [state, goal]);
  return (
    <form ref={ref} action={action} className="form-grid">
      <input name="id" type="hidden" value={goal?.id || ""} />
      <label>
        Numele obiectivului
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={goal?.name}
          placeholder="Fond de urgență"
        />
      </label>
      <label>
        Moneda obiectivului
        {goal ? (
          <>
            <input type="hidden" name="currency" value={goal.currency} />
            <span>
              {goal.currency} · moneda se păstrează pentru întregul istoric
            </span>
          </>
        ) : (
          <select
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "MDL" | "EUR")}
          >
            <option value="MDL">MDL · Leu moldovenesc</option>
            <option value="EUR">EUR · Euro</option>
          </select>
        )}
      </label>
      <div className="form-columns">
        <label>
          Suma țintă ({currency})
          <input
            name="target"
            inputMode="decimal"
            required
            defaultValue={goal ? (goal.target_minor / 100).toFixed(2) : ""}
            pattern="[0-9]{1,10}([.,][0-9]{1,2})?"
          />
        </label>
        <label>
          Termen dorit
          <input
            name="due_on"
            type="date"
            min="1900-01-01"
            max="2100-12-31"
            required
            defaultValue={goal?.due_on}
          />
        </label>
      </div>
      <Messages state={state} />
      <Button disabled={pending}>
        {pending
          ? "Se salvează…"
          : goal
            ? "Salvează obiectivul"
            : "Creează obiectivul"}
      </Button>
    </form>
  );
}
export function ContributionForm({
  goalId,
  currency = "MDL",
}: {
  goalId: string;
  currency?: "MDL" | "EUR";
}) {
  const [state, action, pending] = useActionState(addContribution, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="form-grid">
      <input name="goal_id" type="hidden" value={goalId} />
      <div className="form-columns">
        <label>
          Contribuție ({currency})
          <input
            name="amount"
            inputMode="decimal"
            required
            pattern="[0-9]{1,10}([.,][0-9]{1,2})?"
          />
        </label>
        <label>
          Data contribuției
          <input
            name="occurred_on"
            type="date"
            min="1900-01-01"
            max={todayISO()}
            defaultValue={todayISO()}
            required
          />
        </label>
      </div>
      <label>
        Notă (opțional)
        <input name="note" maxLength={160} />
      </label>
      <p className="lab-help">
        Înregistrează economii pe care le-ai pus deoparte. Nu efectuează
        transferuri și nu modifică soldul tranzacțiilor. Evită înregistrarea
        acelorași economii în mai multe obiective.
      </p>
      <Messages state={state} />
      <Button disabled={pending}>
        {pending ? "Se adaugă…" : "Înregistrează contribuția"}
      </Button>
    </form>
  );
}
export function DeleteGoalRecord({
  id,
  type,
}: {
  id: string;
  type: "goal" | "contribution" | "scenario";
}) {
  const [state, action, pending] = useActionState(
    removeGoalRecord.bind(null, type),
    {},
  );
  return (
    <details className="delete-panel">
      <summary>
        {type === "goal"
          ? "Șterge obiectivul"
          : type === "contribution"
            ? "Șterge contribuția"
            : "Șterge scenariul"}
      </summary>
      <form action={action} className="form-grid">
        <input name="id" type="hidden" value={id} />
        <p>
          {type === "goal"
            ? "Obiectivul, contribuțiile și scenariile sale vor fi șterse definitiv."
            : "Înregistrarea va fi ștearsă definitiv."}
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
export function SaveScenarioForm({
  goalId,
  targetMinor,
  savedMinor,
  bufferMinor,
  shockPercent,
  cuts,
  disabled,
}: {
  goalId: string;
  targetMinor: number;
  savedMinor: number;
  bufferMinor: number;
  shockPercent: number;
  cuts: Record<string, number>;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(saveGoalScenario, {});
  return (
    <form action={action} className="form-grid mt-6">
      <input name="goal_id" type="hidden" value={goalId} />
      <input type="hidden" name="expected_target" value={targetMinor} />
      <input type="hidden" name="expected_saved" value={savedMinor} />
      <input
        name="buffer_minor"
        type="hidden"
        value={Number.isFinite(bufferMinor) ? bufferMinor : ""}
      />
      <input name="shock_percent" type="hidden" value={shockPercent} />
      <input name="cuts" type="hidden" value={JSON.stringify(cuts)} />
      <label>
        Numele scenariului
        <input
          name="name"
          placeholder="Mai puține ieșiri, același obiectiv"
          required
          maxLength={100}
        />
      </label>
      <p className="lab-help">
        Salvarea recalculează pe server folosind obiectivul și contribuțiile
        actuale. Comparația începe de la data salvării, cu contribuții la
        finalul fiecărui interval lunar. Ipotezele exportate local rămân
        separate de scenariile salvate.
      </p>
      <Messages state={state} />
      <Button disabled={pending || disabled}>
        {pending ? "Se salvează…" : "Salvează scenariul pentru obiectiv"}
      </Button>
    </form>
  );
}
