"use client";

// =============================================================================
// BLACKLINE FITNESS — RoutineProgressCard
// Owner: frontend-react.
// Muestra la rutina activa con barra de progreso. Si no hay rutina, empty state.
// =============================================================================

import * as React from "react";
import Link from "next/link";
import { Calendar, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyStateCard } from "@/components/shared/empty-state-card";
import type { ActiveRoutine } from "@/types/profile";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface RoutineProgressCardProps {
  routine: ActiveRoutine | null;
  clientId: string;
  className?: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function RoutineProgressCard({
  routine,
  clientId,
  className,
}: RoutineProgressCardProps) {
  if (!routine) {
    return (
      <EmptyStateCard
        icon={Dumbbell}
        title="Sin rutina activa"
        description="Asigná una rutina para que el cliente empiece a entrenar."
        actionLabel="Asignar rutina"
        actionHref={`/trainer/clientes/${clientId}/rutinas`}
        className={className}
      />
    );
  }

  const pct = Math.min(100, Math.max(0, routine.completionPct));

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-[#3F3F46] bg-[#18181B] p-5",
        className,
      )}
      role="region"
      aria-label={`Rutina activa: ${routine.name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#71717A]">
            Rutina activa
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-[#FAFAFA]">
            {routine.name}
          </h3>
        </div>
        <Link
          href={`/trainer/clientes/${clientId}/rutinas`}
          className="shrink-0 rounded-lg border border-[#3F3F46] bg-transparent px-3 py-1.5 text-xs font-semibold text-[#FAFAFA] transition-colors hover:bg-[#27272A] focus-visible:outline-2 focus-visible:outline-[#FF6A1A] focus-visible:outline-offset-2"
          aria-label={`Ver rutina ${routine.name}`}
        >
          Ver rutina
        </Link>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[#71717A]">
          <span>
            Día {routine.currentDayIndex + 1} / {routine.totalDays}
          </span>
          <span
            className="font-semibold text-[#FAFAFA]"
            aria-label={`${pct}% completado`}
          >
            {pct}%
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-[#27272A]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso de la rutina: ${pct}%`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FF6A1A] to-[#F5C542] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Fechas */}
      <div className="flex flex-wrap gap-4 text-xs text-[#71717A]">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Inicio: {formatDate(routine.startsOn)}</span>
        </div>
        {routine.endsOn && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Fin: {formatDate(routine.endsOn)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
