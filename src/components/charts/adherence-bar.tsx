"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DataPoint {
  day: string;
  completed: number;
  total: number;
}

interface AdherenceBarProps {
  data: DataPoint[];
}

export default function AdherenceBar({ data }: AdherenceBarProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: "#71717A", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#71717A", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
          tickFormatter={(v: number) => v + "%"}
        />
        <Tooltip
          contentStyle={{ background: "#18181B", border: "1px solid #3F3F46", borderRadius: "8px" }}
          itemStyle={{ color: "#FAFAFA", fontSize: 12 }}
          formatter={(_v: number, _n: string, props: { payload?: DataPoint }) => {
            const p = props.payload;
            return [p ? p.completed + "/" + p.total + " sesiones" : "—", "Adherencia"];
          }}
        />
        <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => {
            const pct = entry.total > 0 ? (entry.completed / entry.total) * 100 : 0;
            return (
              <Cell
                key={i}
                fill={pct >= 80 ? "#22C55E" : pct >= 50 ? "#F59E0B" : "#EF4444"}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
