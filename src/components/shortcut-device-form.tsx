"use client";
import { useActionState, useState } from "react";
import {
  setShortcutIncome,
  createShortcutDevice,
  revokeShortcutDevice,
  type DeviceState,
} from "@/app/(workspace)/iphone/actions";
import type { AccountRow } from "@/lib/supabase/database.types";
import { Button } from "./ui/button";
import { ShortcutGuide } from "./shortcut-guide";
export function ShortcutDeviceForm({ accounts }: { accounts: AccountRow[] }) {
  const [token, setToken] = useState<string>();
  const [state, action, pending] = useActionState(
    async (previous: DeviceState, form: FormData): Promise<DeviceState> => {
      const result = await createShortcutDevice(previous, form);
      if (result.token) setToken(result.token);
      return { error: result.error, success: result.success };
    },
    {},
  );
  return (
    <div className="form-grid">
      <form action={action} className="form-grid">
        <label>
          Numele telefonului
          <input
            name="name"
            required
            maxLength={80}
            placeholder="iPhone-ul meu"
          />
        </label>
        <div className="form-columns">
          {(["cash", "card"] as const).map((method) => (
            <label key={method}>
              Cont pentru {method === "cash" ? "Cash" : "Card"}
              <select
                name={method + "_account_id"}
                required
                defaultValue={accounts.length === 1 ? accounts[0].id : ""}
              >
                <option value="" disabled>
                  Alege contul
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · MDL
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="lab-help">
          Plățile Cash și Card vor actualiza conturile alese aici. Poți alege
          același cont. Pentru a schimba asocierea, revocă tokenul și conectează
          telefonul din nou.
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
        <Button disabled={pending || !accounts.length || !!token}>
          {pending ? "Se conectează…" : "Conectează telefonul"}
        </Button>
      </form>
      <ShortcutGuide token={token} dismiss={() => setToken(undefined)} />
    </div>
  );
}
export function RevokeShortcutDevice({ id }: { id: string }) {
  const [state, action, pending] = useActionState(revokeShortcutDevice, {});
  return (
    <details className="delete-panel">
      <summary>Revocă accesul</summary>
      <form action={action} className="form-grid">
        <input type="hidden" name="id" value={id} />
        <label className="confirm-label">
          <input name="confirm" type="checkbox" value="yes" required /> Confirm
          revocarea accesului acestui telefon
        </label>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        <Button disabled={pending}>
          {pending ? "Se revocă…" : "Revocă telefonul"}
        </Button>
      </form>
    </details>
  );
}

export function ShortcutIncomePermission({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(setShortcutIncome, {});
  return (
    <form action={action} className="form-grid">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="enabled" value={enabled ? "no" : "yes"} />
      <p>
        {enabled
          ? "Acest telefon poate adăuga venituri și cheltuieli."
          : "Acest telefon poate adăuga doar cheltuieli."}
      </p>
      {!enabled && (
        <p>
          Activarea permite adăugarea veniturilor în conturile Cash/Card alese
          și creează categoriile lipsă Salariu, Bonus și Alte venituri.
        </p>
      )}
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.success && <p role="status">{state.success}</p>}
      <Button variant="outline" disabled={pending}>
        {pending
          ? "Se actualizează…"
          : enabled
            ? "Dezactivează veniturile"
            : "Activează veniturile"}
      </Button>
    </form>
  );
}
