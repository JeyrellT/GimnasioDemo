"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExerciseThumbnail } from "@/components/shared/exercise-thumbnail";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Clock,
  CheckCircle,
  Dumbbell,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoutineSnapshotExercise } from "@/types/domain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function repsLabel(ex: RoutineSnapshotExercise): string {
  return ex.targetRepsMin === ex.targetRepsMax
    ? `${ex.targetRepsMin} reps`
    : `${ex.targetRepsMin}-${ex.targetRepsMax} reps`;
}

function chime() {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // best-effort
  }
}

function vibrate() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([180, 80, 180]);
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase =
  | { kind: "work" }
  | { kind: "rest"; nextAdvance: "set" | "exercise" };

interface RoutinePlayerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  routineName: string;
  dayName: string;
  exercises: RoutineSnapshotExercise[];
  startIndex: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoutinePlayerDialog({
  open,
  onOpenChange,
  routineName,
  dayName,
  exercises,
  startIndex,
}: RoutinePlayerDialogProps) {
  const [currentIndex, setCurrentIndex] = React.useState(startIndex);
  const [currentSet, setCurrentSet] = React.useState(1);
  const [phase, setPhase] = React.useState<Phase>({ kind: "work" });
  const [restSecondsLeft, setRestSecondsLeft] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);

  const current = exercises[currentIndex] ?? null;
  const next = exercises[currentIndex + 1] ?? null;

  // Anchor for drift-free rest countdown.
  const restAnchor = React.useRef<{
    startedAt: number;
    pausedRemaining: number | null;
    targetSec: number;
  }>({
    startedAt: 0,
    pausedRemaining: null,
    targetSec: 0,
  });

  // Reset state when (re)opening or when startIndex changes.
  React.useEffect(() => {
    if (!open) return;
    setCurrentIndex(startIndex);
    setCurrentSet(1);
    setPhase({ kind: "work" });
    setRestSecondsLeft(0);
    setIsPaused(false);
    setCompleted(false);
  }, [open, startIndex]);

  // Start the rest countdown anchor whenever phase transitions to "rest".
  React.useEffect(() => {
    if (phase.kind !== "rest") return;
    const ex = exercises[currentIndex];
    if (!ex) return;
    const target = Math.max(0, ex.restSeconds);
    restAnchor.current = {
      startedAt: Date.now(),
      pausedRemaining: null,
      targetSec: target,
    };
    setRestSecondsLeft(target);
    setIsPaused(false);
    // If the coach configured 0s rest, advance immediately.
    if (target === 0) {
      advanceFromRest(phase.nextAdvance);
    }
    // advanceFromRest is stable via setState callbacks; safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex, exercises]);

  // Rest countdown tick — only runs during rest phase.
  React.useEffect(() => {
    if (!open || completed) return;
    if (phase.kind !== "rest") return;

    const id = setInterval(() => {
      if (isPaused) return;
      const a = restAnchor.current;
      const elapsed = Math.floor((Date.now() - a.startedAt) / 1000);
      const remaining = Math.max(0, a.targetSec - elapsed);
      setRestSecondsLeft(remaining);
      if (remaining === 0) {
        chime();
        vibrate();
        advanceFromRest(phase.nextAdvance);
      }
    }, 250);
    return () => clearInterval(id);
    // advanceFromRest is stable via setState callbacks; safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, completed, phase, isPaused]);

  function advanceFromRest(target: "set" | "exercise") {
    if (target === "set") {
      setCurrentSet((s) => s + 1);
      setPhase({ kind: "work" });
      return;
    }
    // exercise: move to next, reset set counter
    setCurrentIndex((i) => {
      if (i >= exercises.length - 1) {
        setCompleted(true);
        return i;
      }
      return i + 1;
    });
    setCurrentSet(1);
    setPhase({ kind: "work" });
  }

  function handleDone() {
    if (!current) return;
    const totalSets = Math.max(1, current.targetSets);
    const isLastSet = currentSet >= totalSets;
    const isLastExercise = currentIndex >= exercises.length - 1;

    if (!isLastSet) {
      // More sets of this exercise → rest, then next set
      setPhase({ kind: "rest", nextAdvance: "set" });
      return;
    }
    // Last set of this exercise
    if (isLastExercise) {
      setCompleted(true);
      chime();
      vibrate();
      return;
    }
    // Rest between exercises (uses coach-defined restSeconds of the
    // exercise that just ended).
    setPhase({ kind: "rest", nextAdvance: "exercise" });
  }

  function handleSkipRest() {
    if (phase.kind !== "rest") return;
    advanceFromRest(phase.nextAdvance);
  }

  function handleTogglePause() {
    if (phase.kind !== "rest") return;
    setIsPaused((prev) => {
      const a = restAnchor.current;
      if (!prev) {
        const elapsed = Math.floor((Date.now() - a.startedAt) / 1000);
        a.pausedRemaining = Math.max(0, a.targetSec - elapsed);
      } else if (a.pausedRemaining !== null) {
        a.startedAt = Date.now() - (a.targetSec - a.pausedRemaining) * 1000;
        a.pausedRemaining = null;
      }
      return !prev;
    });
  }

  function handlePrev() {
    if (currentIndex <= 0 && currentSet <= 1) return;
    if (currentSet > 1) {
      setCurrentSet((s) => s - 1);
    } else {
      setCurrentIndex((i) => Math.max(0, i - 1));
      const prevEx = exercises[Math.max(0, currentIndex - 1)];
      setCurrentSet(prevEx ? Math.max(1, prevEx.targetSets) : 1);
    }
    setPhase({ kind: "work" });
    setCompleted(false);
  }

  function handleNext() {
    if (currentIndex >= exercises.length - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setCurrentSet(1);
    setPhase({ kind: "work" });
  }

  if (!current) return null;

  const totalSets = Math.max(1, current.targetSets);
  const restTarget = restAnchor.current.targetSec || current.restSeconds || 0;
  const restProgressPct =
    restTarget > 0
      ? Math.min(100, ((restTarget - restSecondsLeft) / restTarget) * 100)
      : 0;
  const restingForExercise =
    phase.kind === "rest" && phase.nextAdvance === "exercise";
  const restingForSet = phase.kind === "rest" && phase.nextAdvance === "set";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 sm:max-w-lg">
        {/* Header */}
        <div className="border-b border-[#3F3F46] px-5 py-3.5">
          <DialogTitle className="text-base font-semibold text-[#FAFAFA] pr-8">
            {routineName}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#71717A] mt-0.5">
            {dayName} · Ejercicio {currentIndex + 1} de {exercises.length}
            {!completed && (
              <>
                {" · "}Set {Math.min(currentSet, totalSets)} de {totalSets}
              </>
            )}
          </DialogDescription>
        </div>

        {completed ? (
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#22C55E]/15">
              <CheckCircle className="h-9 w-9 text-[#22C55E]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#FAFAFA]">
                ¡Rutina completada!
              </p>
              <p className="mt-1 text-sm text-[#A1A1AA]">
                Terminaste los {exercises.length} ejercicios del día.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-2 rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white min-h-[48px] hover:bg-brand-primary-hover transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            {/* Media */}
            <div className="relative aspect-video w-full bg-[#09090B]">
              <ExerciseThumbnail
                thumbnailUrl={current.thumbnailUrl}
                gifUrl={current.gifUrl}
                slug={current.slug}
                nameEn={current.nameEn}
                alt={current.nameEs}
              />
              {phase.kind === "rest" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 backdrop-blur-sm">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-primary">
                    {restingForExercise
                      ? "Descanso entre ejercicios"
                      : "Descanso"}
                  </span>
                  <span
                    aria-live="polite"
                    className="text-6xl font-bold tabular tabular-nums text-[#FAFAFA]"
                  >
                    {formatTime(restSecondsLeft)}
                  </span>
                  {isPaused && (
                    <span className="rounded-full bg-[#18181B] px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#A1A1AA] border border-[#3F3F46]">
                      En pausa
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Rest progress bar */}
            {phase.kind === "rest" && (
              <div className="h-1 w-full bg-[#27272A]">
                <div
                  className="h-full bg-brand-primary transition-all duration-200 ease-linear"
                  style={{ width: `${restProgressPct}%` }}
                />
              </div>
            )}

            <div className="px-5 py-4 space-y-4">
              {/* Exercise name + meta */}
              <div>
                <p className="text-lg font-bold text-[#FAFAFA] leading-tight">
                  {current.nameEs}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#A1A1AA]">
                  <span className="inline-flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" aria-hidden="true" />
                    {totalSets} {totalSets === 1 ? "serie" : "series"}
                  </span>
                  <span>{repsLabel(current)}</span>
                  {current.targetRpe !== null && (
                    <span>RPE {current.targetRpe}</span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {current.restSeconds}s descanso
                  </span>
                  {current.tempo && <span>Tempo {current.tempo}</span>}
                </div>
                {current.notes && (
                  <p className="mt-2 text-xs italic text-[#71717A]">
                    {current.notes}
                  </p>
                )}
              </div>

              {/* Work panel — reps + Done */}
              {phase.kind === "work" && (
                <div className="rounded-2xl border border-brand-primary/30 bg-brand-primary/5 px-4 py-5 text-center space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-brand-primary">
                    Set {Math.min(currentSet, totalSets)} de {totalSets}
                  </p>
                  <p className="text-4xl font-bold text-[#FAFAFA] tabular tabular-nums">
                    {repsLabel(current)}
                  </p>
                  <p className="text-[11px] text-[#71717A]">
                    A tu ritmo. Tocá &quot;Listo&quot; cuando termines.
                  </p>
                  <button
                    type="button"
                    onClick={handleDone}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-sm font-semibold text-white min-h-[48px] hover:bg-brand-primary-hover transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Listo
                  </button>
                </div>
              )}

              {/* Rest panel — controls */}
              {phase.kind === "rest" && (
                <div className="rounded-2xl border border-[#3F3F46] bg-[#09090B]/40 px-4 py-3 space-y-3">
                  <p className="text-center text-xs text-[#A1A1AA]">
                    {restingForExercise && next
                      ? `Siguiente: ${next.nameEs}`
                      : restingForSet
                        ? `Próximo: Set ${currentSet + 1} de ${current.nameEs}`
                        : "Descanso"}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      aria-label={isPaused ? "Reanudar" : "Pausar"}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-[#3F3F46] text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
                    >
                      {isPaused ? (
                        <Play
                          className="h-5 w-5 fill-current"
                          aria-hidden="true"
                        />
                      ) : (
                        <Pause
                          className="h-5 w-5 fill-current"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipRest}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white min-h-[48px] hover:bg-brand-primary-hover transition-colors"
                    >
                      <SkipForward className="h-4 w-4" aria-hidden="true" />
                      Saltar descanso
                    </button>
                  </div>
                </div>
              )}

              {/* Prev / Next exercise */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0 && currentSet <= 1}
                  aria-label="Anterior"
                  className="flex h-11 items-center gap-1.5 rounded-full border border-[#3F3F46] px-3 text-xs text-[#A1A1AA] disabled:opacity-30 hover:bg-[#27272A] transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={
                    currentIndex >= exercises.length - 1
                      ? "Finalizar"
                      : "Siguiente ejercicio"
                  }
                  className="flex h-11 items-center gap-1.5 rounded-full border border-[#3F3F46] px-3 text-xs text-[#A1A1AA] hover:bg-[#27272A] transition-colors"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Next preview while working */}
              {phase.kind === "work" && next && (
                <div className="flex items-center gap-3 rounded-lg border border-[#27272A] bg-[#09090B]/40 px-3 py-2.5">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#27272A]">
                    <ExerciseThumbnail
                      thumbnailUrl={next.thumbnailUrl}
                      gifUrl={next.gifUrl}
                      slug={next.slug}
                      nameEn={next.nameEn}
                      alt={next.nameEs}
                      iconSize="sm"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[#52525B]">
                      Siguiente ejercicio
                    </p>
                    <p className="truncate text-xs font-medium text-[#A1A1AA]">
                      {next.nameEs}
                    </p>
                  </div>
                </div>
              )}

              {/* Progress dots */}
              <div className="flex flex-wrap justify-center gap-1 pt-1">
                {exercises.map((ex, i) => (
                  <button
                    key={ex.exerciseId}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(i);
                      setCurrentSet(1);
                      setPhase({ kind: "work" });
                      setCompleted(false);
                    }}
                    aria-label={`Ir al ejercicio ${i + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === currentIndex
                        ? "w-5 bg-brand-primary"
                        : i < currentIndex
                          ? "w-1.5 bg-[#22C55E]"
                          : "w-1.5 bg-[#3F3F46]",
                    )}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
