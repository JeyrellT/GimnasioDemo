"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DataPoint {
  date: string;
  predicted1rm: number;
}

interface Prediction1RMProps {
  data: DataPoint[];
  exerciseName?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CR", { month: "short", day: "numeric" });
}

export default function Prediction1RM({ data, exerciseName }: Prediction1RMProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[#71717A]">Sin datos suficientes para proyección.</p>
      </div>
    );
  }

  const latest = data[data.length - 1]?.predicted1rm ?? 0;

  return (
    <div className="space-y-2 h-full">
      {exerciseName && (
        <p className="text-xs text-[#71717A] uppercase tracking-wide">{exerciseName}</p>
      )}
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold tabular text-brand-accent">{latest.toFixed(1)}</span>
        <span className="text-sm text-[#71717A]">kg 1RM estimado</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "#71717A", fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#18181B", border: "1px solid #3F3F46", borderRadius: "8px" }}
            labelFormatter={(v: string) => formatDate(v)}
            formatter={(v: number) => [v.toFixed(1) + " kg", "1RM"]}
            itemStyle={{ color: "var(--brand-accent)", fontSize: 12 }}
          />
          <ReferenceLine y={latest} stroke="var(--brand-accent)" strokeDasharray="4 2" strokeOpacity={0.4} />
          <Line type="monotone" dataKey="predicted1rm" stroke="var(--brand-accent)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "var(--brand-accent)" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
