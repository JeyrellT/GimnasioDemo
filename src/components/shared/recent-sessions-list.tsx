"use client";

// =============================================================================
// FORJA — RecentSessionsList
// Owner: frontend-react.
// Lista de últimas 5 sesiones con fecha relativa, duración, ejercicios y badge PR.
// =============================================================================

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Clock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyStateCard } from "@/components/shared/empty-state-card";
import type { RecentSession } from "@/types/profile";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface RecentSessionsListProps {
  sessions: RecentSession[];
  clientId: string;
  className?: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Formatea la fecha de sesión como "lun 5 may" (es-CR locale).
 * Ej: "vie 2 may", "mié 30 abr".
 */
function formatSessionDate(date: Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

/**
 * Formatea duración en segundos a "1h 05min" o "45min".
 * Los minutos siempre van zero-padded cuando hay horas.
 */
function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) {
    const paddedM = String(m).padStart(2, "0");
    return `${h}h ${paddedM}min`;
  }
  return `${m}min`;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function RecentSessionsList({
  sessions,
  clientId,
  className,
}: RecentSessionsListProps) {
  if (sessions.length === 0) {
    return (
      <EmptyStateCard
        icon={CalendarDays}
        title="Sin sesiones recientes"
        description="Las sesiones completadas aparecerán acá. ¡Empezá a entrenar!"
        className={className}
      />
    );
  }

  return (
    <div
      className={cn("space-y-2", className)}
      role="list"
      aria-label="Últimas sesiones"
    >
      {sessions.map((session) => (
        <Link
          key={session.id}
          href={`/trainer/clientes/${clientId}/sesiones/${session.id}`}
          role="listitem"
          className="flex items-center gap-4 rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 transition-colors hover:bg-[#27272A] focus-visible:outline-2 focus-visible:outline-[#FF6A1A] focus-visible:outline-offset-2"
          aria-label={`Sesión del ${formatSessionDate(session.date)}, ${formatDuration(session.durationSec)}, ${session.exerciseCount} ejercicio${session.exerciseCount !== 1 ? "s" : ""}${session.prDetected ? ", nuevo PR detectado" : ""}`}
        >
          {/* Fecha — "lun 5 may" */}
          <div className="shrink-0">
            <p className="text-xs tabular-nums text-[#A1A1AA]">
              {formatSessionDate(session.date)}
            </p>
          </div>

          {/* Divisor */}
          <div className="h-10 w-px shrink-0 bg-[#3F3F46]" aria-hidden="true" />

          {/* Stats */}
          <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5 text-sm text-[#A1A1AA]">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{formatDuration(session.durationSec)}</span>
            </div>
            <span className="rounded-md bg-[#27272A] px-2 py-0.5 text-xs font-medium text-[#A1A1AA]">
              {session.exerciseCount} ej.
            </span>
          </div>

          {/* PR badge */}
          {session.prDetected && (
            <div
              className="flex shrink-0 items-center gap-1 rounded-full bg-[rgba(245,197,66,0.12)] px-2.5 py-1"
              aria-label="Nuevo PR detectado"
            >
              <Trophy className="h-3 w-3 text-[#F5C542]" aria-hidden="true" />
              <span className="text-xs font-semibold text-[#F5C542]">PR</span>
            </div>
          )}
        </Link>
      ))}

      {/* Ver todas */}
      <Link
        href={`/trainer/clientes/${clientId}/sesiones`}
        className="flex items-center justify-center rounded-xl border border-[#3F3F46] py-3 text-sm font-medium text-[#71717A] transition-colors hover:bg-[#27272A] hover:text-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-[#FF6A1A] focus-visible:outline-offset-2"
        aria-label="Ver todas las sesiones"
      >
        Ver todas las sesiones
      </Link>
    </div>
  );
}
