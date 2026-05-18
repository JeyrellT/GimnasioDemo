"use client";

// =============================================================================
// BLACKLINE FITNESS — ClientProfileTabsClient
// Owner: frontend-react.
// Tabs de contexto histórico: Histórico / Rutina / Sesiones / Notas.
// =============================================================================

import * as React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { RoutineProgressCard } from "@/components/shared/routine-progress-card";
import { RecentSessionsList } from "@/components/shared/recent-sessions-list";
import { TrainerNotesEditor } from "@/components/forms/trainer-notes-editor";
import type { ActiveRoutine, RecentSession } from "@/types/profile";

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
  initialNotes: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ClientProfileTabsClient({
  clientId,
  activeRoutine,
  recentSessions,
  weightHistory,
  bodyFatHistory,
  muscleMassHistory,
  initialNotes,
}: ClientProfileTabsClientProps) {
  return (
    <Tabs defaultValue="historico" className="rounded-2xl border border-[#3F3F46] bg-[#18181B]">
      {/* Tab list — scroll horizontal en mobile */}
      <TabsList className="flex w-full justify-start overflow-x-auto rounded-none rounded-t-2xl border-b border-[#3F3F46] bg-transparent px-2 py-0">
        <TabsTrigger
          value="historico"
          className="shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-[#71717A] transition-colors data-[state=active]:border-[#FF6A1A] data-[state=active]:text-[#FAFAFA] data-[state=active]:bg-transparent hover:text-[#A1A1AA] focus-visible:outline-2 focus-visible:outline-[#FF6A1A]"
        >
          Histórico
        </TabsTrigger>
        <TabsTrigger
          value="rutina"
          className="shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-[#71717A] transition-colors data-[state=active]:border-[#FF6A1A] data-[state=active]:text-[#FAFAFA] data-[state=active]:bg-transparent hover:text-[#A1A1AA] focus-visible:outline-2 focus-visible:outline-[#FF6A1A]"
        >
          Rutina
        </TabsTrigger>
        <TabsTrigger
          value="sesiones"
          className="shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-[#71717A] transition-colors data-[state=active]:border-[#FF6A1A] data-[state=active]:text-[#FAFAFA] data-[state=active]:bg-transparent hover:text-[#A1A1AA] focus-visible:outline-2 focus-visible:outline-[#FF6A1A]"
        >
          Sesiones
        </TabsTrigger>
        <TabsTrigger
          value="notas"
          className="shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-[#71717A] transition-colors data-[state=active]:border-[#FF6A1A] data-[state=active]:text-[#FAFAFA] data-[state=active]:bg-transparent hover:text-[#A1A1AA] focus-visible:outline-2 focus-visible:outline-[#FF6A1A]"
        >
          Notas
        </TabsTrigger>
      </TabsList>

      {/* Histórico de composición corporal */}
      <TabsContent
        value="historico"
        className="min-h-[320px] space-y-6 p-4 focus-visible:outline-none"
      >
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
// Empty state helper
// -----------------------------------------------------------------------------

function EmptyTabState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <p className="text-center text-sm text-[#71717A]">{message}</p>
    </div>
  );
}
