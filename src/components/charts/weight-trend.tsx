"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  weight: number;
}

interface WeightTrendProps {
  data: DataPoint[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CR", { month: "short", day: "numeric" });
}

export default function WeightTrend({ data }: WeightTrendProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[#71717A]">Sin datos de peso todavía.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: "#71717A", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#71717A", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => v.toFixed(0)}
        />
        <Tooltip
          contentStyle={{ background: "#18181B", border: "1px solid #3F3F46", borderRadius: "8px" }}
          labelStyle={{ color: "#A1A1AA", fontSize: 12 }}
          itemStyle={{ color: "#FAFAFA", fontSize: 12 }}
          labelFormatter={(v: string) => formatDate(v)}
          formatter={(v: number) => [v.toFixed(1) + " kg", "Peso"]}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="var(--brand-primary)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "var(--brand-primary)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
