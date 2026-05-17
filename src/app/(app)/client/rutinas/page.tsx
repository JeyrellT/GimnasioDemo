"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ClipboardList,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Play,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  listAssignedRoutines,
  getRoutine,
  getExercise,
} from "@/lib/demo/store";
import type {
  DemoAssignedRoutineRow,
  DemoRoutineRow,
  DemoRoutineDay,
  DemoExerciseRow,
} from "@/lib/offline/db";
import { ExerciseVideoModal } from "@/components/client/ExerciseVideoModal";
import { getExerciseVideoUrl } from "@/lib/demo/exercise-videos";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExerciseWithDetails {
  exerciseId: string;
  exercise: DemoExerciseRow | null;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRpe: number | null;
  restSeconds: number;
  notes: string | null;
}

interface DayWithExercises {
  day: DemoRoutineDay;
  exercises: ExerciseWithDetails[];
}

interface RoutineCard {
  assigned: DemoAssignedRoutineRow;
  routine: DemoRoutineRow | null;
  days: DayWithExercises[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClientRutinasPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<RoutineCard[]>([]);
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithDetails | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) { setLoading(false); return; }
      const assigned = await listAssignedRoutines(user.id);
      // Sort: ACTIVE first, then by date descending
      const sorted = [...assigned].sort((a, b) => {
        if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
        if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;
        return b.startsOn.localeCompare(a.startsOn);
      });

      const result: RoutineCard[] = await Promise.all(
        sorted.map(async (ar) => {
          const routine = (await getRoutine(ar.routineTemplateId)) ?? null;
          const days: DayWithExercises[] = routine
            ? await Promise.all(
                routine.daysJson.map(async (day) => {
                  const exercises = await Promise.all(
                    day.exercises.map(async (ex) => ({
                      exerciseId: ex.exerciseId,
                      exercise: (await getExercise(ex.exerciseId)) ?? null,
                      targetSets: ex.targetSets,
                      targetRepsMin: ex.targetRepsMin,
                      targetRepsMax: ex.targetRepsMax,
                      targetRpe: ex.targetRpe,
                      restSeconds: ex.restSeconds,
                      notes: ex.notes,
                    })),
                  );
                  return { day, exercises };
                }),
              )
            : [];
          return { assigned: ar, routine, days };
        }),
      );

