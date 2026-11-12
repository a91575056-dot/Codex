import { ExpenseChart, AllocationChart } from "./charts";
import {
  ChartCard,
  FinancialAmount,
  PerformanceBadge,
  EmptyState,
} from "./financial-ui";
import { DashboardEnvelopes } from "./envelope-view";
import { money } from "@/lib/finance";
import Link from "next/link";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Target,
  ChartPie,
  FileText,
  FlaskConical,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import {
  Heading,
  StatCard,
  Charts,
  Transactions,
  Budgets,
} from "./finance-view";
import { Button } from "./ui/button";
import type { FinanceData } from "@/types/finance";
export function ConnectedStats({ data }: { data: FinanceData }) {
  return (
    <div className="stats-grid dashboard-metrics">
      <StatCard
        label="Sold total"
        value={data.balance}
        change="MDL"
        note="conturi MDL · până astăzi"
        icon={Wallet}
        featured
        action={{ href: "/settings", label: "Gestionează conturile" }}
      />
      <StatCard
        label="Venituri lunare"
        value={data.income}
        change="MDL"
        note="luna curentă · până astăzi"
        icon={ArrowDownLeft}
        action={{
          href: "/transactions?create=income#transaction-form",
          label: "Înregistrează un venit",
        }}
      />
      <StatCard
        label="Cheltuieli lunare"
        value={data.expenses}
        change="MDL"
        note="luna curentă · până astăzi"
        icon={ArrowUpRight}
        action={{ href: "/quick-expense", label: "Cheltuială rapidă" }}
      />
      <StatCard
        label="Surplus lunar"
        value={data.income - data.expenses}
        change="MDL"
        note="venituri minus cheltuieli · nu economii transferate"
        icon={Target}
      />
      <StatCard
        label="Valoare portofoliu"
        value={data.portfolio}
        change="MDL"
        note="evaluări introduse manual"
        icon={TrendingUp}
        action={{ href: "/investments", label: "Adaugă o investiție" }}
      />
      <StatCard
        label="Rezultat nerealizat"
        value={data.portfolioDetails?.profit || 0}
        change="MDL"
        note="valoare minus cost · evaluări manuale"
        icon={TrendingUp}
      />
    </div>
  );
}
export function ConnectedDashboard({ data }: { data: FinanceData }) {
  return (
    <>
      <Heading
        title="Finanțele tale"
        description="Conturile MDL și EUR sunt afișate separat, fără conversie valutară."
      />
      <div className="lab-actions mb-6">
        <Button asChild>
          <Link href="/transactions?create=income#transaction-form">
            <ArrowDownLeft /> Adaugă venit
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/transactions?create=expense#transaction-form">
            <ArrowUpRight /> Adaugă cheltuială
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/investments#new-investment">
            <TrendingUp /> Adaugă investiție
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reports">
            <FileText /> Vezi rapoartele
          </Link>
        </Button>
      </div>
      <ConnectedStats data={data} />
      {data.loanSummary &&
        Object.entries(data.loanSummary).some(
          ([, s]) => s.receivable || s.payable,
        ) && (
          <section
            className="currency-summary"
            aria-label="Situația împrumuturilor"
          >
            <h2>Împrumuturi active</h2>
            {(["MDL", "EUR"] as const).map((c) => {
              const s = data.loanSummary![c];
              return s.receivable || s.payable ? (
                <p key={c}>
                  {c} · De primit:{" "}
                  <strong>{money(s.receivable / 100, c)}</strong> · De
                  restituit: <strong>{money(s.payable / 100, c)}</strong>
                </p>
              ) : null;
            })}
            <Link className="text-link" href="/debts">
              Vezi împrumuturile și rambursările
            </Link>
          </section>
        )}

      {data.euro && (
        <section className="currency-summary" aria-label="Conturi în euro">
          <h2>Conturi în EUR</h2>
          <p>
            Sold: <strong>{money(data.euro.balance, "EUR")}</strong> · Venituri
            luna curentă: {money(data.euro.income, "EUR")} · Cheltuieli luna
            curentă: {money(data.euro.expenses, "EUR")}
          </p>
          <Link href="/settings" className="text-link">
            Gestionează conturile în euro
          </Link>
        </section>
      )}
      <div className="dashboard-charts">
        <Charts data={data} only="cash" demo={false} />
        <ChartCard
          title="Distribuția cheltuielilor"
          description="Luna curentă · MDL"
        >
          <ExpenseChart data={data.expenseDistribution || []} />
        </ChartCard>
      </div>
      <ChartCard
        title="Portofoliul tău"
        description="Evaluări introduse manual · MDL"
        action={
          <Link className="text-link" href="/investments">
            Toate investițiile <ArrowRight size={14} />
          </Link>
        }
      >
        {data.portfolioDetails?.positions.length ? (
          <div className="portfolio-preview">
            <div>
              <div className="portfolio-summary-band">
                <div>
                  <small>Valoare curentă</small>
                  <strong className="stat-value">
                    {money(data.portfolio)}
                  </strong>
                </div>
                <PerformanceBadge
                  value={data.portfolioDetails.profit}
                  percent={data.portfolioDetails.percent}
                />
              </div>
              {[...data.portfolioDetails.positions]
                .sort((a, b) => b.value - a.value)
                .slice(0, 4)
                .map((h) => (
                  <div className="top-holding" key={h.id}>
                    <span>
                      {(h.symbol || h.name).slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong>{h.name}</strong>
                      <small>Evaluare: {h.priceOn}</small>
                    </div>
                    <FinancialAmount value={h.value} />
                  </div>
                ))}
            </div>
            <AllocationChart data={data.allocation} />
          </div>
        ) : (
          <EmptyState
            title="Începe portofoliul tău"
            description="Înregistrează activele, costurile și o evaluare manuală pentru a urmări structura și rezultatul portofoliului."
          >
            <Link className="text-link" href="/investments#new-investment">
              Adaugă primul activ <ArrowRight size={14} />
            </Link>
          </EmptyState>
        )}
      </ChartCard>
      <DashboardEnvelopes
        balances={data.envelopes || []}
        accounts={data.envelopeAccounts || []}
      />
      {!data.transactions.length && (
        <section
          className="dashboard-onboarding"
          aria-labelledby="first-transaction-title"
        >
          <h2 id="first-transaction-title">
            Începe cu primul venit sau prima cheltuială
          </h2>
          <p>
            Soldul inițial arată banii pe care îi aveai deja în conturi. Acesta
            nu se numără ca venit lunar. Pentru salariu, freelancing sau alte
            încasări, adaugă un venit cu data încasării.
          </p>
          <Link
            className="text-link"
            href="/transactions?create=income#transaction-form"
          >
            Înregistrează primul venit <ArrowRight size={16} />
          </Link>
        </section>
      )}
      {!!data.upcoming?.length && (
        <section
          className="dashboard-onboarding"
          aria-labelledby="upcoming-title"
        >
          <h2 id="upcoming-title">Următoarele scadențe</h2>
          <p>
            Încasările și plățile planificate intră în sold numai după
            confirmare.
          </p>
          {data.upcoming.map((r) => (
            <p key={r.id}>
              <strong>{r.date}</strong> · {r.name} · {r.amount > 0 ? "+" : ""}
              {money(r.amount, r.currency)}
            </p>
          ))}
          <Link className="text-link" href="/recurring">
            Gestionează și confirmă scadențele
          </Link>
        </section>
      )}
      <details className="dashboard-disclosure">
        <summary>Toate instrumentele financiare</summary>
        <section
          className="dashboard-tools"
          aria-labelledby="dashboard-tools-title"
        >
          <h2 id="dashboard-tools-title" className="overview-heading">
            Ce vrei să gestionezi?
          </h2>
          <div className="dashboard-tools-grid">
            {[
              {
                href: "/debts",
                title: "Datorii și împrumuturi",
                description:
                  "Notează datorii în MDL sau EUR și marchează încasarea.",
                icon: Wallet,
              },
              {
                href: "/transfers",
                title: "Transferuri între conturi",
                description:
                  "Mută bani între card și numerar fără venituri artificiale.",
                icon: Wallet,
              },
              {
                href: "/recurring",
                title: "Venituri și plăți recurente",
                description: "Urmărește salariul, chiria și abonamentele.",
                icon: Wallet,
              },
              {
                href: "/import",
                title: "Importă tranzacții CSV",
                description: "Verifică istoricul și importă fără duplicate.",
                icon: FileText,
              },
              {
                href: "/settings",
                title: "Conturi și solduri",
                description: "Adaugă numerar, carduri și soldurile inițiale.",
                icon: Wallet,
              },
              {
                href: "/budgets",
                title: "Bugete lunare",
                description: "Stabilește limite de cheltuieli pe categorii.",
                icon: ChartPie,
              },
              {
                href: "/goals",
                title: "Economii MDL și EUR",
                description: "Creează obiective și înregistrează contribuții.",
                icon: Target,
              },
              {
                href: "/investments",
                title: "Portofoliu de investiții",
                description: "Adaugă active, cantități și prețuri manuale.",
                icon: TrendingUp,
              },
              {
                href: "/analytics",
                title: "Analize financiare",
                description:
                  "Vezi distribuția cheltuielilor și fluxul de numerar.",
                icon: ChartPie,
              },
              {
                href: "/reports",
                title: "Rapoarte și export",
                description: "Alege perioada și descarcă raportul CSV sau PDF.",
                icon: FileText,
              },
              {
                href: "/decision-lab",
                title: "Laborator de decizii",
                description: "Simulează economii și schimbări ale venitului.",
                icon: FlaskConical,
              },
              {
                href: "/iphone",
                title: "iPhone și scurtături",
                description:
                  "Configurează înregistrarea plăților fără browser.",
                icon: Smartphone,
              },
            ].map(({ href, title, description, icon: Icon }) => (
              <Link key={href} href={href} className="dashboard-tool">
                <Icon size={21} aria-hidden="true" />
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </details>
      <div className="bottom-grid mt-6">
        <Transactions
          data={{ ...data, transactions: data.transactions.slice(0, 5) }}
          demo={false}
        />
        {data.budgets.length ? (
          <Budgets data={data} />
        ) : (
          <div className="demo-note">
            <strong>Planifică bugetul lunii</strong>
            <p>Nu ai limite definite încă.</p>
            <Link href="/budgets">Creează un buget</Link>
          </div>
        )}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Portofoliul folosește prețuri introduse manual. Tranzacțiile cu dată
        viitoare nu intră în soldul de astăzi.
      </p>
    </>
  );
}
