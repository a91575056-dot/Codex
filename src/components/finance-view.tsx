import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  TrendingUp,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { CashChart, AllocationChart } from "./charts";
import { money } from "@/lib/finance";
import type { FinanceData } from "@/types/finance";
export function Heading({
  title,
  description,
  home = false,
}: {
  title: string;
  description: string;
  home?: boolean;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">PRIVIRE DE ANSAMBLU</p>
        <h1>{title}</h1>
        <p className="subtitle">{description}</p>
      </div>
      {home && (
        <span className="date-chip">
          <CalendarDays size={16} /> Noiembrie 2026
        </span>
      )}
    </div>
  );
}
export function DemoNotice() {
  return (
    <div className="demo-banner">
      <i />
      <p>
        <strong>Date fictive, posibilități reale.</strong> Explorează un exemplu
        de situație financiară.
      </p>
      <span>DEMO</span>
    </div>
  );
}
export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  featured = false,
  note = "față de luna trecută",
}: {
  label: string;
  value: number;
  change: string;
  icon: typeof Wallet;
  featured?: boolean;
  note?: string;
}) {
  return (
    <Card className={`stat-card ${featured ? "featured" : ""}`}>
      <div className="stat-top">
        {label}
        <span>
          <Icon size={18} />
        </span>
      </div>
      <strong className="stat-value">{money(value)}</strong>
      <div className="stat-bottom">
        <span>
          {change.includes("%") && <ArrowUpRight size={12} />}
          {change}
        </span>
        <small>{note}</small>
      </div>
    </Card>
  );
}
export function Stats({ data }: { data: FinanceData }) {
  return (
    <div className="stats-grid">
      <StatCard
        label="Sold total"
        value={data.balance}
        change="12,8%"
        icon={Wallet}
        featured
      />
      <StatCard
        label="Venituri lunare"
        value={data.income}
        change="5,0%"
        icon={ArrowDownLeft}
      />
      <StatCard
        label="Cheltuieli lunare"
        value={data.expenses}
        change="8,6%"
        icon={ArrowUpRight}
      />
      <StatCard
        label="Valoare portofoliu"
        value={data.portfolio}
        change="7,2%"
        icon={TrendingUp}
        note="randament demo"
      />
    </div>
  );
}
export function Charts({
  data,
  only,
  demo = true,
}: {
  data: FinanceData;
  only?: "cash" | "allocation";
  demo?: boolean;
}) {
  return (
    <div className={only ? "" : "charts-grid"}>
      {only !== "allocation" && (
        <Card>
          <CardHeader className="section-heading">
            <div>
              <CardTitle>Flux de numerar</CardTitle>
              <p>Venituri și cheltuieli în echilibru</p>
            </div>
            <span className="period">
              {demo ? "Iun – Noi 2026" : "Ultimele 6 luni"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="chart-legend">
              <span>
                <i style={{ background: "#137d67" }} />
                Venituri
              </span>
              <span>
                <i style={{ background: "#c8a369" }} />
                Cheltuieli
              </span>
            </div>
            <CashChart data={data.cashFlow} demo={demo} />
            <details className="chart-details">
              <summary>
                {demo ? "Date fictive · " : ""}Vezi valorile în RON
              </summary>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Lună</th>
                      <th>Venituri</th>
                      <th>Cheltuieli</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cashFlow.map((d) => (
                      <tr key={d.month}>
                        <td>{d.month}</td>
                        <td>{money(d.income)}</td>
                        <td>{money(d.expenses)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </CardContent>
        </Card>
      )}
      {only !== "cash" && (
        <Card>
          <CardHeader>
            <CardTitle>Alocarea investițiilor</CardTitle>
            <p className="section-description">
              Diversificare pentru viitorul tău
            </p>
          </CardHeader>
          <CardContent>
            <AllocationChart data={data.allocation} />
            <div className="portfolio-note">
              <span>Portofoliu demonstrativ</span>
              <strong>{money(data.portfolio)}</strong>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
export function Transactions({
  data,
  basePath = "",
  full = false,
  demo = true,
}: {
  data: FinanceData;
  basePath?: string;
  full?: boolean;
  demo?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="section-heading">
        <div>
          <CardTitle>
            {full
              ? demo
                ? "Toate tranzacțiile demo"
                : "Tranzacțiile tale"
              : "Tranzacții recente"}
          </CardTitle>
          <p>O imagine clară a activității tale</p>
        </div>
        {!full && (
          <Link className="text-link" href={basePath + "/transactions"}>
            Vezi toate <ArrowRight size={14} />
          </Link>
        )}
      </CardHeader>
      <CardContent>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tranzacție</th>
                <th>Categorie</th>
                <th>Dată</th>
                <th className="text-right">Sumă</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="transaction">
                      <span className={t.amount > 0 ? "income" : ""}>
                        {t.amount > 0 ? (
                          <ArrowDownLeft size={15} />
                        ) : (
                          <ArrowUpRight size={15} />
                        )}
                      </span>
                      <strong>{t.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="category">{t.category}</span>
                  </td>
                  <td>
                    {new Intl.DateTimeFormat("ro-RO", {
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                    }).format(new Date(t.date))}
                  </td>
                  <td className={`amount ${t.amount > 0 ? "positive" : ""}`}>
                    {t.amount > 0 ? "+" : ""}
                    {money(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
export function Budgets({
  data,
  basePath = "",
}: {
  data: FinanceData;
  basePath?: string;
}) {
  return (
    <Card>
      <CardHeader className="section-heading">
        <CardTitle>Bugetele lunii</CardTitle>
        <Link
          href={basePath + "/budgets"}
          className="text-link"
          aria-label="Vezi bugetele"
        >
          <ArrowUpRight size={18} />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="budget-list">
          {data.budgets.map((b, i) => (
            <div key={b.name}>
              <div className="budget-title">
                <strong>{b.name}</strong>
                <span>{Math.round((b.spent / b.limit) * 100)}%</span>
              </div>
              <div
                className="budget-track"
                role="progressbar"
                aria-label={b.name}
                aria-valuenow={b.spent}
                aria-valuemin={0}
                aria-valuemax={b.limit}
              >
                <div
                  style={{
                    width: `${Math.min(100, (b.spent / b.limit) * 100)}%`,
                    background: ["#137d67", "#7c9cad", "#c8a369"][i],
                  }}
                />
              </div>
              <div className="budget-values">
                {money(b.spent)}
                <span>din {money(b.limit)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="budget-tip">
          Un plan bun începe cu pași mici.
          <br />
          Continuă să urmărești ce contează.
        </div>
      </CardContent>
    </Card>
  );
}
export function Dashboard({
  data,
  basePath = "",
}: {
  data: FinanceData;
  basePath?: string;
}) {
  return (
    <>
      <Heading
        title="Bună, Alex 👋"
        description="Iată cum arată finanțele tale astăzi."
        home
      />
      <DemoNotice />
      <Stats data={data} />
      <div className="overview-heading">
        <h2>Perspectiva ta financiară</h2>
        <span>Toate sumele sunt în RON</span>
      </div>
      <Charts data={data} />
      <div className="bottom-grid">
        <Transactions data={data} basePath={basePath} />
        <Budgets data={data} basePath={basePath} />
      </div>
      <div className="insight">
        <span>
          <TrendingUp />
        </span>
        <div>
          <strong>Fiecare decizie mică construiește un viitor mai bun.</strong>
          <p>
            Urmărește-ți obiceiurile și înțelege mai bine unde ajung banii tăi.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={basePath + "/analytics"}>
            Explorează analizele <ArrowRight />
          </Link>
        </Button>
      </div>
    </>
  );
}
