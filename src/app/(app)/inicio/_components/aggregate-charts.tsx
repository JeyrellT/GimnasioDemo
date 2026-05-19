"use client";

// =============================================================================
// BLACKLINE FITNESS — AggregateCharts
// Phase 3, Agent 7 (data-viz).
// Client Component: 3 aggregate charts in a responsive grid.
//   1. Adherencia por cliente  — horizontal BarChart
//   2. Tendencia de peso       — ComposedChart (Area + Line)
//   3. Volumen por grupo muscular — vertical BarChart
// =============================================================================

import { useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Area,
  Line,
} from "recharts";
import type { MuscleGroup } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useBranding } from "@/lib/branding/branding-context";
import type {
  DashboardAggregates,
  ClientAdherenceData,
  WeightTrendPoint,
  VolumeByMuscleData,
} from "@/types/dashboard";

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

export interface AggregateChartsProps {
  aggregates: DashboardAggregates;
  className?: string;
}

// -----------------------------------------------------------------------------
// Design tokens (kept as constants, never inline magic strings)
// -----------------------------------------------------------------------------

const TOKEN = {
  canvas: "#09090B",
  card: "#18181B",
  hover: "#27272A",
  // primary/primaryBand are derived per-render from the active palette via
  // useBranding() — SVG attributes do not resolve CSS variables, so we must
  // pass the literal hex from the trainer's chosen palette.
  text: "#FAFAFA",
  muted: "#71717A",
  mutedLight: "#A1A1AA",
  border: "#3F3F46",
  gridStroke: "#27272A",
  axisStroke: "#52525B",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
} as const;

// -----------------------------------------------------------------------------
// Muscle group labels (es-CR)
// -----------------------------------------------------------------------------

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  CHEST: "Pecho",
  BACK: "Espalda",
  SHOULDERS: "Hombros",
  BICEPS: "Bíceps",
  TRICEPS: "Tríceps",
  QUADS: "Cuádriceps",
  HAMSTRINGS: "Isquios",
  GLUTES: "Glúteos",
  CALVES: "Gemelos",
  ABS: "Abdomen",
  OBLIQUES: "Oblicuos",
  FOREARMS: "Antebrazos",
  NECK: "Cuello",
  FULL_BODY: "Cuerpo entero",
};

// -----------------------------------------------------------------------------
// Shared Recharts axis / grid props (avoids repetition)
// -----------------------------------------------------------------------------

const AXIS_PROPS = {
  stroke: TOKEN.axisStroke,
  tick: { fill: TOKEN.mutedLight, fontSize: 11 },
} as const;

const GRID_PROPS = {
  strokeDasharray: "2 4",
  stroke: TOKEN.gridStroke,
} as const;

const TOOLTIP_CONTENT_STYLE = {
  background: TOKEN.card,
  border: `1px solid ${TOKEN.border}`,
  borderRadius: "8px",
  padding: "8px 12px",
} as const;

const TOOLTIP_ITEM_STYLE = {
  color: TOKEN.text,
  fontSize: 12,
} as const;

const TOOLTIP_LABEL_STYLE = {
  color: TOKEN.mutedLight,
  fontSize: 12,
  marginBottom: 4,
} as const;

// -----------------------------------------------------------------------------
// Shared chart card wrapper
// -----------------------------------------------------------------------------

