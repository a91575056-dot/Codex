import { randomUUID } from "node:crypto";
import Link from "next/link";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLedger } from "@/lib/supabase/repository";
import { accountBalance } from "@/lib/operations";
import { money } from "@/lib/finance";
import { Heading, DemoNotice } from "@/components/finance-view";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TransferForm, DeleteOperation } from "@/components/operation-forms";
export const instant = false;
export default async function TransfersPage() {
  if (!supabaseConfig())
    return (
      <>
        <Heading
          title="Transferuri între conturi"
          description="Mută bani între numerar și card, fără venituri sau cheltuieli artificiale."
        />
        <DemoNotice />
        <p>
          În modul personal poți adăuga, modifica și șterge transferuri în MDL
          sau EUR. Modul demo nu salvează date.
        </p>
      </>
    );
  const ledger = await getLedger("/transfers");
  const requestId = randomUUID();
  const names = new Map(ledger.accounts.map((a) => [a.id, a.name]));
  return (
    <>
      <Heading
        title="Transferuri între conturi"
        description="Transferurile modifică soldul fiecărui cont. Soldul total, veniturile, cheltuielile și bugetele rămân neschimbate."
      />
      <div className="goal-grid mb-6">
        {ledger.accounts.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle>{a.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <strong className="stat-value">
                {money(
                  accountBalance(
                    a,
                    ledger.transactions,
                    ledger.transfers,
                    undefined,
                    ledger.loans,
                  ) / 100,
                  a.currency,
                )}
              </strong>
              <span>{a.currency} · sold până astăzi</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Un transfer nou</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.accounts.length < 2 ? (
            <p>
              Adaugă cel puțin două conturi în{" "}
              <Link className="text-link" href="/settings">
                Setări
              </Link>{" "}
              pentru a înregistra un transfer.
            </p>
          ) : (
            <TransferForm accounts={ledger.accounts} requestId={requestId} />
          )}
        </CardContent>
      </Card>
      <h2 className="overview-heading">Istoricul transferurilor</h2>
      {!ledger.transfers.length && (
        <p className="empty-state">
          Niciun transfer înregistrat. Exemplu de utilizare: retragere de
          numerar de pe card.
        </p>
      )}
      <div className="goal-grid">
        {ledger.transfers.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle>
                {names.get(t.from_account_id)} → {names.get(t.to_account_id)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <strong>
                {money(
                  t.amount_minor / 100,
                  ledger.accounts.find((a) => a.id === t.from_account_id)
                    ?.currency,
                )}
              </strong>
              <p>
                {t.occurred_on}
                {t.description ? ` · ${t.description}` : ""}
              </p>
              <details className="goal-detail">
                <summary>Editează transferul</summary>
                <TransferForm
                  key={JSON.stringify(t)}
                  accounts={ledger.accounts}
                  transfer={t}
                  requestId={requestId}
                />
              </details>
              <DeleteOperation type="transfer" id={t.id} />
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="lab-help mt-6">
        Transferurile viitoare se aplică soldurilor la data aleasă.
        Înregistrează numai mutări între conturile tale în aceeași monedă (MDL
        sau EUR); o plată către altcineva este o cheltuială.
      </p>
    </>
  );
}
