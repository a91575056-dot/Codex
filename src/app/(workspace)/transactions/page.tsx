import Link from "next/link";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLedger } from "@/lib/supabase/repository";
import { financeRepository, money } from "@/lib/finance";
import { Heading, DemoNotice, Transactions } from "@/components/finance-view";
import {
  TransactionForm,
  DeleteTransaction,
} from "@/components/transaction-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { filterSchema } from "@/lib/transaction-validation";
export const instant = false;
export default async function TransactionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!supabaseConfig())
    return (
      <>
        <Heading
          title="Tranzacții"
          description="Activitate demonstrativă, doar pentru citire."
        />
        <DemoNotice />
        <Transactions data={await financeRepository.getSnapshot()} full />
      </>
    );
  const ledger = await getLedger();
  const params = await searchParams;
  const parsed = filterSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : null;
  const names = new Map(ledger.categories.map((c) => [c.id, c.name]));
  const accountNames = new Map(ledger.accounts.map((a) => [a.id, a.name]));
  const rows = filters
    ? ledger.transactions.filter(
        (t) =>
          (!filters.q ||
            t.description
              .toLocaleLowerCase("ro")
              .includes(filters.q.toLocaleLowerCase("ro"))) &&
          (!filters.kind || t.kind === filters.kind) &&
          (!filters.category || t.category_id === filters.category) &&
          (!filters.from || t.occurred_on >= filters.from) &&
          (!filters.to || t.occurred_on <= filters.to),
      )
    : [];
  return (
    <>
      <Heading
        title="Tranzacții"
        description="Adaugă și gestionează veniturile și cheltuielile tale."
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Adaugă o tranzacție</CardTitle>
        </CardHeader>
        <CardContent>
          {!ledger.accounts.length || !ledger.categories.length ? (
            <p role="alert">
              Lipsesc contul sau categoriile. Aplică migrația Supabase pentru
              inițializarea utilizatorilor.
            </p>
          ) : (
            <TransactionForm
              accounts={ledger.accounts}
              categories={ledger.categories}
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tranzacțiile tale</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="filter-form" method="get">
            <label>
              Caută descriere
              <input name="q" maxLength={160} defaultValue={filters?.q} />
            </label>
            <label>
              Tip
              <select name="kind" defaultValue={filters?.kind}>
                <option value="">Toate</option>
                <option value="income">Venit</option>
                <option value="expense">Cheltuială</option>
              </select>
            </label>
            <label>
              Categorie
              <select name="category" defaultValue={filters?.category}>
                <option value="">Toate</option>
                {ledger.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              De la
              <input name="from" type="date" defaultValue={filters?.from} />
            </label>
            <label>
              Până la
              <input name="to" type="date" defaultValue={filters?.to} />
            </label>
            <Button>Aplică filtrele</Button>
            <Link className="text-link" href="/transactions">
              Resetează
            </Link>
          </form>
          {!parsed.success && (
            <p role="alert" className="form-error">
              Filtre invalide. Verifică intervalul de date și selecțiile.
            </p>
          )}
          <p className="my-4 text-muted-foreground">
            {rows.length} tranzacții găsite.
          </p>
          {!rows.length && (
            <p role="status" className="empty-state">
              Nu există tranzacții pentru selecția curentă.
            </p>
          )}
          <div className="ledger-list">
            {rows.map((t) => (
              <article key={t.id} className="ledger-item">
                <div className="ledger-summary">
                  <div>
                    <h2>{t.description}</h2>
                    <p>
                      {t.occurred_on} · {names.get(t.category_id)} ·{" "}
                      {accountNames.get(t.account_id)}
                    </p>
                  </div>
                  <strong className={t.kind === "income" ? "positive" : ""}>
                    {t.kind === "income" ? "+" : "−"}
                    {money(t.amount_minor / 100)}
                  </strong>
                </div>
                <details>
                  <summary>Editează tranzacția</summary>
                  <TransactionForm
                    key={t.id + t.created_at + t.description + t.amount_minor}
                    accounts={ledger.accounts}
                    categories={ledger.categories}
                    transaction={t}
                  />
                </details>
                <DeleteTransaction id={t.id} />
              </article>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
