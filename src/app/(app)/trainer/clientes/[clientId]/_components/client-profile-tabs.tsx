"use client";

// =============================================================================
// BLACKLINE FITNESS — ClientProfileTabsClient
// Owner: frontend-react.
// Tabs de contexto histórico: Histórico / Rutina / Sesiones / Notas.
// Controlled via ?tab= search param — survives refresh and supports deep-linking.
// =============================================================================

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { RoutineProgressCard } from "@/components/shared/routine-progress-card";
import { RecentSessionsList } from "@/components/shared/recent-sessions-list";
import { TrainerNotesEditor } from "@/components/forms/trainer-notes-editor";
import { KpiSparkline } from "@/components/charts/kpi-sparkline";
import type { ActiveRoutine, BodyZone, RecentSession } from "@/types/profile";

// Charts de histórico
import { WeightTrendChart } from "./weight-trend-chart";
import { BodyFatTrendChart } from "./body-fat-trend-chart";
import { MuscleMassTrendChart } from "./muscle-mass-trend-chart";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ClientProfileTabsClientProps {
  clientId: string;
  activeRoutine: ActiveRoutine | null;
  recentSessions: RecentSession[];
  weightHistory: number[];
  bodyFatHistory: number[];
  muscleMassHistory: number[];
  measurementHighlights: MeasurementHighlight[];
  initialNotes: string;
}

