import { Modal } from "@/components/ui/modal";
import { FinancialAmount, EmptyState } from "@/components/financial-ui";
import { paymentLabels } from "@/lib/payment";
import Link from "next/link";
import { supabaseConfig } from "@/lib/supabase/config";
import { getLedger } from "@/lib/supabase/repository";
import { financeRepository } from "@/lib/finance";
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
  const initialKind = params.create === "income" ? "income" : "expense";
  const parsed = filterSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : null;
  const names = new Map(ledger.categories.map((c) => [c.id, c.name]));
  const accountNames = new Map(ledger.accounts.map((a) => [a.id, a.name]));
  const matching = filters
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
  const sort =
    typeof params.sort === "string" &&
    ["date_desc", "date_asc", "amount_desc", "description"].includes(
      params.sort,
    )
      ? params.sort
      : "date_desc";
  const ordered = [...matching].sort((a, b) =>
    sort === "date_asc"
      ? a.occurred_on.localeCompare(b.occurred_on) || a.id.localeCompare(b.id)
      : sort === "amount_desc"
        ? b.amount_minor - a.amount_minor || a.id.localeCompare(b.id)
        : sort === "description"
          ? a.description.localeCompare(b.description, "ro")
          : b.occurred_on.localeCompare(a.occurred_on) ||
            a.id.localeCompare(b.id),
  );
  const currency =
    params.currency === "MDL" || params.currency === "EUR"
      ? params.currency
      : "";
  const currencyRows = ordered.filter(
    (t) =>
      !currency ||
      ledger.accounts.find((a) => a.id === t.account_id)?.currency === currency,
  );
  const pageCount = Math.max(1, Math.ceil(currencyRows.length / 25));
  const pageIndex = Math.min(
    pageCount,
    Math.max(
      1,
      typeof params.page === "string" && /^\d+$/.test(params.page)
        ? Number(params.page)
        : 1,
    ),
  );
  const rows = currencyRows.slice((pageIndex - 1) * 25, pageIndex * 25);
  function pageHref(page: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (typeof value === "string" && key !== "page" && key !== "create")
        query.set(key, value);
    query.set("page", String(page));
    return "/transactions?" + query;
  }
  return (
    <>
      <Heading
        title="Tranzacții"
        description="Adaugă și gestionează veniturile și cheltuielile tale."
      />
      <p className="lab-actions mb-6">
        <Link className="text-link" href="/import">
          Importă din CSV
        </Link>
        <Link className="text-link" href="/transfers">
          Transfer între conturile mele
        </Link>
        <Link className="text-link" href="/recurring">
          Venituri și plăți recurente
        </Link>
      </p>
      <p className="lab-help mb-6">
        Împrumuturile și rambursările modifică soldul, dar se urmăresc separat
        de venituri și consum.{" "}
        <Link className="text-link" href="/debts">
          Deschide registrul împrumuturilor
        </Link>
      </p>
      <Card id="transaction-form" className="mb-6 transaction-entry">
        <CardHeader>
          <CardTitle>Adaugă o tranzacție</CardTitle>
        </CardHeader>
        <CardContent>
          {!ledger.accounts.length || !ledger.categories.length ? (
            <p role="alert">
              Lipsesc contul sau categoriile. Creează-le în pagina Setări.
            </p>
          ) : (
            <div className="entry-card-content">
              <p>
                Înregistrează încasările și plățile în moneda contului ales.
              </p>
              <Modal
                key={String(params.create || "default")}
                initialOpen={
                  params.create === "income" || params.create === "expense"
                }
                trigger="Adaugă o tranzacție"
                title={
                  initialKind === "income"
                    ? "Adaugă un venit"
                    : "Adaugă o tranzacție"
                }
                description="Suma se reflectă în contul ales și în bugetul categoriei."
              >
                {" "}
                <TransactionForm
                  key={initialKind}
                  initialKind={initialKind}
                  accounts={ledger.accounts}
                  categories={ledger.categories}
                />
              </Modal>
            </div>
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
                    {c.name} · {c.kind === "income" ? "Venit" : "Cheltuială"}
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
            <label>
              Monedă
              <select name="currency" defaultValue={currency}>
                <option value="">MDL și EUR</option>
                <option value="MDL">MDL</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <label>
              Ordonare
              <select name="sort" defaultValue={sort}>
                <option value="date_desc">Cele mai recente</option>
                <option value="date_asc">Cele mai vechi</option>
                <option value="description">Descriere A–Z</option>
                <option value="amount_desc">Sumă nominală descrescător</option>
              </select>
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
            {currencyRows.length} tranzacții găsite. Sumele își păstrează
            moneda; nu se fac conversii.
          </p>
          {!rows.length ? (
            <EmptyState
              title="Nicio tranzacție pentru această selecție"
              description="Încearcă alt interval sau elimină filtrele. Poți adăuga un venit sau o cheltuială din formularul de mai sus."
            />
          ) : (
            <div className="table-scroll">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Tranzacție</th>
                    <th>Categorie / cont</th>
                    <th>Dată</th>
                    <th className="text-right">Sumă</th>
                    <th>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id} className="ledger-item">
                      <td>
                        <div className="ledger-summary">
                          <div>
                            <h2>{t.description}</h2>
                            <p>
                              {t.kind === "income" ? "Venit" : "Cheltuială"} ·{" "}
                              {paymentLabels[t.payment_method]}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="category">
                          {names.get(t.category_id)}
                        </span>
                        <p className="table-meta">
                          {accountNames.get(t.account_id)}
                        </p>
                      </td>
                      <td>
                        <time dateTime={t.occurred_on}>{t.occurred_on}</time>
                      </td>
                      <td className="amount">
                        <FinancialAmount
                          value={
                            ((t.kind === "income" ? 1 : -1) * t.amount_minor) /
                            100
                          }
                          currency={
                            ledger.accounts.find((a) => a.id === t.account_id)
                              ?.currency
                          }
                          signed
                        />
                      </td>
                      <td>
                        <div className="row-actions">
                          <Modal
                            trigger="Editează tranzacția"
                            title="Editează tranzacția"
                            description={t.description}
                          >
                            <TransactionForm
                              key={
                                t.id +
                                t.created_at +
                                t.description +
                                t.amount_minor
                              }
                              accounts={ledger.accounts}
                              categories={ledger.categories}
                              transaction={t}
                            />
                          </Modal>
                          <DeleteTransaction id={t.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="pagination">
            <span>
              Pagina {pageIndex} din {pageCount} · maximum 25 pe pagină
            </span>
            <div>
              {pageIndex > 1 ? (
                <Button asChild variant="outline">
                  <Link href={pageHref(pageIndex - 1)}>Înapoi</Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  Înapoi
                </Button>
              )}
              {pageIndex < pageCount ? (
                <Button asChild variant="outline">
                  <Link href={pageHref(pageIndex + 1)}>Înainte</Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  Înainte
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
