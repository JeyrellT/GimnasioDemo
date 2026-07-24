"use client";

// =============================================================================
// BLACKLINE FITNESS — Avance de medidas del cliente
//
// El coach entrena a cada cliente de forma personal: el cliente necesita ver
// su cambio semana a semana y mes a mes, no solo el último número.
// =============================================================================

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Ruler, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { getMyMetrics } from "@/app/actions/client-portal";
import type { MyBodyMetric } from "@/server/actions/client-portal.actions";
import { KpiSparkline } from "@/components/charts/kpi-sparkline";
import {
  GROUP_LABELS,
  buildFieldProgress,
  buildWindowComparison,
  formatDelta,
  formatValue,
  type FieldProgress,
  type MeasurementField,
  type ProgressWindow,
} from "@/lib/metrics/progress";

const WINDOWS: { id: ProgressWindow; label: string }[] = [
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "all", label: "Todo" },
];

const HIGHLIGHT_KEYS = ["weightKg", "bodyFatPct", "muscleMassKg"];

// -----------------------------------------------------------------------------
// Chip de cambio
// -----------------------------------------------------------------------------

function DeltaChip({
  delta,
  improving,
  field,
}: {
  delta: number | null;
  improving: boolean | null;
  field: MeasurementField;
}) {
  if (delta === null) {
    return (
      <span className="text-[11px] text-neutral-600">Sin comparación</span>
    );
  }

  const isFlat = Math.abs(delta) < 0.05;
  const tone = isFlat
    ? "text-neutral-500"
    : improving === true
      ? "text-emerald-400"
      : improving === false
        ? "text-red-400"
        : "text-neutral-300";

  const Icon = isFlat ? Minus : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums ${tone}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {formatDelta(delta, field)}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Tarjeta destacada (peso / grasa / músculo)
// -----------------------------------------------------------------------------

function HighlightCard({
  progress,
  windowDelta,
  windowImproving,
}: {
  progress: FieldProgress;
  windowDelta: number | null;
  windowImproving: boolean | null;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-xs text-neutral-500">{progress.field.label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-neutral-50">
        {formatValue(progress.current, progress.field)}
      </p>
      <div className="mt-1">
        <DeltaChip
          delta={windowDelta}
          improving={windowImproving}
          field={progress.field}
        />
      </div>
      {progress.series.length > 1 && (
        <div className="mt-2 -mx-1">
          <KpiSparkline data={progress.series} height={28} />
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Fila por medida
// -----------------------------------------------------------------------------

function MeasurementRow({
  progress,
  windowDelta,
  windowImproving,
}: {
  progress: FieldProgress;
  windowDelta: number | null;
  windowImproving: boolean | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-neutral-300">
          {progress.field.label}
        </p>
        <DeltaChip
          delta={windowDelta}
          improving={windowImproving}
          field={progress.field}
        />
      </div>
      {progress.series.length > 1 && (
        <div className="hidden w-20 shrink-0 sm:block">
          <KpiSparkline data={progress.series} height={24} />
        </div>
      )}
      <p className="shrink-0 text-sm font-semibold tabular-nums text-neutral-100">
        {formatValue(progress.current, progress.field)}
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sección principal
// -----------------------------------------------------------------------------

export function MeasurementsProgress({ userId }: { userId: string }) {
  const [range, setWindow] = useState<ProgressWindow>("month");

  const metricsQuery = useQuery<MyBodyMetric[]>({
    queryKey: ["client-metrics", userId],
    queryFn: async () => {
      const r = await getMyMetrics();
      if (!r.ok) throw new Error(r.error.message);
      return r.value;
    },
    staleTime: 30_000,
    enabled: Boolean(userId),
  });

  const metrics = useMemo(() => metricsQuery.data ?? [], [metricsQuery.data]);

  const progress = useMemo(() => buildFieldProgress(metrics), [metrics]);

  // `now` se calcula en el render del cliente a propósito: las ventanas son
  // relativas al momento en que el cliente mira la pantalla.
  const comparisons = useMemo(
    () => buildWindowComparison(metrics, range, new Date()),
    [metrics, range],
  );

  const comparisonByKey = useMemo(
    () => new Map(comparisons.map((c) => [c.field.key, c])),
    [comparisons],
  );

  if (metricsQuery.isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (metricsQuery.isError) {
    return (
      <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3 text-sm text-[#FBBF24]">
        No pudimos cargar tus medidas. Reintentá en un momento.
      </div>
    );
  }

  if (progress.length === 0) {
    return (
      <div className="py-12 text-center">
        <Ruler className="mx-auto mb-3 h-10 w-10 text-neutral-700" aria-hidden="true" />
        <p className="text-sm text-neutral-500">Aún no tenés medidas registradas.</p>
        <p className="mt-1 text-xs text-neutral-600">
          Registrá tu primera medición para empezar a ver tu avance.
        </p>
      </div>
    );
  }

  const highlights = HIGHLIGHT_KEYS.map((key) =>
    progress.find((p) => p.field.key === key),
  ).filter((p): p is FieldProgress => p !== undefined);

  const rest = progress.filter((p) => !HIGHLIGHT_KEYS.includes(p.field.key));

  const groups: MeasurementField["group"][] = ["tronco", "brazos", "piernas", "composicion"];

  // Una sola medición no permite comparar contra nada: hay que decirlo en vez
  // de mostrar "sin comparación" repetido en cada fila sin explicación.
  const hasAnyComparison = comparisons.some((c) => c.delta !== null);

  return (
    <div className="space-y-4">
      {/* Selector de ventana */}
      <div
        role="tablist"
        aria-label="Período de comparación"
        className="flex rounded-xl border border-neutral-800 p-1"
      >
        {WINDOWS.map((w) => (
          <button
            key={w.id}
            type="button"
            role="tab"
            aria-selected={range === w.id}
            onClick={() => setWindow(w.id)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-primary ${
              range === w.id
                ? "bg-neutral-800 text-neutral-50"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      {!hasAnyComparison && (
        <p className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-neutral-400">
          {metrics.length <= 1
            ? "Con una sola medición todavía no hay avance que mostrar. En tu próxima medición vas a ver el cambio acá."
            : "No hay una medición previa dentro de este período. Probá con “Todo”."}
        </p>
      )}

      {/* Destacados */}
      {highlights.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {highlights.map((p) => {
            const c = comparisonByKey.get(p.field.key);
            return (
              <HighlightCard
                key={p.field.key}
                progress={p}
                windowDelta={c?.delta ?? null}
                windowImproving={c?.improving ?? null}
              />
            );
          })}
        </div>
      )}

      {/* Resto agrupado por zona */}
      {groups.map((group) => {
        const inGroup = rest.filter((p) => p.field.group === group);
        if (inGroup.length === 0) return null;
        return (
          <section key={group} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {GROUP_LABELS[group]}
            </h3>
            <div className="space-y-1.5">
              {inGroup.map((p) => {
                const c = comparisonByKey.get(p.field.key);
                return (
                  <MeasurementRow
                    key={p.field.key}
                    progress={p}
                    windowDelta={c?.delta ?? null}
                    windowImproving={c?.improving ?? null}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
