"use client";

// =============================================================================
// FORJA — MuscleMassTrendChart
// Owner: frontend-react.
// Chart de tendencia de masa muscular — 12 semanas. Usa recharts AreaChart.
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
// Constants
// -----------------------------------------------------------------------------

const LINE_COLOR = "#3B82F6";
const GRADIENT_ID = "muscleMassGradient";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface MuscleMassTrendChartProps {
  /** Serie de 12 valores semanales en kg, índice 0 = más antiguo. */
  data: number[];
}

interface ChartPoint {
  week: string;
  weekIndex: number;
  musculo: number;
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
    return { week: label, weekIndex: i + 1, musculo: v };
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
      <circle cx={cx} cy={cy} r={9} fill={LINE_COLOR} fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={6} fill={LINE_COLOR} fillOpacity={0.3} />
      <circle cx={cx} cy={cy} r={4} fill={LINE_COLOR} strokeWidth={0} />
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
  startMass: number;
}

function CustomTooltip({ active, payload, label, startMass }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const current = payload[0]?.value ?? 0;
  const weekIndex = payload[0]?.payload?.weekIndex ?? 1;
  const delta = current - startMass;
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
          color: delta >= 0 ? "#3B82F6" : "#F87171",
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

export function MuscleMassTrendChart({ data }: MuscleMassTrendChartProps) {
  const chartData = buildChartData(data);
  const startMass = data[0] ?? 0;
  const values = data.filter((v) => Number.isFinite(v));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const yDomain: [number, number] = [
    Math.floor(minVal - 1),
    Math.ceil(maxVal + 1),
  ];

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.3} />
              <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
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
                startMass={startMass}
                active={undefined}
                payload={undefined}
                label={undefined}
              />
            }
          />
          <ReferenceLine
            y={startMass}
            stroke="#71717A"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: `Inicio ${startMass.toFixed(1)} kg`,
              position: "insideTopRight",
              fill: "#71717A",
              fontSize: 10,
            }}
          />
          <Area
            type="monotone"
            dataKey="musculo"
            stroke={LINE_COLOR}
            strokeWidth={2}
            fill={`url(#${GRADIENT_ID})`}
            dot={(props: CustomDotProps & { index: number }) => (
              <LastPointDot
                key={`dot-${props.index}`}
                cx={props.cx}
                cy={props.cy}
                index={props.index}
                dataLength={chartData.length}
              />
            )}
            activeDot={{ r: 4, fill: LINE_COLOR, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
