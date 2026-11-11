"use client";
import { useId, useState } from "react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import type { FinanceData } from "@/types/finance";
import { money } from "@/lib/finance";
const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface-elevated)",
  color: "var(--text)",
  fontSize: 12,
  boxShadow: "0 6px 24px var(--shadow-color)",
};
export function CashChart({
  data,
  demo = true,
}: {
  data: FinanceData["cashFlow"];
  demo?: boolean;
}) {
  const [months, setMonths] = useState(6);
  const id = useId().replace(/:/g, "");
  return (
    <>
      <div className="chart-toolbar">
        <span>{demo ? "Date demonstrative" : "Activitate înregistrată"}</span>
        <div role="group" aria-label="Perioada graficului">
          {[3, 6].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={months === n}
              onClick={() => setMonths(n)}
            >
              {n} luni
            </button>
          ))}
        </div>
      </div>
      <div
        className="chart-canvas"
        role="img"
        aria-label={`Venituri și cheltuieli în MDL, ultimele ${months} luni${demo ? ", date fictive" : ""}. Valorile sunt disponibile sub grafic.`}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart
            data={data.slice(-months)}
            margin={{ top: 12, right: 8, left: -15, bottom: 0 }}
          >
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.16}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 5"
              stroke="var(--border)"
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              tickFormatter={(v) =>
                Math.abs(v) >= 1000 ? `${v / 1000}k` : String(v)
              }
            />
            <Tooltip
              formatter={(v) => money(Number(v))}
              contentStyle={tooltipStyle}
              labelStyle={{ color: "var(--text)", marginBottom: 6 }}
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="income"
              name="Venituri"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              fill={`url(#${id})`}
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="expenses"
              name="Cheltuieli"
              stroke="var(--chart-4)"
              strokeWidth={2}
              strokeDasharray="5 3"
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
export function AllocationChart({ data }: { data: FinanceData["allocation"] }) {
  if (!data.length)
    return (
      <p className="empty-state">
        Nu există valori pozitive pentru distribuție.
      </p>
    );
  return (
    <>
      <div
        className="donut"
        role="img"
        aria-label={data.map((d) => `${d.name}: ${d.value}%`).join(", ")}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={data}
              dataKey="value"
              innerRadius={65}
              outerRadius={88}
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.name}
                  fill={d.color || `var(--chart-${(i % 6) + 1})`}
                />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>{data.length}</strong>
          <span>categorii</span>
        </div>
      </div>
      <div className="allocation-legend">
        {data.map((d, i) => (
          <div key={d.name}>
            <i
              style={{ background: d.color || `var(--chart-${(i % 6) + 1})` }}
            />
            <span>{d.name}</span>
            <strong>{d.value}%</strong>
          </div>
        ))}
      </div>
    </>
  );
}
export function ExpenseChart({
  data,
}: {
  data: { name: string; amount: number }[];
}) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (!total)
    return (
      <p className="empty-state">
        Nicio cheltuială înregistrată în luna curentă.
      </p>
    );
  const rows = [...data].sort((a, b) => b.amount - a.amount);
  const top = rows.slice(0, 5);
  if (rows.length > 5)
    top.push({
      name: "Restul categoriilor",
      amount: rows.slice(5).reduce((s, d) => s + d.amount, 0),
    });
  return (
    <>
      <div
        className="donut"
        role="img"
        aria-label={rows.map((d) => `${d.name}: ${money(d.amount)}`).join(", ")}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={top}
              dataKey="amount"
              innerRadius={65}
              outerRadius={88}
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {top.map((d, i) => (
                <Cell key={d.name} fill={`var(--chart-${(i % 6) + 1})`} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => money(Number(v))}
              contentStyle={tooltipStyle}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>{money(total)}</strong>
          <span>cheltuieli · MDL</span>
        </div>
      </div>
      <div className="allocation-legend">
        {top.map((d, i) => (
          <div key={d.name}>
            <i style={{ background: `var(--chart-${(i % 6) + 1})` }} />
            <span>{d.name}</span>
            <strong>{money(d.amount)}</strong>
          </div>
        ))}
      </div>
    </>
  );
}
export function SavingsChart({ data }: { data: FinanceData["cashFlow"] }) {
  return (
    <div
      className="chart-canvas"
      role="img"
      aria-label="Surplus lunar în MDL: venituri minus cheltuieli, fără a reprezenta economii transferate."
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={data.map((d) => ({ ...d, net: d.income - d.expenses }))}
          margin={{ left: -12, top: 12 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => money(Number(v))}
            contentStyle={tooltipStyle}
          />
          <Bar
            dataKey="net"
            name="Surplus lunar"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.income - d.expenses >= 0
                    ? "var(--chart-1)"
                    : "var(--negative)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