interface ChartCardProps {
  title: string;
  subtitle: string;
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function ChartCard({
  title,
  subtitle,
  headerSlot,
  children,
  className,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-[#3F3F46] bg-[#18181B] p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#A1A1AA]">
            {title}
          </h3>
          <p className="mt-0.5 text-[11px] text-[#52525B]">{subtitle}</p>
        </div>
        {headerSlot}
      </div>
      {children}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Shared empty state
// -----------------------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center">
      <p className="text-center text-sm text-[#52525B]">{message}</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Truncates a name to at most 14 chars, appending ellipsis if longer. */
function truncateName(name: string): string {
  if (name.length <= 14) return name;
  return name.slice(0, 13) + "…";
}

/** Formats a YYYY-MM-DD string as "DD MMM" in Spanish. */
function formatWeekStart(iso: string): string {
  // Parse as UTC to avoid timezone shifts on the date-only string
  const parts = iso.split("-").map(Number);
  const year = parts[0] ?? 2000;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

/** Returns the bar fill color based on adherence percentage bucket. */
function adherenceColor(pct: number): string {
  if (pct >= 80) return TOKEN.success;
  if (pct >= 50) return TOKEN.warning;
  return TOKEN.danger;
}

// -----------------------------------------------------------------------------
// Chart 1: Adherencia por cliente (horizontal bar)
// -----------------------------------------------------------------------------

interface AdherenceTooltipPayload {
  payload?: ClientAdherenceData & { displayName: string };
}

function AdherenceTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: AdherenceTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={TOOLTIP_CONTENT_STYLE}>
      <p style={{ color: TOKEN.text, fontSize: 12, fontWeight: 600 }}>
        {d.clientName}
      </p>
      <p style={TOOLTIP_ITEM_STYLE}>
        {d.adherencePct}% · {d.sessionsCompleted} de {d.sessionsExpected}{" "}
        sesiones
      </p>
    </div>
  );
}

interface AdherenceChartData extends ClientAdherenceData {
  displayName: string;
}

function ClientAdherenceChart({ data }: { data: ClientAdherenceData[] }) {
  if (data.length === 0) {
    return (
      <EmptyState message="Sin clientes con rutinas activas en este periodo." />
    );
  }

  const chartData: AdherenceChartData[] = data.map((d) => ({
    ...d,
    displayName: truncateName(d.clientName),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          {...GRID_PROPS}
          horizontal={false}
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          {...AXIS_PROPS}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          dataKey="displayName"
          type="category"
          width={96}
          {...AXIS_PROPS}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={(props) => (
            <AdherenceTooltipContent
              active={props.active}
              payload={
                props.payload as AdherenceTooltipPayload[] | undefined
              }
            />
          )}
          cursor={{ fill: TOKEN.hover }}
        />
        <Bar dataKey="adherencePct" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {chartData.map((entry, idx) => (
            <Cell
              key={`adherence-${idx}`}
              fill={adherenceColor(entry.adherencePct)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// -----------------------------------------------------------------------------
// Chart 2: Tendencia de peso del grupo (ComposedChart: Area + Line)
// -----------------------------------------------------------------------------

type WeightMetric = "weight" | "bodyFat" | "muscleMass";

const METRIC_LABELS: Record<WeightMetric, string> = {
  weight: "Peso",
  bodyFat: "% Grasa",
  muscleMass: "Masa muscular",
};

const METRIC_UNIT: Record<WeightMetric, string> = {
  weight: "kg",
  bodyFat: "%",
  muscleMass: "kg",
};

interface WeightTooltipPayload {
  payload?: WeightTrendPoint;
}

function WeightTooltipContent({
  active,
  payload,
  activeMetric,
}: {
  active?: boolean;
  payload?: WeightTooltipPayload[];
  activeMetric: WeightMetric;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const unit = METRIC_UNIT[activeMetric];
  return (
    <div style={TOOLTIP_CONTENT_STYLE}>
      <p style={{ ...TOOLTIP_LABEL_STYLE, marginBottom: 6 }}>
        Semana del {formatWeekStart(d.weekStart)}
      </p>
      <p style={TOOLTIP_ITEM_STYLE}>
        Avg {d.avgKg.toFixed(1)} {unit}
      </p>
      <p style={TOOLTIP_ITEM_STYLE}>
        P25 {d.p25Kg.toFixed(1)} · P75 {d.p75Kg.toFixed(1)} {unit}
      </p>
      <p style={{ ...TOOLTIP_ITEM_STYLE, color: TOKEN.muted }}>
        {d.clientCount} clientes
      </p>
    </div>
  );
}

function WeightTrendChart({ data }: { data: WeightTrendPoint[] }) {
  const { palette } = useBranding();
  const [activeMetric, setActiveMetric] = useState<WeightMetric>("weight");

  const handleMetricChange = useCallback((metric: WeightMetric) => {
    setActiveMetric(metric);
  }, []);

  if (data.length === 0) {
    return (
      <EmptyState message="Sin mediciones suficientes en el periodo." />
    );
  }

  // Derive domain from data with a small padding so area/line don't clip
  const allValues = data.flatMap((d) => [d.p25Kg, d.avgKg, d.p75Kg]);
  const minVal = Math.floor(Math.min(...allValues) - 1);
  const maxVal = Math.ceil(Math.max(...allValues) + 1);

  // The band uses two synthetic keys so Recharts Area can render a range
  const chartData = data.map((d) => ({
    ...d,
    band: [d.p25Kg, d.p75Kg] as [number, number],
  }));

  return (
    <>
      {/* Metric toggle chips */}
      <div className="mb-3 flex gap-1.5">
        {(["weight", "bodyFat", "muscleMass"] as WeightMetric[]).map(
          (metric) => (
            <button
              key={metric}
              onClick={() => handleMetricChange(metric)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                activeMetric === metric
                  ? "bg-brand-primary text-white"
                  : "bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-[#FAFAFA]",
              )}
              aria-pressed={activeMetric === metric}
              type="button"
            >
              {METRIC_LABELS[metric]}
            </button>
          ),
        )}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart
          data={chartData}
          margin={{ top: 4, right: 12, left: -4, bottom: 0 }}
        >
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="weekStart"
            tickFormatter={formatWeekStart}
            {...AXIS_PROPS}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal, maxVal]}
            tickFormatter={(v: number) => v.toFixed(1)}
            {...AXIS_PROPS}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip
            content={(props) => (
              <WeightTooltipContent
                active={props.active}
                payload={props.payload as WeightTooltipPayload[] | undefined}
                activeMetric={activeMetric}
              />
            )}
            cursor={{ stroke: TOKEN.border, strokeWidth: 1 }}
          />
          {/* P25-P75 band — Area with baseValue acts as a fill between two Y values */}
          <Area
            type="monotone"
            dataKey="p75Kg"
            stroke="none"
            fill={palette.tint}
            activeDot={false}
            legendType="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="p25Kg"
            stroke="none"
            fill={TOKEN.canvas}
            activeDot={false}
            legendType="none"
            isAnimationActive={false}
          />
          {/* Average line — dot only at last point */}
          <Line
            type="monotone"
            dataKey="avgKg"
            stroke={palette.primary}
            strokeWidth={2.5}
            dot={(dotProps: {
              index?: number;
              cx?: number;
              cy?: number;
            }) => {
              const isLast = dotProps.index === data.length - 1;
              if (!isLast || dotProps.cx === undefined || dotProps.cy === undefined)
                return <g key={`dot-${dotProps.index}`} />;
              return (
                <circle
                  key={`dot-${dotProps.index}`}
                  cx={dotProps.cx}
                  cy={dotProps.cy}
                  r={4}
                  fill={palette.primary}
                  stroke={TOKEN.card}
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 5, fill: palette.primary, stroke: TOKEN.card, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

// -----------------------------------------------------------------------------
// Chart 3: Volumen por grupo muscular (vertical bar)
// -----------------------------------------------------------------------------

interface VolumeTooltipPayload {
  payload?: VolumeByMuscleData & { label: string };
}

function VolumeTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: VolumeTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={TOOLTIP_CONTENT_STYLE}>
      <p style={{ color: TOKEN.text, fontSize: 12, fontWeight: 600 }}>
        {d.label}
      </p>
      <p style={TOOLTIP_ITEM_STYLE}>{d.totalSets} sets</p>
      <p style={TOOLTIP_ITEM_STYLE}>
        {d.totalVolumeKg.toLocaleString("es-CR")} kg
      </p>
      <p style={{ ...TOOLTIP_ITEM_STYLE, color: TOKEN.muted }}>
        {d.exerciseCount} ejercicio{d.exerciseCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

interface VolumeChartData extends VolumeByMuscleData {
  label: string;
}

function VolumeByMuscleChart({ data }: { data: VolumeByMuscleData[] }) {
  const { palette } = useBranding();
  if (data.length === 0) {
    return (
      <EmptyState message="Sin sesiones registradas en el periodo." />
    );
  }

  const chartData: VolumeChartData[] = data.map((d) => ({
    ...d,
    label: MUSCLE_LABELS[d.muscle] ?? d.muscle,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 12, left: -4, bottom: 4 }}
      >
        <CartesianGrid {...GRID_PROPS} vertical={false} />
        <XAxis
          dataKey="label"
          {...AXIS_PROPS}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fill: TOKEN.mutedLight, fontSize: 10 }}
          angle={-35}
          textAnchor="end"
          height={52}
        />
        <YAxis
          {...AXIS_PROPS}
          tickLine={false}
          axisLine={false}
          width={36}
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
        />
        <Tooltip
          content={(props) => (
            <VolumeTooltipContent
              active={props.active}
              payload={props.payload as VolumeTooltipPayload[] | undefined}
            />
          )}
          cursor={{ fill: TOKEN.hover }}
        />
        <Bar
          dataKey="totalSets"
          fill={palette.primary}
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
          activeBar={{ fill: palette.primaryHover }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

export function AggregateCharts({ aggregates, className }: AggregateChartsProps) {
  return (
    <section
      aria-label="Gráficos agregados del periodo"
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {/* Chart 1 — Adherencia */}
      <ChartCard
        title="Adherencia por cliente"
        subtitle="Top 10 · últimos 30 días"
      >
        <ClientAdherenceChart data={aggregates.adherenceChart.data} />
      </ChartCard>

      {/* Chart 2 — Tendencia de peso */}
      <ChartCard
        title="Tendencia de peso"
        subtitle="Promedio del grupo, banda P25-P75"
      >
        <WeightTrendChart data={aggregates.weightTrend.data} />
      </ChartCard>

      {/* Chart 3 — Volumen por grupo muscular */}
      <ChartCard
        title="Volumen por grupo muscular"
        subtitle="Sets totales en últimos 30 días"
      >
        <VolumeByMuscleChart data={aggregates.volumeByMuscle.data} />
      </ChartCard>
    </section>
  );
}
