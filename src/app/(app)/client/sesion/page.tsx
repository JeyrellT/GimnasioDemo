"use client";

// =============================================================================
// VIZION — /client/sesion — Today's workout plan
// =============================================================================

import { useEffect, useState, type ReactNode } from "react";
import {
  Loader2,
  Dumbbell,
  Calendar,
  Clock,
  Flame,
  ChevronRight,
  Repeat2,
} from "lucide-react";
import { useDemoUser } from "@/lib/demo/auth-context";
import {
  getActiveAssignedRoutine,
  listSessionsForClient,
  getRoutine,
  getExercise,
} from "@/lib/demo/store";
import type {
  DemoAssignedRoutineRow,
  DemoRoutineRow,
  DemoRoutineDay,
  DemoSessionRow,
  DemoExerciseRow,
} from "@/lib/offline/db";

// ── Label maps ────────────────────────────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  HYPERTROPHY: "Hipertrofia",
  STRENGTH: "Fuerza",
  ENDURANCE: "Resistencia",
  FAT_LOSS: "Pérd. grasa",
  GENERAL: "General",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  BARBELL: "Barra",
  DUMBBELL: "Mancuernas",
  MACHINE: "Máquina",
  CABLE: "Polea",
  BODY_WEIGHT: "Corporal",
  OTHER: "Otro",
};

