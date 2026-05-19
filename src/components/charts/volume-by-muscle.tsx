"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  muscle: string;
  volume: number;
}

interface VolumeByMuscleProps {
  data: DataPoint[];
}

export default function VolumeByMuscle({ data }: VolumeByMuscleProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[#71717A]">Sin datos de volumen.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#71717A", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="muscle"
          type="category"
          tick={{ fill: "#A1A1AA", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip
          contentStyle={{ background: "#18181B", border: "1px solid #3F3F46", borderRadius: "8px" }}
          itemStyle={{ color: "#FAFAFA", fontSize: 12 }}
          formatter={(v: number) => [v + " sets", "Volumen"]}
        />
        <Bar dataKey="volume" fill="var(--brand-primary)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