interface MeasurementHighlight {
  zone: BodyZone;
  label: string;
  valueCm: number;
  deltaCm: number;
  measuredAt: Date;
  trendSparkline: number[];
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const VALID_TABS = ["historico", "rutina", "sesiones", "notas"] as const;
type TabValue = (typeof VALID_TABS)[number];

function isValidTab(v: string | null): v is TabValue {
  return VALID_TABS.includes(v as TabValue);
}

function latestDelta(data: number[]) {
  const latest = data.at(-1);
  if (latest === undefined) return null;
  const previous = data.at(-2) ?? null;
  return {
    latest,
    delta: previous === null ? 0 : Math.round((latest - previous) * 10) / 10,
  };
}

function formatSigned(value: number, unit: string) {
  if (Math.abs(value) < 0.05) return `0.0 ${unit}`;
  const sign = value > 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(1)} ${unit}`;
}

export function ClientProfileTabsClient({
  clientId,
  activeRoutine,
  recentSessions,
  weightHistory,
  bodyFatHistory,
  muscleMassHistory,
  measurementHighlights,
  initialNotes,
}: ClientProfileTabsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabValue = isValidTab(rawTab) ? rawTab : "historico";
  const compositionSummary = [
    {
      label: "Peso",
      unit: "kg",
      series: weightHistory,
      metric: latestDelta(weightHistory),
    },
    {
      label: "Grasa",
      unit: "%",
      series: bodyFatHistory,
      metric: latestDelta(bodyFatHistory),
    },
    {
      label: "Masa muscular",
      unit: "kg",
      series: muscleMassHistory,
      metric: latestDelta(muscleMassHistory),
    },
  ];

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="rounded-2xl border border-[#3F3F46] bg-[#18181B]">
      {/* Tab list — scroll horizontal en mobile */}
      <TabsList className="flex w-full justify-start overflow-x-auto rounded-none rounded-t-2xl border-b border-[#3F3F46] bg-transparent px-2 py-0">
        <TabsTrigger
          value="historico"
          className="shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-[#71717A] transition-colors data-[state=active]:border-brand-primary data-[state=active]:text-[#FAFAFA] data-[state=active]:bg-transparent hover:text-[#A1A1AA] focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          Histórico
        </TabsTrigger>
        <TabsTrigger
          value="rutina"
          className="shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-[#71717A] transition-colors data-[state=active]:border-brand-primary data-[state=active]:text-[#FAFAFA] data-[state=active]:bg-transparent hover:text-[#A1A1AA] focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          Rutina
        </TabsTrigger>
        <TabsTrigger
          value="sesiones"
          className="shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-[#71717A] transition-colors data-[state=active]:border-brand-primary data-[state=active]:text-[#FAFAFA] data-[state=active]:bg-transparent hover:text-[#A1A1AA] focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          Sesiones
        </TabsTrigger>
        <TabsTrigger
          value="notas"
          className="shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-[#71717A] transition-colors data-[state=active]:border-brand-primary data-[state=active]:text-[#FAFAFA] data-[state=active]:bg-transparent hover:text-[#A1A1AA] focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          Notas
        </TabsTrigger>
      </TabsList>

      {/* Histórico de composición corporal */}
      <TabsContent
        value="historico"
        className="min-h-[320px] space-y-6 p-4 focus-visible:outline-none"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#71717A]">
              Último cambio registrado
            </h3>
            <p className="text-xs text-[#71717A]">vs medición anterior</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {compositionSummary.map((item) => (
              <HistoryDeltaCard
                key={item.label}
                label={item.label}
                value={item.metric?.latest ?? null}
                delta={item.metric?.delta ?? null}
                unit={item.unit}
                sparkline={item.series}
              />
            ))}
          </div>
          {measurementHighlights.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {measurementHighlights.map((item) => (
                <HistoryDeltaCard
                  key={item.zone}
                  label={item.label}
                  value={item.valueCm}
                  delta={item.deltaCm}
                  unit="cm"
                  sparkline={item.trendSparkline}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        {/* Tendencia de peso */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#71717A]">
            Tendencia de peso
          </h3>
          {weightHistory.length >= 2 ? (
            <WeightTrendChart data={weightHistory} />
          ) : (
            <EmptyTabState message="Sin historial de peso. Empezá registrando mediciones." />
          )}
        </div>

        {/* Porcentaje de grasa */}
        <div className="space-y-2 border-t border-[#27272A] pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#71717A]">
            Porcentaje de grasa
          </h3>
          {bodyFatHistory.length >= 2 ? (
            <BodyFatTrendChart data={bodyFatHistory} />
          ) : (
            <EmptyTabState message="Sin historial de grasa corporal." />
          )}
        </div>

        {/* Masa muscular */}
        <div className="space-y-2 border-t border-[#27272A] pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[#71717A]">
            Masa muscular
          </h3>
          {muscleMassHistory.length >= 2 ? (
            <MuscleMassTrendChart data={muscleMassHistory} />
          ) : (
            <EmptyTabState message="Sin historial de masa muscular." />
          )}
        </div>
      </TabsContent>

      {/* Rutina activa */}
      <TabsContent
        value="rutina"
        className="min-h-[320px] p-4 focus-visible:outline-none"
      >
        <RoutineProgressCard routine={activeRoutine} clientId={clientId} />
      </TabsContent>

      {/* Últimas sesiones */}
      <TabsContent
        value="sesiones"
        className="min-h-[320px] p-4 focus-visible:outline-none"
      >
        <RecentSessionsList sessions={recentSessions} clientId={clientId} />
      </TabsContent>

      {/* Notas privadas */}
      <TabsContent
        value="notas"
        className="min-h-[320px] p-4 focus-visible:outline-none"
      >
        <TrainerNotesEditor clientId={clientId} initialNotes={initialNotes} />
      </TabsContent>
    </Tabs>
  );
}

// -----------------------------------------------------------------------------
// History helpers
// -----------------------------------------------------------------------------

function HistoryDeltaCard({
  label,
  value,
  delta,
  unit,
  sparkline,
  compact = false,
}: {
  label: string;
  value: number | null;
  delta: number | null;
  unit: string;
  sparkline: number[];
  compact?: boolean;
}) {
  const isPositive = delta !== null && delta > 0.05;
  const isNegative = delta !== null && delta < -0.05;
  const deltaTone = isPositive
    ? "text-[#22C55E]"
    : isNegative
      ? "text-[#EF4444]"
      : "text-[#A1A1AA]";
  const arrow = isPositive ? "↑" : isNegative ? "↓" : "→";

  return (
    <div className="min-w-0 rounded-xl border border-[#27272A] bg-[#111113] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A]">
            {label}
          </p>
          <p
            className={compact ? "mt-1 text-base font-bold text-[#FAFAFA]" : "mt-1 text-lg font-bold text-[#FAFAFA]"}
            style={{ fontFeatureSettings: "'tnum' 1" }}
          >
            {value !== null ? `${value.toFixed(1)} ${unit}` : "—"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full bg-[#18181B] px-2 py-1 text-xs font-semibold ${deltaTone}`}
          style={{ fontFeatureSettings: "'tnum' 1" }}
        >
          {delta !== null ? `${arrow} ${formatSigned(delta, unit)}` : "—"}
        </span>
      </div>
      <div className="mt-3 h-7">
        <KpiSparkline data={sparkline} height={28} />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Empty state helper
// -----------------------------------------------------------------------------

function EmptyTabState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <p className="text-center text-sm text-[#71717A]">{message}</p>
    </div>
  );
}
