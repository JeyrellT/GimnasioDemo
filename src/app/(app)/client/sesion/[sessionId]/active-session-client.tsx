"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Timer, CheckCircle, X, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { useSessionStore } from "@/stores/session-store";
import { useRestTimer } from "@/hooks/use-rest-timer";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { recordSet, completeSession as completeSessionAction } from "@/app/actions/sessions";
import { SetInput } from "@/components/forms/set-input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SessionInProgress } from "@/types/domain";

interface ActiveSessionClientProps {
  session: SessionInProgress;
}

export function ActiveSessionClient({ session }: ActiveSessionClientProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const setsByExerciseId = useSessionStore((s) => s.setsByExerciseId);
  const setCurrentExerciseIndex = useSessionStore((s) => s.setCurrentExerciseIndex);
  const recordSetStore = useSessionStore((s) => s.recordSet);
  const pendingSyncCount = useSessionStore((s) => s.pendingSyncCount);
  const completeSessionStore = useSessionStore((s) => s.completeSession);

  const { isActive: timerActive, secondsLeft, start: startTimer, stop: stopTimer } = useRestTimer();

  // Keep screen awake during session
  useWakeLock(true);

  const [sessionStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [fatigue, setFatigue] = useState<number | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Get exercises from session snapshot using the session's dayIndex so
  // multi-day splits show the correct day's exercises (not always day 0).
  type SnapshotDay = {
    dayIndex: number;
    exercises?: Array<{
      exerciseId: string;
      nameEs: string;
      targetSets: number;
      targetRepsMin: number;
      targetRepsMax: number;
      targetRpe: number | null;
      restSeconds: number;
    }>;
  };
  const snapshot = session.assignedRoutine?.snapshotJson as { days?: SnapshotDay[] } | null;
  const sessionDayIndex = session.dayIndex ?? 0;
  const exercises =
    snapshot?.days?.find((d) => d.dayIndex === sessionDayIndex)?.exercises ??
    snapshot?.days?.[0]?.exercises ??
    [];

  const currentExercise = exercises[currentExerciseIndex];
  const completedSets = currentExercise
    ? (setsByExerciseId[currentExercise.exerciseId] ?? []).length
    : 0;

  function formatElapsed(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  async function handleRecordSet(weight: number | null, reps: number | null, rpe: number | null) {
    if (!currentExercise) return;

    const setNumber = completedSets + 1;
    const setRecord = {
      setId: `temp-${Date.now()}`,
      exerciseId: currentExercise.exerciseId,
      setNumber,
      weightKg: weight,
      reps,
      rpe,
      notes: null,
      completedAt: Date.now(),
      isPr: false,
      synced: false,
    };

    recordSetStore(setRecord);

    // Auto-start rest timer
    if (currentExercise.restSeconds > 0) {
      startTimer(currentExercise.restSeconds);
    }

    if (isOnline) {
      const result = await recordSet({
        sessionId: session.id,
        exerciseId: currentExercise.exerciseId,
        setNumber,
        weightKg: weight ?? undefined,
        reps: reps ?? undefined,
        rpe: rpe ?? undefined,
      });

      if (result.ok && result.value.isPr) {
        toast.success(`Nuevo PR en ${currentExercise.nameEs}`, {
          icon: "🏆",
          duration: 4000,
        });
      }
    } else {
      toast.message("Set guardado offline. Se sincronizará cuando vuelva la red.");
    }
  }

  async function handleComplete() {
    setCompleting(true);
    const totalSecs = Math.floor((Date.now() - sessionStartTime) / 1000);
    const result = await completeSessionAction({
      sessionId: session.id,
      totalDurationSec: totalSecs,
      subjectiveFatigue: fatigue ?? undefined,
    });
    setCompleting(false);

    if (result.ok) {
      completeSessionStore();
      toast.success("Sesión completada.");
      router.push("/client/progreso");
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)]">
      {/* Sticky header */}
      <div className="sticky top-14 z-30 flex items-center justify-between border-b border-[#3F3F46] bg-[#09090B] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-sm font-bold tabular text-[#FF6A1A]">
            {formatElapsed(elapsed)}
          </div>
          {!isOnline && (
            <span className="rounded-full bg-[#451A03] px-2 py-0.5 text-xs text-[#F59E0B]">
              Offline {pendingSyncCount > 0 ? `· ${pendingSyncCount}` : ""}
            </span>
          )}
        </div>
        <div className="text-xs text-[#71717A]">
          {currentExerciseIndex + 1}/{exercises.length} ejercicios
        </div>
        <button
          type="button"
          onClick={() => setShowComplete(true)}
          className="text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors min-h-[44px] px-2"
        >
          Terminar
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 px-4 py-5 space-y-5">
        {/* Exercise navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => currentExerciseIndex > 0 && setCurrentExerciseIndex(currentExerciseIndex - 1)}
            disabled={currentExerciseIndex === 0}
            aria-label="Ejercicio anterior"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3F3F46] disabled:opacity-30 hover:bg-[#18181B] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-[#FAFAFA]">
              {currentExercise?.nameEs ?? "—"}
            </p>
            <p className="text-xs text-[#71717A]">
              {currentExercise
                ? `${currentExercise.targetSets} sets · ${currentExercise.targetRepsMin}-${currentExercise.targetRepsMax} reps`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              currentExerciseIndex < exercises.length - 1 &&
              setCurrentExerciseIndex(currentExerciseIndex + 1)
            }
            disabled={currentExerciseIndex >= exercises.length - 1}
            aria-label="Siguiente ejercicio"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3F3F46] disabled:opacity-30 hover:bg-[#18181B] transition-colors"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1" aria-hidden="true">
          {exercises.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentExerciseIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === currentExerciseIndex
                  ? "w-6 bg-[#FF6A1A]"
                  : i < currentExerciseIndex
                    ? "w-2 bg-[#22C55E]"
                    : "w-2 bg-[#3F3F46]",
              )}
            />
          ))}
        </div>

        {/* Rest timer */}
        {timerActive && (
          <div className="rounded-2xl border border-[#FF6A1A]/30 bg-[#FF6A1A]/5 p-4 text-center">
            <p className="text-xs text-[#FF6A1A] mb-1">Descanso</p>
            <p className="text-5xl font-bold tabular text-[#FAFAFA]">
              {secondsLeft}
            </p>
            <button
              type="button"
              onClick={stopTimer}
              className="mt-2 text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors"
            >
              Saltear
            </button>
          </div>
        )}

        {/* Completed sets */}
        {currentExercise && (setsByExerciseId[currentExercise.exerciseId] ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#71717A] uppercase tracking-wide">
              Sets completados
            </p>
            {(setsByExerciseId[currentExercise.exerciseId] ?? []).map((s) => (
              <div
                key={s.setId}
                className="flex items-center gap-3 rounded-lg bg-[#18181B] px-3 py-2"
              >
                <CheckCircle
                  className="h-4 w-4 shrink-0 text-[#22C55E]"
                  aria-hidden="true"
                />
                <span className="text-sm tabular text-[#FAFAFA]">
                  Set {s.setNumber}
                  {s.weightKg ? ` · ${s.weightKg}kg` : ""}
                  {s.reps ? ` × ${s.reps}` : ""}
                  {s.rpe ? ` · RPE ${s.rpe}` : ""}
                </span>
                {s.isPr && (
                  <Trophy
                    className="ml-auto h-4 w-4 text-[#F5C542]"
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Set input */}
        {currentExercise && (
          <SetInput
            setNumber={completedSets + 1}
            targetReps={`${currentExercise.targetRepsMin}-${currentExercise.targetRepsMax}`}
            targetRpe={currentExercise.targetRpe ?? null}
            onComplete={(data) => handleRecordSet(data.weightKg, data.reps, data.rpe)}
          />
        )}
      </div>

      {/* Complete session modal */}
      {showComplete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full rounded-t-2xl border-t border-[#3F3F46] bg-[#18181B] p-6 space-y-4 animate-slide-up">
            <h2 className="text-lg font-bold text-[#FAFAFA]">
              ¿Terminaste la sesión?
            </h2>
            <p className="text-sm text-[#A1A1AA]">
              Duración: {formatElapsed(elapsed)}
            </p>

            {/* Fatigue */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#FAFAFA]">
                ¿Cómo te sentís? (1–10)
              </p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFatigue(n)}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
                      fatigue === n
                        ? "bg-[#FF6A1A] text-white"
                        : "bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46]",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowComplete(false)}
                className="flex-1 rounded-xl border border-[#3F3F46] py-3 text-sm font-medium text-[#A1A1AA] min-h-[48px] hover:bg-[#27272A] transition-colors"
              >
                Seguir entrenando
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={completing}
                className="flex-1 rounded-xl bg-[#FF6A1A] py-3 text-sm font-semibold text-white min-h-[48px] hover:bg-[#E55A0E] disabled:opacity-60 transition-colors"
              >
                {completing ? "Guardando..." : "Completar sesión"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowComplete(false)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 text-[#71717A] hover:text-[#FAFAFA] transition-colors"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
