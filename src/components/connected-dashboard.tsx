import Link from "next/link";
import { Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Heading, StatCard, Charts, Transactions } from "./finance-view";
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
      <div className="demo-note">
        <strong>Investiții · DEMO</strong>
        <p>Urmărirea portofoliului nu este încă conectată la contul tău.</p>
        <Link href="/investments">Vezi exemplul fictiv</Link>
      </div>
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
      <div className="mt-6">
        <Transactions
          data={{ ...data, transactions: data.transactions.slice(0, 5) }}
          demo={false}
        />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Bugetele și investițiile sunt disponibile separat ca exemple DEMO.
        Tranzacțiile cu dată viitoare nu intră în soldul de astăzi.
      </p>
    </>
  );
}