      setCards(result);
      // Auto-expand active routine
      const active = result.find((c) => c.assigned.status === "ACTIVE");
      if (active) setExpandedRoutine(active.assigned.id);
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#71717A]" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 text-center space-y-4">
        <ClipboardList className="h-12 w-12 text-[#52525B] mx-auto" />
        <h2 className="text-xl font-bold text-[#FAFAFA]">Sin rutinas asignadas</h2>
        <p className="text-sm text-[#A1A1AA]">
          Tu entrenador aun no te ha asignado una rutina.
        </p>
      </div>
    );
  }

  const activeCount = cards.filter((c) => c.assigned.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Mis rutinas</h1>
        <p className="text-sm text-[#71717A] mt-1">
          {activeCount} activa{activeCount !== 1 ? "s" : ""} de {cards.length} total
        </p>
      </div>

      {/* Routine cards */}
      <div className="space-y-4">
        {cards.map((card) => {
          const { assigned, routine, days } = card;
          const isActive = assigned.status === "ACTIVE";
          const isExpanded = expandedRoutine === assigned.id;

          return (
            <div
              key={assigned.id}
              className={[
                "rounded-xl border overflow-hidden transition-colors",
                isActive
                  ? "border-[#FF6A1A]/40 bg-[#18181B]"
                  : "border-[#3F3F46] bg-[#18181B]/60 opacity-70",
              ].join(" ")}
            >
              {/* Card header */}
              <button
                type="button"
                onClick={() =>
                  setExpandedRoutine(isExpanded ? null : assigned.id)
                }
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      isActive ? "bg-[#FF6A1A]/15" : "bg-[#27272A]",
                    ].join(" ")}
                  >
                    <Dumbbell
                      className={[
                        "h-5 w-5",
                        isActive ? "text-[#FF6A1A]" : "text-[#52525B]",
                      ].join(" ")}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[#FAFAFA]">
                        {routine?.name ?? "Rutina"}
                      </p>
                      {isActive && (
                        <span className="shrink-0 rounded-full bg-[#22C55E]/15 px-2 py-0.5 text-[10px] font-semibold text-[#22C55E] uppercase tracking-wide">
                          Activa
                        </span>
                      )}
                      {!isActive && (
                        <span className="shrink-0 rounded-full bg-[#27272A] px-2 py-0.5 text-[10px] font-semibold text-[#71717A] uppercase tracking-wide">
                          {assigned.status === "COMPLETED"
                            ? "Completada"
                            : "Archivada"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-[#71717A]">
                      {routine && (
                        <>
                          <span>{routine.splitDays} dias/sem</span>
                          <span>{routine.durationWeeks} semanas</span>
                        </>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(assigned.startsOn).toLocaleDateString("es-CR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-[#71717A]" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#71717A]" />
                )}
              </button>

              {/* Expanded content: days */}
              {isExpanded && days.length > 0 && (
                <div className="border-t border-[#3F3F46]/60 px-4 pb-4 pt-3 space-y-2">
                  {days.map(({ day, exercises }) => {
                    const dayKey = `${assigned.id}-${day.id}`;
                    const dayOpen = expandedDay === dayKey;

                    return (
                      <div
                        key={day.id}
                        className="rounded-lg border border-[#3F3F46]/60 bg-[#09090B]/50 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDay(dayOpen ? null : dayKey)
                          }
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF6A1A]/10 text-xs font-bold text-[#FF6A1A]">
                              {day.dayIndex + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#FAFAFA]">
                                {day.name}
                              </p>
                              <p className="text-[11px] text-[#52525B]">
                                {exercises.length} ejercicios
                              </p>
                            </div>
                          </div>
                          {dayOpen ? (
                            <ChevronUp className="h-3.5 w-3.5 text-[#52525B]" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-[#52525B]" />
                          )}
                        </button>

                        {dayOpen && (
                          <div className="border-t border-[#3F3F46]/40 divide-y divide-[#3F3F46]/30">
                            {exercises.map((ex) => (
                              <button
                                type="button"
                                key={ex.exerciseId}
                                onClick={() => ex.exercise && setSelectedExercise(ex)}
                                className="group flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-[#FF6A1A]/5"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-[#E4E4E7]">
                                    {ex.exercise?.nameEs ?? ex.exerciseId}
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#71717A]">
                                    <span>{ex.targetSets} series</span>
                                    <span>
                                      {ex.targetRepsMin === ex.targetRepsMax
                                        ? `${ex.targetRepsMin} reps`
                                        : `${ex.targetRepsMin}-${ex.targetRepsMax} reps`}
                                    </span>
                                    {ex.targetRpe && (
                                      <span>RPE {ex.targetRpe}</span>
                                    )}
                                    <span className="inline-flex items-center gap-0.5">
                                      <Clock className="h-3 w-3" />
                                      {ex.restSeconds}s
                                    </span>
                                  </div>
                                  {ex.notes && (
                                    <p className="mt-1 text-xs text-[#52525B] italic">
                                      {ex.notes}
                                    </p>
                                  )}
                                </div>
                                <Play className="ml-2 h-3.5 w-3.5 shrink-0 text-[#52525B] transition-colors group-hover:text-[#FF6A1A]" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedExercise?.exercise && (
        <ExerciseVideoModal
          open={!!selectedExercise}
          onClose={() => setSelectedExercise(null)}
          exercise={selectedExercise.exercise}
          videoUrl={getExerciseVideoUrl(selectedExercise.exerciseId)}
          context={{
            targetSets: selectedExercise.targetSets,
            targetRepsMin: selectedExercise.targetRepsMin,
            targetRepsMax: selectedExercise.targetRepsMax,
            restSeconds: selectedExercise.restSeconds,
            notes: selectedExercise.notes,
          }}
        />
      )}
    </div>
  );
}
