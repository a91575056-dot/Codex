"use client";
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
} from "recharts";
import type { FinanceData } from "@/types/finance";
import { money } from "@/lib/finance";
export function CashChart({ data }: { data: FinanceData["cashFlow"] }) {
  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label="Flux de numerar fictiv în RON, iunie–noiembrie 2026; valorile sunt disponibile sub grafic."
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
        >
          <defs>
            <linearGradient id="cash-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#137d67" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#137d67" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="4 5"
            stroke="#e6ece8"
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#74877a", fontSize: 11 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#74877a", fontSize: 10 }}
            tickFormatter={(v) => `${v / 1000}k`}
          />
          <Tooltip
            formatter={(v) => money(Number(v))}
            contentStyle={{ borderRadius: 12, border: "1px solid #e4eae7" }}
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="income"
            name="Venituri"
            stroke="#137d67"
            strokeWidth={3}
            fill="url(#cash-fill)"
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="expenses"
            name="Cheltuieli"
            stroke="#c8a369"
            strokeWidth={2}
            fill="transparent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function AllocationChart({ data }: { data: FinanceData["allocation"] }) {
  return (
    <>
      <div
        className="donut"
        role="img"
        aria-label={data.map((d) => `${d.name} ${d.value}%`).join(", ")}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={data}
              dataKey="value"
              innerRadius={65}
              outerRadius={86}
              paddingAngle={4}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>4</strong>
          <span>clase de active</span>
        </div>
      </div>
      <div className="allocation-legend">
        {data.map((d) => (
          <div key={d.name}>
            <i style={{ background: d.color }} />
            {d.name}
            <strong>{d.value}%</strong>
          </div>
        ))}
      </div>
    </>
  );
}