const MUSCLE_LABELS: Record<string, string> = {
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
  FULL_BODY: "Cuerpo completo",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function weeksRemaining(endsOn: string | null): number | null {
  if (!endsOn) return null;
  const end = new Date(endsOn);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

// ── Loaded exercise data shape ────────────────────────────────────────────────

interface EnrichedExercise {
  planEntry: DemoRoutineDay["exercises"][number];
  exercise: DemoExerciseRow;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SesionHoyPage() {
  const user = useDemoUser();

  const [loading, setLoading] = useState(true);
  const [assigned, setAssigned] = useState<DemoAssignedRoutineRow | null>(null);
  const [routine, setRoutine] = useState<DemoRoutineRow | null>(null);
  const [todayDay, setTodayDay] = useState<DemoRoutineDay | null>(null);
  const [exercises, setExercises] = useState<EnrichedExercise[]>([]);
  const [recentSessions, setRecentSessions] = useState<DemoSessionRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const [assignedRoutine, allSessions] = await Promise.all([
        getActiveAssignedRoutine(user.id),
        listSessionsForClient(user.id),
      ]);

      if (cancelled) return;

      if (!assignedRoutine) {
        setAssigned(null);
        setLoading(false);
        return;
      }

      setAssigned(assignedRoutine);

      const routineData = await getRoutine(assignedRoutine.routineTemplateId);
      if (cancelled) return;

      if (!routineData) {
        setLoading(false);
        return;
      }

      setRoutine(routineData);

      // Completed sessions for this assigned routine, sorted oldest → newest
      const completedSessions = allSessions
        .filter(
          (s) =>
            s.assignedRoutineId === assignedRoutine.id &&
            s.status === "COMPLETED",
        )
        .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!));

      // Next day = count completed sessions mod splitDays
      const nextDayIndex = completedSessions.length % routineData.splitDays;
      const day =
        routineData.daysJson.find((d) => d.dayIndex === nextDayIndex) ??
        routineData.daysJson[0] ??
        null;

      setTodayDay(day);

      // Recent sessions for display (last 5, newest first)
      const recent = [...completedSessions]
        .reverse()
        .slice(0, 5);
      setRecentSessions(recent);

      // Load exercise details in parallel
      if (day) {
        const enriched = await Promise.all(
          day.exercises.map(async (entry) => {
            const ex = await getExercise(entry.exerciseId);
            return ex ? { planEntry: entry, exercise: ex } : null;
          }),
        );
        if (!cancelled) {
          setExercises(
            enriched.filter((e): e is EnrichedExercise => e !== null),
          );
        }
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  // ── No routine ────────────────────────────────────────────────────────────

  if (!assigned) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="py-16 text-center">
          <Dumbbell className="mx-auto mb-4 h-12 w-12 text-neutral-700" />
          <p className="text-sm text-neutral-400">
            No tenés una rutina asignada.
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Tu entrenador te asignará una pronto.
          </p>
        </div>
      </div>
    );
  }

  const weeksLeft = weeksRemaining(assigned.endsOn);

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* Active routine card */}
      {routine && (
        <section
          aria-labelledby="routine-heading"
          className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-neutral-600">
                Rutina activa
              </p>
              <h2
                id="routine-heading"
                className="mt-1 text-base font-bold text-neutral-50 leading-snug"
              >
                {routine.name}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-[#FF6A1A]/15 px-2.5 py-1 text-[11px] font-semibold text-[#FF6A1A]">
              {GOAL_LABELS[routine.goal] ?? routine.goal}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-neutral-800">
            <RoutineStat
              label="Días/ciclo"
              value={`${routine.splitDays}`}
              icon={<Repeat2 className="h-3.5 w-3.5" />}
            />
            <RoutineStat
              label="Duración"
              value={`${routine.durationWeeks} sem`}
              icon={<Calendar className="h-3.5 w-3.5" />}
            />
            <RoutineStat
              label={weeksLeft != null && weeksLeft <= 0 ? "Vencida" : "Restan"}
              value={weeksLeft != null ? `${weeksLeft} sem` : "—"}
              icon={<Clock className="h-3.5 w-3.5" />}
              highlight={weeksLeft != null && weeksLeft <= 2}
            />
          </div>
        </section>
      )}

      {/* Today's workout */}
      <section aria-labelledby="workout-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="workout-heading" className="text-lg font-bold text-neutral-50">
            Entrenamiento de hoy
          </h2>
          {todayDay && (
            <span className="text-[11px] text-neutral-500">
              Día {(todayDay.dayIndex ?? 0) + 1} de{" "}
              {routine?.splitDays ?? "—"}
            </span>
          )}
        </div>

        {!todayDay ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 py-12 text-center">
            <Dumbbell className="mx-auto mb-3 h-8 w-8 text-neutral-700" />
            <p className="text-sm text-neutral-500">
              No hay entrenamiento disponible.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
            {/* Day name header */}
            <div className="border-b border-neutral-800 bg-neutral-900/80 px-4 py-3">
              <p className="text-sm font-semibold text-[#FF6A1A]">
                {todayDay.name}
              </p>
            </div>

            {/* Exercise list */}
            {exercises.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-neutral-500">
                  No se encontraron ejercicios.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-800">
                {exercises
                  .sort((a, b) => a.planEntry.order - b.planEntry.order)
                  .map(({ planEntry, exercise }) => (
                    <li key={planEntry.id} className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        {/* Order badge */}
                        <span
                          aria-hidden="true"
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-bold tabular-nums text-neutral-400"
                        >
                          {planEntry.order + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          {/* Name */}
                          <p className="text-sm font-semibold text-neutral-100 leading-snug">
                            {exercise.nameEs}
                          </p>

                          {/* Sets × reps + RPE */}
                          <p className="mt-1 text-sm tabular-nums text-neutral-300">
                            {planEntry.targetSets} series ×{" "}
                            {planEntry.targetRepsMin === planEntry.targetRepsMax
                              ? planEntry.targetRepsMin
                              : `${planEntry.targetRepsMin}–${planEntry.targetRepsMax}`}{" "}
                            reps
                            {planEntry.targetRpe != null && (
                              <span className="ml-2 text-neutral-500">
                                · RPE {planEntry.targetRpe}
                              </span>
                            )}
                          </p>

                          {/* Badges row */}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge variant="muscle">
                              {MUSCLE_LABELS[exercise.primaryMuscle] ??
                                exercise.primaryMuscle}
                            </Badge>
                            <Badge variant="equipment">
                              {EQUIPMENT_LABELS[exercise.equipment] ??
                                exercise.equipment}
                            </Badge>
                            <Badge variant="rest">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              {planEntry.restSeconds}s descanso
                            </Badge>
                          </div>

                          {/* Notes */}
                          {planEntry.notes && (
                            <p className="mt-1.5 text-xs italic text-neutral-600">
                              {planEntry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Recent sessions */}
      {recentSessions.length > 0 && routine && (
        <section aria-labelledby="history-heading">
          <h2
            id="history-heading"
            className="mb-3 text-lg font-bold text-neutral-50"
          >
            Sesiones recientes
          </h2>

          <ul className="space-y-2">
            {recentSessions.map((session) => {
              const sessionDay = routine.daysJson.find(
                (d) => d.dayIndex === session.dayIndex,
              );
              return (
                <li key={session.id}>
                  <SessionCard
                    session={session}
                    dayName={sessionDay?.name ?? null}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PageHeader() {
  const today = formatDate(new Date().toISOString());
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-50">Sesión de hoy</h1>
      <p className="mt-1 text-sm capitalize text-neutral-500">{today}</p>
    </div>
  );
}

function RoutineStat({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2 first:pl-0 last:pr-0">
      <span
        className={`flex items-center gap-1 text-[10px] ${highlight ? "text-[#FF6A1A]" : "text-neutral-500"}`}
      >
        {icon}
        {label}
      </span>
      <span
        className={`text-base font-bold tabular-nums ${highlight ? "text-[#FF6A1A]" : "text-neutral-100"}`}
      >
        {value}
      </span>
    </div>
  );
}

function Badge({
  variant,
  children,
}: {
  variant: "muscle" | "equipment" | "rest";
  children: ReactNode;
}) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium";
  const styles = {
    muscle: "bg-neutral-800 text-neutral-400",
    equipment: "bg-neutral-800 text-neutral-400",
    rest: "bg-neutral-800 text-neutral-500",
  };
  return <span className={`${base} ${styles[variant]}`}>{children}</span>;
}

function SessionCard({
  session,
  dayName,
}: {
  session: DemoSessionRow;
  dayName: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 min-h-[44px]">
      {/* Date */}
      <div className="shrink-0 text-center">
        <p className="text-xs font-semibold tabular-nums text-neutral-300">
          {session.completedAt
            ? formatShortDate(session.completedAt)
            : "—"}
        </p>
      </div>

      <ChevronRight
        className="h-3.5 w-3.5 shrink-0 text-neutral-700"
        aria-hidden="true"
      />

      {/* Day name */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-neutral-300">
          {dayName ?? "Entrenamiento libre"}
        </p>
      </div>

      {/* Stats */}
      <div className="flex shrink-0 items-center gap-3">
        {session.totalDurationSec != null && (
          <div className="flex items-center gap-1 text-[11px] tabular-nums text-neutral-500">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatDuration(session.totalDurationSec)}
          </div>
        )}
        {session.subjectiveFatigue != null && (
          <div className="flex items-center gap-1 text-[11px] tabular-nums text-neutral-500">
            <Flame className="h-3 w-3" aria-hidden="true" />
            {session.subjectiveFatigue}/5
          </div>
        )}
      </div>
    </div>
  );
}
