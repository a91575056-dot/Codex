import { ArrowUpRight, ArrowDownRight, Wallet, Minus } from "lucide-react";
import { money, type SavingsCurrency } from "@/lib/finance";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
export function FinancialAmount({
  value,
  currency = "MDL",
  signed = false,
  className = "",
}: {
  value: number;
  currency?: SavingsCurrency;
  signed?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`financial-amount ${signed ? (value > 0 ? "positive" : value < 0 ? "negative" : "") : ""} ${className}`}
    >
      {signed && value > 0 ? "+" : ""}
      {money(value, currency)}
    </span>
  );
}
export function PerformanceBadge({
  value,
  percent,
}: {
  value: number;
  percent?: number | null;
}) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={`performance-badge ${value > 0 ? "positive" : value < 0 ? "negative" : ""}`}
    >
      <Icon size={14} />
      {value > 0 ? "+" : ""}
      {percent === null || percent === undefined
        ? money(value)
        : `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(percent)}%`}
    </span>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state-panel" role="status">
      <Wallet size={26} />
      <strong>{title}</strong>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function ChartCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="section-heading">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <p>{description}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
export function SectionHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-heading section-header">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Se încarcă datele financiare">
      <span className="sr-only">Se încarcă datele financiare…</span>
      <div className="skeleton" style={{ height: 32, width: "35%" }} />
      <div className="loading-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} data-slot="card" style={{ padding: 24 }}>
            <div
              className="skeleton"
              style={{ height: 12, width: "60%", marginBottom: 24 }}
            />
            <div className="skeleton" style={{ height: 30, width: "80%" }} />
          </div>
        ))}
      </div>
      <div data-slot="card" style={{ padding: 24 }}>
        <div className="skeleton" style={{ height: 280 }} />
      </div>
    </div>
  );
}
