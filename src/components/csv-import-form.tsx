"use client";
import { useActionState, useState } from "react";
import {
  previewImport,
  commitImport,
  type PreviewState,
} from "@/app/(workspace)/import/actions";
import { csvTemplate, type ImportRow } from "@/lib/csv-import";
import type { AccountRow, CategoryRow } from "@/lib/supabase/database.types";
import { money } from "@/lib/finance";
import { Button } from "./ui/button";
function ConfirmImport({ rows }: { rows: ImportRow[] }) {
  const [state, action, pending] = useActionState(commitImport, {});
  return (
    <form action={action} className="form-grid">
      <input name="rows" type="hidden" value={JSON.stringify(rows)} />
      <label className="confirm-label">
        <input
          name="confirm"
          type="checkbox"
          value="yes"
          required
          disabled={pending || !!state.success}
        />{" "}
        Confirm importul tranzacțiilor verificate
      </label>
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
      <Button disabled={pending || !!state.success}>
        {pending ? "Se importă…" : "Confirmă importul"}
      </Button>
    </form>
  );
}
export function CSVImportForm({
  accounts,
  categories,
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
}) {
  const [account, setAccount] = useState(accounts[0]?.id || ""),
    [version, setVersion] = useState(0);
  const [state, action, pending] = useActionState(
    async (prev: PreviewState, data: FormData) => {
      const r = await previewImport(prev, data);
      setVersion((v) => v + 1);
      return r;
    },
    {},
  );
  const names = new Map(accounts.map((a) => [a.id, a.name])),
    cats = new Map(categories.map((c) => [c.id, c.name]));
  function template() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csvTemplate], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "fintrack-sablon-import.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="form-grid">
      <Button type="button" variant="outline" onClick={template}>
        Descarcă șablon CSV
      </Button>
      <form key={version} action={action} className="form-grid">
        <label>
          Cont implicit pentru rândurile fără cont
          <select
            name="account_id"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            required
          >
            {accounts.map((a) => (
              <option value={a.id} key={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fișier CSV
          <input name="file" type="file" accept=".csv,text/csv" required />
        </label>
        <Button disabled={pending || !accounts.length}>
          {pending ? "Se verifică…" : "Verifică fișierul"}
        </Button>
      </form>
      <p className="lab-help">
        Maximum 500 de tranzacții și 512 KiB. Nu se salvează nimic înainte de
        confirmare. Importul este integral: corectează toate erorile înainte de
        salvare. Rândurile deja importate cu aceleași date sunt ignorate;
        tranzacțiile introduse manual nu sunt deduplicate automat.
      </p>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {!!state.errors?.length && (
        <div className="form-error" role="alert">
          <strong>{state.errors.length} rânduri necesită corectare</strong>
          <ul>
            {state.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {!!state.rows?.length && (
        <>
          <h2 className="overview-heading">
            Previzualizare: {state.rows.length} tranzacții valide
          </h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Dată</th>
                  <th>Descriere</th>
                  <th>Cont</th>
                  <th>Categorie</th>
                  <th>Sumă MDL</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.occurred_on}</td>
                    <td>{r.description}</td>
                    <td>{names.get(r.account_id)}</td>
                    <td>{cats.get(r.category_id)}</td>
                    <td>
                      {r.kind === "income" ? "+" : "−"}
                      {money(r.amount_minor / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!state.errors?.length && (
            <ConfirmImport key={version} rows={state.rows} />
          )}
        </>
      )}
    </div>
  );
}
