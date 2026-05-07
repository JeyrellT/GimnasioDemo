"use client";

// =============================================================================
// FORJA — WeightTrendChart
// Owner: frontend-react.
// Chart de tendencia de peso — 12 semanas. Usa recharts LineChart.
// =============================================================================

import * as React from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface WeightTrendChartProps {
  /** Serie de 12 valores semanales, índice 0 = más antiguo. */
  data: number[];
}

interface ChartPoint {
  week: string;
  weekIndex: number;
  peso: number;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function buildChartData(data: number[]): ChartPoint[] {
  const now = new Date();
  return data.map((v, i) => {
    const weekDate = new Date(now);
    weekDate.setDate(now.getDate() - (data.length - 1 - i) * 7);
    const label = new Intl.DateTimeFormat("es-CR", {
      day: "numeric",
      month: "short",
    }).format(weekDate);
    return { week: label, weekIndex: i + 1, peso: v };
  });
}

// -----------------------------------------------------------------------------
// Custom dot — último punto con glow
// -----------------------------------------------------------------------------

interface CustomDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  dataLength?: number;
}

function LastPointDot({ cx, cy, index, dataLength }: CustomDotProps) {
  if (index !== (dataLength ?? 0) - 1 || cx === undefined || cy === undefined) {
    return null;
  }
  return (
    <g>
      {/* Glow ring exterior */}
      <circle cx={cx} cy={cy} r={9} fill="#FF6A1A" fillOpacity={0.15} />
      {/* Glow ring interior */}
      <circle cx={cx} cy={cy} r={6} fill="#FF6A1A" fillOpacity={0.3} />
      {/* Dot sólido */}
      <circle cx={cx} cy={cy} r={4} fill="#FF6A1A" strokeWidth={0} />
    </g>
  );
}

// -----------------------------------------------------------------------------
// Custom tooltip
// -----------------------------------------------------------------------------

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartPoint }>;
  label?: string;
  startWeight: number;
}

function CustomTooltip({ active, payload, label, startWeight }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const current = payload[0]?.value ?? 0;
  const weekIndex = payload[0]?.payload?.weekIndex ?? 1;
  const delta = current - startWeight;
  const deltaSign = delta > 0 ? "+" : "";
  return (
    <div className="rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs text-[#71717A]">
        Semana {weekIndex} — {label}
      </p>
      <p
        className="text-sm font-semibold text-[#FAFAFA]"
        style={{ fontFeatureSettings: "'tnum' 1" }}
      >
        {current.toFixed(1)} kg
      </p>
      <p
        className="text-xs"
        style={{
          color: delta <= 0 ? "#22C55E" : "#F87171",
          fontFeatureSettings: "'tnum' 1",
        }}
      >
        {deltaSign}{delta.toFixed(1)} kg vs inicio
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function WeightTrendChart({ data }: WeightTrendChartProps) {
  const chartData = buildChartData(data);
  const startWeight = data[0] ?? 0;
  const values = data.filter((v) => Number.isFinite(v));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const yDomain: [number, number] = [
    Math.floor(minVal - 1),
    Math.ceil(maxVal + 1),
  ];
  const gradientId = "weightGradient";

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6A1A" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#FF6A1A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272A"
            vertical={false}
          />
          <XAxis
            dataKey="week"
            tick={{ fill: "#71717A", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#71717A", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v} kg`}
            width={52}
            domain={yDomain}
          />
          <Tooltip
            content={
              <CustomTooltip
                startWeight={startWeight}
                active={undefined}
                payload={undefined}
                label={undefined}
              />
            }
          />
          <ReferenceLine
            y={startWeight}
            stroke="#71717A"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: `Inicio ${startWeight.toFixed(1)} kg`,
              position: "insideTopRight",
              fill: "#71717A",
              fontSize: 10,
            }}
          />
          <Area
            type="monotone"
            dataKey="peso"
            stroke="#FF6A1A"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={(props: CustomDotProps & { index: number }) => (
              <LastPointDot
                key={`dot-${props.index}`}
                cx={props.cx}
                cy={props.cy}
                index={props.index}
                dataLength={chartData.length}
              />
            )}
            activeDot={{ r: 4, fill: "#FF6A1A", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
