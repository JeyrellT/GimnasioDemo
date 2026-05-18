"use client";

import { useEffect, useState } from "react";
import { Loader2, Dumbbell, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getMyActiveRoutine } from "@/app/actions/client-portal";
import type { MyAssignedRoutine } from "@/server/actions/client-portal.actions";
import type {
  RoutineSnapshot,
  RoutineSnapshotDay,
  RoutineSnapshotExercise,
} from "@/types/domain";

interface DayWithExercises {
  day: RoutineSnapshotDay;
  exercises: RoutineSnapshotExercise[];
}

function parseSnapshot(raw: unknown): RoutineSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (!Array.isArray(s.days)) return null;
  return raw as RoutineSnapshot;
}

export default function ClientSesionPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assigned, setAssigned] = useState<MyAssignedRoutine | null>(null);
  const [snapshot, setSnapshot] = useState<RoutineSnapshot | null>(null);
  const [days, setDays] = useState<DayWithExercises[]>([]);
  const [expandedDay, setExpandedDay] = useState<number>(0);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getMyActiveRoutine().then((result) => {
      if (result.ok && result.value) {
        const ar = result.value;
        setAssigned(ar);
        const snap = parseSnapshot(ar.snapshotJson);
        if (snap) {
          setSnapshot(snap);
          setDays(
            snap.days.map((day) => ({
              day,
              exercises: day.exercises,
            })),
          );
        }
      }
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!assigned || !snapshot) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 text-center space-y-4">
        <Dumbbell className="h-12 w-12 text-neutral-600 mx-auto" />
        <h2 className="text-xl font-bold text-neutral-50">Sin rutina activa</h2>
        <p className="text-sm text-neutral-400">
          Tu entrenador aún no te ha asignado una rutina.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-50">
          {snapshot.templateName}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {snapshot.splitDays} días · {snapshot.durationWeeks} semanas ·{" "}
          {snapshot.goal.toLowerCase().replace("_", " ")}
        </p>
      </div>

      <div className="space-y-3">
        {days.map(({ day, exercises }, idx) => {
          const open = expandedDay === idx;
          return (
            <div
              key={day.dayIndex}
              className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedDay(open ? -1 : idx)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/15 text-sm font-bold text-brand-primary">
                    {day.dayIndex + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-100">
                      {day.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {exercises.length} ejercicios
                    </p>
                  </div>
                </div>
                {open ? (
                  <ChevronUp className="h-4 w-4 text-neutral-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                )}
              </button>

              {open && (
                <div className="border-t border-neutral-800 divide-y divide-neutral-800/60">
                  {exercises.map((ex) => (
                    <div key={ex.exerciseId} className="px-4 py-3">
                      <p className="text-sm font-medium text-neutral-200">
                        {ex.nameEs}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                        <span>{ex.targetSets} series</span>
                        <span>
                          {ex.targetRepsMin === ex.targetRepsMax
                            ? `${ex.targetRepsMin} reps`
                            : `${ex.targetRepsMin}-${ex.targetRepsMax} reps`}
                        </span>
                        {ex.targetRpe !== null && (
                          <span>RPE {ex.targetRpe}</span>
                        )}
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {ex.restSeconds}s descanso
                        </span>
                      </div>
                      {ex.notes && (
                        <p className="mt-1 text-xs text-neutral-600 italic">
                          {ex.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
