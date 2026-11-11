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
    <div className="stats-grid">
      <StatCard
        label="Sold total"
        value={data.balance}
        change="MDL"
        note="toate conturile · până astăzi"
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
        label="Valoare portofoliu"
        value={data.portfolio}
        change="MDL"
        note="evaluări introduse manual"
        icon={TrendingUp}
        action={{ href: "/investments", label: "Adaugă o investiție" }}
      />
    </div>
  );
}
export function ConnectedDashboard({ data }: { data: FinanceData }) {
  return (
    <>
      <Heading
        title="Finanțele tale"
        description="Datele salvate în contul tău. Sumele sunt în MDL."
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
          <Link href="/transactions">Toate tranzacțiile</Link>
        </Button>
      </div>
      <ConnectedStats data={data} />
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
              {money(r.amount)}
            </p>
          ))}
          <Link className="text-link" href="/recurring">
            Gestionează și confirmă scadențele
          </Link>
        </section>
      )}
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
              description: "Configurează înregistrarea plăților fără browser.",
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
      <Charts data={data} only="cash" demo={false} />
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
