"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, UserCheck, CalendarDays, Dumbbell, Clock, Target } from "lucide-react";
import { getRoutine } from "@/app/actions/routines";
import { searchExercises } from "@/app/actions/exercises";
import { RoutineBuilderClient } from "./routine-builder-client";
import { useRoutineBuilderStore } from "@/stores/routine-builder-store";
import type { RoutineDetail } from "@/server/actions/routines.actions";
import type { RoutineWithDays } from "@/types/domain";
// ── Goal config ───────────────────────────────────────────────────────────────

const GOAL_META: Record<string, { label: string; color: string; bg: string }> = {
  HYPERTROPHY: { label: "Hipertrofia",              color: "#A855F7", bg: "rgba(168,85,247,0.12)"  },
  STRENGTH:    { label: "Fuerza",                   color: "#EF4444", bg: "rgba(239,68,68,0.12)"   },
  ENDURANCE:   { label: "Resistencia",              color: "#22C55E", bg: "rgba(34,197,94,0.12)"   },
  FAT_LOSS:    { label: "Pérdida de grasa",         color: "#F59E0B", bg: "rgba(245,158,11,0.12)"  },
  GENERAL:     { label: "General / Mantenimiento",  color: "#A855F7", bg: "rgba(168,85,247,0.12)"  },
};

function getGoalMeta(goal: string) {
  return GOAL_META[goal] ?? { label: goal, color: "#A1A1AA", bg: "rgba(161,161,170,0.12)" };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  routineId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RoutineDetailClient({ routineId }: Props) {
  const [routine, setRoutine] = useState<RoutineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    async function load() {
      const [routineResult] = await Promise.all([
        getRoutine(routineId),
        searchExercises("", undefined, 1, 100),
      ]);

      if (!routineResult.ok) {
        setMissing(true);
        setLoading(false);
        return;
      }

      setRoutine(routineResult.value);
      setLoading(false);
    }

    load();
  }, [routineId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-label="Cargando rutina" />
      </div>
    );
  }

  if (missing || !routine) {
    return <NotFoundView />;
  }

  const goal = getGoalMeta(routine.goal);
  const storeDays = useRoutineBuilderStore((s) => s.days);
  const totalExercises = storeDays.length > 0
    ? storeDays.reduce((sum, d) => sum + d.exercises.length, 0)
    : routine.days.reduce((sum, d) => sum + d.exercises.length, 0);

  const summaryItems = [
    {
      icon: CalendarDays,
      text: `${routine.splitDays} ${routine.splitDays === 1 ? "día" : "días"}/semana`,
    },
    {
      icon: Dumbbell,
      text: `${totalExercises} ${totalExercises === 1 ? "ejercicio" : "ejercicios"}`,
    },
    {
      icon: Clock,
      text: `${routine.durationWeeks} ${routine.durationWeeks === 1 ? "semana" : "semanas"}`,
    },
    {
      icon: Target,
      text: goal.label,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#3F3F46] bg-[#18181B] overflow-hidden">
        {/* Gradient accent line */}
        <div
          className="h-[3px] w-full"
          style={{
            background: `linear-gradient(90deg, ${goal.color} 0%, transparent 100%)`,
          }}
          aria-hidden="true"
        />

        <div className="px-5 py-5 space-y-4">
          {/* Top row: title + assign button */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 min-w-0">
              {/* Goal badge */}
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: goal.color, backgroundColor: goal.bg }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: goal.color }}
                  aria-hidden="true"
                />
                {goal.label}
              </span>

              {/* Routine name */}
              <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] leading-tight truncate">
                {routine.name}
              </h1>
            </div>

            {/* Assign CTA */}
            <Link
              href={`/trainer/rutinas/${routineId}/asignar`}
              className="shrink-0 flex items-center gap-2 rounded-xl border border-[#3F3F46] bg-[#09090B] px-4 py-2.5 text-xs font-semibold text-[#FAFAFA] min-h-[44px] hover:border-brand-primary hover:text-brand-primary transition-colors"
            >
              <UserCheck className="h-4 w-4" aria-hidden="true" />
              Asignar
            </Link>
          </div>

          {/* Summary bar */}
          <div
            className="flex flex-wrap gap-x-5 gap-y-2 pt-2 border-t"
            style={{ borderColor: "#27272A" }}
          >
            {summaryItems.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: goal.color }}
                  aria-hidden="true"
                />
                <span className="text-xs text-[#A1A1AA]">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Builder ───────────────────────────────────────────────────────── */}
      <RoutineBuilderClient routine={routine as unknown as RoutineWithDays} />
    </div>
  );
}

// ── Not-found fallback (can't use notFound() outside RSC) ─────────────────────

function NotFoundView() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#3F3F46] px-6 py-20 text-center">
      <Dumbbell className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-[#FAFAFA]">Rutina no encontrada</p>
        <p className="mt-1 text-xs text-[#71717A]">
          La rutina no existe o fue eliminada.
        </p>
      </div>
      <Link
        href="/trainer/rutinas"
        className="text-xs text-brand-primary hover:text-brand-primary-hover transition-colors"
      >
        Volver a mis rutinas
      </Link>
    </div>
  );
}
