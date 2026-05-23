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
  ListTodo,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getVideoLoopEmbed, type LoopEmbed } from "@/lib/media/video-url";
import { LoopMediaFrame } from "@/components/shared/loop-media-frame";
import type { RoutineSnapshotExercise } from "@/types/domain";
import {
  playRestEnd,
  playRoutineComplete,
  vibrate,
  setMuted,
  isMuted,
} from "@/lib/audio/timer-sounds";
import {
  usePrepCountdown,
  defaultPrepCallbacks,
} from "@/hooks/use-prep-countdown";
import { ReadyToGoScreen } from "./ready-to-go-screen";
import { CountdownOverlay } from "./countdown-overlay";
import { SegmentedProgressBar } from "./segmented-progress-bar";
import { NextExercisePreview } from "./next-exercise-preview";
import { ExerciseListSheet } from "./exercise-list-sheet";
import { toast } from "sonner";
import { startSession, completeSession } from "@/app/actions/sessions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatDurationLabel(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m < 60) return s > 0 ? `${m}min ${s}s` : `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}

function repsLabel(ex: RoutineSnapshotExercise): string {
  return ex.targetRepsMin === ex.targetRepsMax
    ? `${ex.targetRepsMin} reps`
    : `${ex.targetRepsMin}-${ex.targetRepsMax} reps`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase =
  | { kind: "ready" }
  | { kind: "prep"; reason: "first" | "next-set" | "next-exercise" }
  | { kind: "work" }
  | { kind: "rest"; nextAdvance: "set" | "exercise" }
  | { kind: "done" };

interface RoutinePlayerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** AssignedRoutine.id — required to persist the session in the backend. */
  assignedRoutineId: string;
  /** dayIndex of the routine day the client is executing (0-based). */
  dayIndex: number;
  routineName: string;
  dayName: string;
  exercises: RoutineSnapshotExercise[];
  startIndex: number;
  /** Fired after the routine is successfully marked as completed in the
      backend — lets the parent invalidate any queries / refresh state. */
  onCompleted?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoutinePlayerDialog({
  open,
  onOpenChange,
  assignedRoutineId,
  dayIndex,
  routineName,
  dayName,
  exercises,
  startIndex,
  onCompleted,
}: RoutinePlayerDialogProps) {
  const [currentIndex, setCurrentIndex] = React.useState(startIndex);
  const [currentSet, setCurrentSet] = React.useState(1);
  const [phase, setPhase] = React.useState<Phase>({ kind: "ready" });
  const [restSecondsLeft, setRestSecondsLeft] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [showList, setShowList] = React.useState(false);
  const [muted, setMutedState] = React.useState(false);

  // ── Backend session tracking ──────────────────────────────────────────────
  // A WorkoutSession is created in the DB when the client taps Comenzar (phase
  // first transitions out of "ready") and marked COMPLETED when phase reaches
  // "done". Refs avoid double-firing in React StrictMode / re-renders.
  const sessionIdRef = React.useRef<string | null>(null);
  const sessionStartedRef = React.useRef(false);
  const sessionCompletedRef = React.useRef(false);

  const current = exercises[currentIndex] ?? null;
  const next = exercises[currentIndex + 1] ?? null;

  // GIF-mode embed (autoplay+loop+muted) — the video plays silently in the
  // media slot as long as the exercise has a recognized video URL.
  const videoLoopEmbed = React.useMemo<LoopEmbed | null>(
    () => getVideoLoopEmbed(current?.mediaUrl ?? null),
    [current?.mediaUrl],
  );
  // Reset the video error flag when the exercise changes.
  const [videoError, setVideoError] = React.useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on exercise change is the intent
  React.useEffect(() => {
    setVideoError(false);
  }, [current?.exerciseId]);

  // Sync mute state on mount from localStorage.
  React.useEffect(() => {
    setMutedState(isMuted());
  }, []);

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

  // Guard against double-firing of advanceFromRest when the rest tick lands on
  // 0 multiple times before the interval cleanup runs (250ms gap).
  const restCompletedRef = React.useRef(false);

  // Guard against accidental player-dialog close when the inner ExerciseListSheet
  // closes via a tap on a card: the pointerdown that selected the card can be
  // re-interpreted by Radix as "click outside" of the player dialog (both dialogs
  // mount in the same Portal layer). Setting this true for ~2 frames after the
  // sheet closes makes the player ignore the spurious onOpenChange(false).
  const sheetGuardRef = React.useRef(false);

  function closeSheet() {
    sheetGuardRef.current = true;
    setShowList(false);
    // Two RAFs: first to let the sheet unmount, second to release the guard
    // after the synthetic pointerdown event has fully resolved.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        sheetGuardRef.current = false;
      });
    });
  }

  // 3-2-1 prep countdown.
  const prep = usePrepCountdown({
    seconds: 3,
    onTick: defaultPrepCallbacks.onTick,
    onComplete: () => {
      defaultPrepCallbacks.onComplete?.();
      setPhase({ kind: "work" });
    },
  });

  // Reset state when (re)opening or when startIndex changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: prep.cancel is a stable callback; including it would cause a render loop
  React.useEffect(() => {
    if (!open) return;
    prep.cancel();
    setCurrentIndex(startIndex);
    setCurrentSet(1);
    setRestSecondsLeft(0);
    setIsPaused(false);
    // Reset session tracking — a fresh open should start a new WorkoutSession
    // when the client taps Comenzar.
    sessionIdRef.current = null;
    sessionStartedRef.current = false;
    sessionCompletedRef.current = false;
    // Always show "Ready to Go" first when the dialog opens, regardless of
    // which exercise was tapped. This is the "preparación" screen.
    setPhase({ kind: "ready" });
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
    restCompletedRef.current = false;
    setRestSecondsLeft(target);
    setIsPaused(false);
    // If the coach configured 0s rest, jump straight to prep.
    if (target === 0) {
      restCompletedRef.current = true;
      advanceFromRest(phase.nextAdvance);
    }
  }, [phase, currentIndex, exercises]);

  // Persist the routine as COMPLETED in the backend when phase reaches "done".
  // Ref guard prevents double-fire under StrictMode re-renders.
  // biome-ignore lint/correctness/useExhaustiveDependencies: onCompleted is captured by closure; intentionally not in deps
  React.useEffect(() => {
    if (phase.kind !== "done") return;
    if (sessionCompletedRef.current) return;
    sessionCompletedRef.current = true;

    const sid = sessionIdRef.current;
    if (!sid) {
      // No session was created (startSession failed or client closed before
      // tapping Comenzar somehow). Nothing to persist — but still call
      // onCompleted so the parent can refresh local state.
      onCompleted?.();
      return;
    }

    void completeSession({ sessionId: sid }).then((result) => {
      if (result.ok) {
        toast.success("¡Rutina guardada!", {
          description: `Duración: ${formatDurationLabel(result.value.totalDurationSec)}`,
        });
        onCompleted?.();
      } else {
        toast.error(
          `La rutina terminó pero no se pudo guardar: ${result.error.message ?? "intentá más tarde"}`,
        );
      }
    });
  }, [phase]);

  // Rest countdown tick — only runs during rest phase. Critical: clear the
  // interval AND set the completed guard before calling advanceFromRest, so
  // we never fire twice (would skip a set / break the auto-advance).
  React.useEffect(() => {
    if (!open) return;
    if (phase.kind !== "rest") return;

    const nextAdvance = phase.nextAdvance;
    const id = setInterval(() => {
      if (isPaused) return;
      if (restCompletedRef.current) return;
      const a = restAnchor.current;
      const elapsed = Math.floor((Date.now() - a.startedAt) / 1000);
      const remaining = Math.max(0, a.targetSec - elapsed);
      setRestSecondsLeft(remaining);
      if (remaining === 0) {
        restCompletedRef.current = true;
        clearInterval(id);
        playRestEnd();
        vibrate([180, 80, 180]);
        advanceFromRest(nextAdvance);
      }
    }, 250);
    return () => clearInterval(id);
  }, [open, phase, isPaused]);

  function advanceFromRest(target: "set" | "exercise") {
    if (target === "set") {
      setCurrentSet((s) => s + 1);
      setPhase({ kind: "prep", reason: "next-set" });
      prep.start(3);
      return;
    }
    // exercise: move to next, reset set counter
    const isLastExercise = currentIndex >= exercises.length - 1;
    if (isLastExercise) {
      playRoutineComplete();
      vibrate([200, 100, 200, 100, 300]);
      setPhase({ kind: "done" });
      return;
    }
    setCurrentIndex(currentIndex + 1);
    setCurrentSet(1);
    setPhase({ kind: "prep", reason: "next-exercise" });
    prep.start(3);
  }

  function handleStartReady() {
    setPhase({ kind: "prep", reason: "first" });
    prep.start(3);

    // Fire-and-forget: create the backend WorkoutSession. We don't block the
    // UI on the network — the countdown starts immediately. If startSession
    // fails we surface a toast but the local routine still runs (the user
    // can re-attempt next time).
    if (!sessionStartedRef.current) {
      sessionStartedRef.current = true;
      void startSession({ assignedRoutineId, dayIndex }).then((result) => {
        if (result.ok) {
          sessionIdRef.current = result.value.sessionId;
        } else {
          sessionStartedRef.current = false;
          toast.error(
            `No se pudo registrar la sesión: ${result.error.message ?? "intentá de nuevo"}`,
          );
        }
      });
    }
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
      playRoutineComplete();
      vibrate([200, 100, 200, 100, 300]);
      setPhase({ kind: "done" });
      return;
    }
    // Rest between exercises (uses coach-defined restSeconds of the
    // exercise that just ended).
    setPhase({ kind: "rest", nextAdvance: "exercise" });
  }

  function handleSkipRest() {
    if (phase.kind !== "rest") return;
    if (restCompletedRef.current) return;
    restCompletedRef.current = true;
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

  function jumpToExercise(index: number) {
    if (index < 0 || index >= exercises.length) return;
    prep.cancel();
    setCurrentIndex(index);
    setCurrentSet(1);
    setPhase({ kind: "prep", reason: "next-exercise" });
    prep.start(3);
  }

  function handlePrev() {
    if (currentIndex <= 0 && currentSet <= 1) return;
    prep.cancel();
    if (currentSet > 1) {
      setCurrentSet((s) => s - 1);
      setPhase({ kind: "prep", reason: "next-set" });
      prep.start(3);
      return;
    }
    const targetIdx = Math.max(0, currentIndex - 1);
    setCurrentIndex(targetIdx);
    const prevEx = exercises[targetIdx];
    setCurrentSet(prevEx ? Math.max(1, prevEx.targetSets) : 1);
    setPhase({ kind: "prep", reason: "next-exercise" });
    prep.start(3);
  }

  function handleNext() {
    if (currentIndex >= exercises.length - 1) {
      playRoutineComplete();
      vibrate([200, 100, 200, 100, 300]);
      setPhase({ kind: "done" });
      return;
    }
    jumpToExercise(currentIndex + 1);
  }

  function toggleMute() {
    const newValue = !muted;
    setMuted(newValue);
    setMutedState(newValue);
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

  // Prep context label / next exercise name for the overlay.
  let prepLabel = "Empezando";
  const prepName = current.nameEs;
  if (phase.kind === "prep") {
    if (phase.reason === "first") {
      prepLabel = "Empezando rutina";
    } else if (phase.reason === "next-set") {
      prepLabel = `Set ${Math.min(currentSet, totalSets)} de ${totalSets}`;
    } else {
      prepLabel = `Ejercicio ${currentIndex + 1} de ${exercises.length}`;
    }
  }

  function handlePlayerOpenChange(nextOpen: boolean) {
    // Suppress close while the exercise list sheet is open OR was just closed
    // (Radix can re-fire pointerdown-outside on the player when the sheet
    // unmounts after a card tap).
    if (!nextOpen && (showList || sheetGuardRef.current)) return;
    onOpenChange(nextOpen);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handlePlayerOpenChange}>
        {/* max-h + flex column makes the dialog fit any viewport:
            - header stays anchored at top (shrink-0)
            - body scrolls internally when the video + meta + rest controls
              exceed the screen (typical on phone in portrait when the video
              is 9:16). Without this, the bottom controls (Pausar / Saltar
              descanso) get cut off on small viewports. */}
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0 sm:max-w-lg flex flex-col max-h-[100dvh] sm:max-h-[90dvh]">
          {/* Header — compact: solo título + día. El detalle "Ejercicio N /
              Set X" ya está representado visualmente en la SegmentedProgressBar
              de abajo y en el panel "SET N DE M" más abajo del contenido. */}
          <div className="shrink-0 border-b border-[#3F3F46] px-5 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 pr-8">
                <DialogTitle className="text-base font-semibold text-[#FAFAFA] truncate">
                  {routineName}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#71717A] mt-0.5">
                  {dayName}
                  {phase.kind === "ready" && (
                    <>
                      {" · "}
                      {exercises.length} ejercicios
                    </>
                  )}
                </DialogDescription>
              </div>
              {/* mr-10: reserva 40px a la derecha para la X de cierre del
                  DialogContent (absolute right-4 top-4, 44×44px). Sin esto
                  el botón ListTodo queda pisado por la X. */}
              <div className="mr-10 flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? "Activar sonido" : "Silenciar sonido"}
                  aria-pressed={muted}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA] transition-colors"
                >
                  {muted ? (
                    <VolumeX className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                {phase.kind !== "ready" && phase.kind !== "done" && (
                  <button
                    type="button"
                    onClick={() => setShowList(true)}
                    aria-label="Ver lista de ejercicios"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA] transition-colors"
                  >
                    <ListTodo className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {/* Segmented progress bar — only when rutina ya empezó.
                mt-1.5 + py-2.5 del header dejan la barra justo debajo del
                título sin desperdiciar vertical space. */}
            {phase.kind !== "ready" && (
              <div className="mt-1.5 -mx-5 -mb-1">
                <SegmentedProgressBar
                  total={exercises.length}
                  currentIndex={
                    phase.kind === "done" ? exercises.length : currentIndex
                  }
                  currentSetsTotal={totalSets}
                  currentSetsDone={Math.max(
                    0,
                    Math.min(totalSets, currentSet - 1),
                  )}
                  onSegmentClick={(i) => {
                    if (i === currentIndex) return;
                    jumpToExercise(i);
                  }}
                />
              </div>
            )}
          </div>

          {/* Scrollable body — keeps the header sticky and lets the rest
              controls (Pausar / Saltar descanso) stay reachable when the
              video + meta exceed the viewport on small phones. */}
          <div className="flex-1 overflow-y-auto overscroll-contain">

          {phase.kind === "ready" ? (
            <ReadyToGoScreen
              routineName={routineName}
              dayName={dayName}
              totalExercises={exercises.length}
              firstExercise={current}
              onStart={handleStartReady}
              onShowList={() => setShowList(true)}
            />
          ) : phase.kind === "done" ? (
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
              {/* Media — GIF-mode (autoplay + loop + muted) when the exercise
                  has a video URL; otherwise the static thumbnail. Overlays
                  (countdown 3-2-1, rest timer) sit on top via absolute.

                  UNIFORMIDAD CASI TOTAL (con licencia para verticales):
                  - max-w-xs (320px) + mx-auto → ancho fijo y centrado.
                  - minAspectRatio={1} fuerza a los horizontales 16:9 a verse
                    al menos cuadrados (no se ven mucho más chatos que el
                    resto). object-cover recorta los costados.
                  - maxAspectRatio={1.25} permite a los verticales 9:16
                    estirarse hasta 4:5 (~25% más altos que cuadrado). Más
                    allá de eso se recortan arriba/abajo. Esto es la
                    "licencia para que los verticales se excedan un poco".
                  - Resultado: 320×320 (cuadrado) → 320×400 (vertical leve).
                    Rango angosto, casi-uniforme, sin recortes agresivos
                    cuando el video es vertical (que es la mayoría grabada
                    con celular).

                  TAMAÑO: deliberadamente menor que el ancho del modal
                  (max-w-md = 448px) para dejar respiro a los controles. */}
              <div className="relative mx-auto w-full max-w-xs overflow-hidden bg-[#09090B]">
                {videoLoopEmbed && !videoError ? (
                  <LoopMediaFrame
                    embed={videoLoopEmbed}
                    title={`Demostración: ${current.nameEs}`}
                    onVideoError={() => setVideoError(true)}
                    minAspectRatio={1}
                    maxAspectRatio={1.25}
                  />
                ) : (
                  // aspect-square = el "punto base" del rango [1, 1.25].
                  // Cuando un ejercicio sin video aparece entre videos
                  // verticales (que pueden ser 1.25), hay un pequeño salto
                  // de altura — aceptable porque sin video casi nunca pasa
                  // en una rutina bien armada.
                  <div className="aspect-square w-full">
                    <ExerciseThumbnail
                      thumbnailUrl={current.thumbnailUrl}
                      gifUrl={current.gifUrl}
                      slug={current.slug}
                      nameEn={current.nameEn}
                      alt={current.nameEs}
                    />
                  </div>
                )}

                {/* 3-2-1 prep overlay */}
                {phase.kind === "prep" && (
                  <CountdownOverlay
                    secondsLeft={prep.secondsLeft}
                    nextExerciseName={prepName}
                    contextLabel={prepLabel}
                  />
                )}

                {/* Rest overlay */}
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

              {/* Rest progress bar (slim) */}
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

                {/* Prep panel — countdown also runs on the overlay; show a
                    skeleton hint here so the layout doesn't jump */}
                {phase.kind === "prep" && (
                  <div className="rounded-2xl border border-[#3F3F46] bg-[#09090B]/40 px-4 py-5 text-center space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-brand-primary">
                      Preparate
                    </p>
                    <p className="text-2xl font-bold text-[#FAFAFA] tabular tabular-nums">
                      {prep.secondsLeft === 0 ? "¡GO!" : prep.secondsLeft}
                    </p>
                  </div>
                )}

                {/* Rest panel — controls */}
                {phase.kind === "rest" && (
                  <div className="space-y-3">
                    {restingForExercise && next ? (
                      <NextExercisePreview
                        exercise={next}
                        positionHuman={currentIndex + 2}
                        total={exercises.length}
                        variant="full"
                      />
                    ) : (
                      <div className="rounded-2xl border border-[#3F3F46] bg-[#09090B]/40 px-4 py-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-primary">
                          Próximo
                        </p>
                        <p className="mt-1 text-sm text-[#FAFAFA]">
                          Set {currentSet + 1} de {current.nameEs}
                        </p>
                      </div>
                    )}

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
                  <NextExercisePreview
                    exercise={next}
                    positionHuman={currentIndex + 2}
                    total={exercises.length}
                    variant="compact"
                  />
                )}
              </div>
            </>
          )}

          {/* /scrollable body */}
          </div>
        </DialogContent>
      </Dialog>

      {/* Exercise list sheet — accesible desde el header en cualquier phase
          (excepto done) y desde Ready-to-Go. closeSheet() es lo que rompe la
          propagación del pointerdown al overlay del player dialog. */}
      <ExerciseListSheet
        open={showList}
        onOpenChange={(v) => {
          if (v) setShowList(true);
          else closeSheet();
        }}
        exercises={exercises}
        currentIndex={currentIndex}
        onSelectExercise={(i) => {
          jumpToExercise(i);
          closeSheet();
        }}
      />
    </>
  );
}
