"use client";
import { useActionState, useEffect, useRef, useId } from "react";
import { saveResource, deleteResource } from "@/app/(workspace)/manage/actions";
import type { Resource } from "@/lib/planning";
import { Button } from "./ui/button";
export interface FieldSpec {
  name: string;
  label: string;
  value?: string;
  type?: "text" | "date" | "month";
  options?: { value: string; label: string }[];
  maxLength?: number;
  required?: boolean;
  hint?: string;
  min?: string;
  max?: string;
  pattern?: string;
}
export function ResourceForm({
  resource,
  id,
  fields,
}: {
  resource: Resource;
  id?: string;
  fields: FieldSpec[];
}) {
  const formId = useId();
  const [state, action, pending] = useActionState(
    saveResource.bind(null, resource),
    {},
  );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success && !id) ref.current?.reset();
  }, [state, id]);
  return (
    <form ref={ref} action={action} className="form-grid">
      <input name="id" type="hidden" value={id || ""} />
      <div className="form-columns">
        {fields.map((f) => (
          <label key={f.name}>
            {f.label}
            {f.options ? (
              <select
                name={f.name}
                aria-label={f.label}
                aria-describedby={
                  f.hint ? `${formId}-${f.name}-hint` : undefined
                }
                defaultValue={f.value || f.options[0]?.value}
                required={f.required !== false}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={f.name}
                aria-label={f.label}
                aria-describedby={
                  f.hint ? `${formId}-${f.name}-hint` : undefined
                }
                type={f.type || "text"}
                defaultValue={f.value}
                required={f.required !== false}
                maxLength={f.maxLength || 100}
                min={f.min}
                max={f.max}
                pattern={f.pattern}
                inputMode={f.pattern ? "decimal" : undefined}
              />
            )}{" "}
            {f.hint && <small id={`${formId}-${f.name}-hint`}>{f.hint}</small>}
          </label>
        ))}
      </div>
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
      <Button disabled={pending || fields.some((f) => f.options?.length === 0)}>
        {pending
          ? "Se salvează…"
          : id
            ? "Salvează modificările"
            : "Adaugă înregistrarea"}
      </Button>
    </form>
  );
}
export function DeleteResource({
  resource,
  id,
}: {
  resource: Resource;
  id: string;
}) {
  const [state, action, pending] = useActionState(
    deleteResource.bind(null, resource),
    {},
  );
  return (
    <details className="delete-panel">
      <summary>Șterge înregistrarea</summary>
      <form action={action} className="form-grid">
        <input name="id" type="hidden" value={id} />
        <p>
          Ștergerea elimină înregistrarea din FinTrack. Nu efectuează operațiuni
          financiare.
        </p>
        <label className="confirm-label">
          <input name="confirm" type="checkbox" value="yes" required /> Confirm
          ștergerea
        </label>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        {state.success && <p role="status">{state.success}</p>}
        <Button disabled={pending}>Șterge definitiv</Button>
      </form>
    </details>
  );
}
