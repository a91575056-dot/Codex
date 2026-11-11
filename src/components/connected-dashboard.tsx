import Link from "next/link";
import { Wallet, ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react";
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
        change="RON"
        note="toate conturile · până astăzi"
        icon={Wallet}
        featured
      />
      <StatCard
        label="Venituri lunare"
        value={data.income}
        change="RON"
        note="luna curentă · până astăzi"
        icon={ArrowDownLeft}
      />
      <StatCard
        label="Cheltuieli lunare"
        value={data.expenses}
        change="RON"
        note="luna curentă · până astăzi"
        icon={ArrowUpRight}
      />
      <StatCard
        label="Valoare portofoliu"
        value={data.portfolio}
        change="RON"
        note="evaluări introduse manual"
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
        description="Datele salvate în contul tău. Sumele sunt în RON."
      />
      <div className="mb-6">
        <Button asChild>
          <Link href="/transactions">Adaugă o tranzacție</Link>
        </Button>
      </div>
      <ConnectedStats data={data} />
      {!data.transactions.length && (
        <p className="empty-state" role="status">
          Încă nu ai tranzacții. Adaugă primul venit sau prima cheltuială pentru
          a începe.
        </p>
      )}
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
