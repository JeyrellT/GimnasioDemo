"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Image from "next/image";
import { motion, AnimatePresence, type Variants, type TargetAndTransition } from "framer-motion";
import {
  X,
  Dumbbell,
  PlayCircle,
  RotateCcw,
  Timer,
  ChevronRight,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MUSCLE_LABELS,
  MUSCLE_COLORS,
  EQUIPMENT_LABELS,
  DIFFICULTY_META,
} from "@/lib/constants/exercise-display";
import type { DemoExerciseRow } from "@/lib/offline/db";

// =============================================================================
// Types
// =============================================================================

interface ExerciseVideoModalProps {
  open: boolean;
  onClose: () => void;
  exercise: DemoExerciseRow;
  videoUrl: string | null;
  context: {
    targetSets: number;
    targetRepsMin: number;
    targetRepsMax: number;
    restSeconds: number;
    notes: string | null;
  } | null;
}

// =============================================================================
// Sub-components
// =============================================================================

interface DifficultyDotsProps {
  filled: 1 | 2 | 3;
}

function DifficultyDots({ filled }: DifficultyDotsProps) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {([1, 2, 3] as const).map((level) => (
        <span
          key={level}
          className={cn(
            "h-2 w-2 rounded-full transition-colors",
            level <= filled ? "bg-[#3B82F6]" : "bg-[#3F3F46]",
          )}
        />
      ))}
    </span>
  );
}

// -----------------------------------------------------------------------------

interface MuscleBadgeProps {
  muscle: string;
  faded?: boolean;
}

function MuscleBadge({ muscle, faded = false }: MuscleBadgeProps) {
  const label = MUSCLE_LABELS[muscle] ?? muscle;
  const colors = MUSCLE_COLORS[muscle] ?? {
    bg: "bg-[#27272A]",
    text: "text-[#A1A1AA]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        colors.bg,
        colors.text,
        faded && "opacity-60",
      )}
    >
      {label}
    </span>
  );
}

// -----------------------------------------------------------------------------

interface MediaHeroProps {
  nameEs: string;
  gifUrl: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
}

function MediaHero({ nameEs, gifUrl, thumbnailUrl, videoUrl }: MediaHeroProps) {
  const [imgError, setImgError] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);

  // Reset playing state when exercise changes
  const exerciseKey = nameEs;
  const prevKey = React.useRef(exerciseKey);
  React.useEffect(() => {
    if (prevKey.current !== exerciseKey) {
      setPlaying(false);
      setImgError(false);
      prevKey.current = exerciseKey;
    }
  }, [exerciseKey]);

  const hasGif = Boolean(gifUrl && !imgError);
  const hasThumbnail = Boolean(thumbnailUrl && !imgError);
  const showPlaceholder = imgError || (!gifUrl && !thumbnailUrl);
  const canPlay = Boolean(videoUrl);

  // ── Video player mode ──────────────────────────────────────────────
  if (playing && videoUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <iframe
          src={videoUrl + "&autoplay=1"}
          title={`Video tutorial: ${nameEs}`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="eager"
        />
        {/* Back to thumbnail button */}
        <button
          type="button"
          onClick={() => setPlaying(false)}
          className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1.5 text-[11px] font-medium text-white/80 ring-1 ring-white/10 transition-colors hover:bg-black/80 hover:text-white"
        >
          <X className="h-3 w-3" />
          Cerrar video
        </button>
      </div>
    );
  }

  // ── Thumbnail mode ─────────────────────────────────────────────────
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-[#18181B]">
      {/* Media layer */}
      {hasGif ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={gifUrl!}
          alt={`Demostración de ${nameEs}`}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : hasThumbnail ? (
        <Image
          src={thumbnailUrl!}
          alt={`Vista previa de ${nameEs}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 448px"
          onError={() => setImgError(true)}
          priority
        />
      ) : (
        // Placeholder
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#52525B]">
          <Dumbbell className="h-12 w-12" aria-hidden="true" />
          <span className="text-sm font-medium text-[#52525B]">
            Sin imagen disponible
          </span>
        </div>
      )}

      {/* Play button overlay */}
      {canPlay && !showPlaceholder && (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Reproducir video tutorial"
          className="absolute inset-0 z-10 flex items-center justify-center group/play"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3B82F6]/90 shadow-lg shadow-[#3B82F6]/30 ring-2 ring-white/20 transition-transform duration-200 group-hover/play:scale-110 group-active/play:scale-95">
            <PlayCircle
              className="h-8 w-8 text-white"
              aria-hidden="true"
            />
          </div>
          <span className="absolute bottom-14 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white/90">
            Ver tutorial
          </span>
        </button>
      )}

      {/* Static play icon when no video available */}
      {!canPlay && hasThumbnail && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm ring-1 ring-white/20">
            <PlayCircle
              className="h-8 w-8 text-white/80"
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      {/* Bottom gradient for name overlay legibility */}
      {!showPlaceholder && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
      )}

      {/* Exercise name overlaid at bottom */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pointer-events-none">
        <DialogPrimitive.Title className="line-clamp-2 text-lg font-bold leading-tight text-[#FAFAFA] drop-shadow-md">
          {nameEs}
        </DialogPrimitive.Title>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

interface ContextBarProps {
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
}

function ContextBar({
  targetSets,
  targetRepsMin,
  targetRepsMax,
  restSeconds,
}: ContextBarProps) {
  const repsLabel =
    targetRepsMin === targetRepsMax
      ? `${targetRepsMin} reps`
      : `${targetRepsMin}–${targetRepsMax} reps`;

  const restLabel =
    restSeconds >= 60
      ? `${Math.floor(restSeconds / 60)}m${restSeconds % 60 > 0 ? ` ${restSeconds % 60}s` : ""} descanso`
      : `${restSeconds}s descanso`;

  return (
    <div className="flex items-center gap-0 rounded-xl bg-[#27272A] ring-1 ring-[#3F3F46] overflow-hidden">
      <div className="flex flex-1 flex-col items-center gap-0.5 px-3 py-2.5">
        <RotateCcw className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
        <span className="text-xs font-bold text-[#FAFAFA]">{targetSets}</span>
        <span className="text-[10px] text-[#71717A] leading-none">
          {targetSets === 1 ? "serie" : "series"}
        </span>
      </div>

      <div className="h-8 w-px bg-[#3F3F46]" aria-hidden="true" />

      <div className="flex flex-1 flex-col items-center gap-0.5 px-3 py-2.5">
        <ChevronRight className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
        <span className="text-xs font-bold text-[#FAFAFA]">
          {targetRepsMin === targetRepsMax
            ? targetRepsMin
            : `${targetRepsMin}–${targetRepsMax}`}
        </span>
        <span className="text-[10px] text-[#71717A] leading-none">reps</span>
      </div>

      <div className="h-8 w-px bg-[#3F3F46]" aria-hidden="true" />

      <div className="flex flex-1 flex-col items-center gap-0.5 px-3 py-2.5">
        <Timer className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
        <span className="text-xs font-bold text-[#FAFAFA]">{restSeconds}s</span>
        <span className="text-[10px] text-[#71717A] leading-none">descanso</span>
      </div>

      {/* sr-only accessible summary */}
      <span className="sr-only">
        {`${targetSets} ${targetSets === 1 ? "serie" : "series"}, ${repsLabel}, ${restLabel}`}
      </span>
    </div>
  );
}

// =============================================================================
// Animation variants
// framer-motion 12 requires literal types for `ease` and `type` fields.
// =============================================================================

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" as const } },
  exit: { opacity: 0, transition: { duration: 0.18, ease: "easeIn" as const } },
};

const cardVariantsMobile: Variants = {
  hidden: { y: "100%", opacity: 0.6 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 320, damping: 34, mass: 0.9 },
  },
  exit: {
    y: "100%",
    opacity: 0.4,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  },
};

const cardVariantsDesktop: Variants = {
  hidden: { scale: 0.96, opacity: 0, y: 8 },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 32 },
  },
  exit: {
    scale: 0.96,
    opacity: 0,
    y: 8,
    transition: { duration: 0.16, ease: "easeIn" as const },
  },
};

// Staggered section reveal helpers.
// Use TargetAndTransition (concrete sub-type) for direct initial/animate props.
function makeSectionVariant(i: number): TargetAndTransition {
  return {
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.055, duration: 0.22, ease: "easeOut" as const },
  };
}
const sectionHidden: TargetAndTransition = { opacity: 0, y: 6 };

// =============================================================================
// Main component
// =============================================================================

export function ExerciseVideoModal({
  open,
  onClose,
  exercise,
  videoUrl,
  context,
}: ExerciseVideoModalProps) {
  const difficultyMeta = DIFFICULTY_META[exercise.difficulty] ?? {
    label: exercise.difficulty,
    filled: 1 as const,
  };
  const equipmentLabel =
    EQUIPMENT_LABELS[exercise.equipment] ?? exercise.equipment;

  // Detect mobile vs desktop for animation variant selection
  const [isMobile, setIsMobile] = React.useState(true);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setIsMobile(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const cardVariants = isMobile ? cardVariantsMobile : cardVariantsDesktop;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <AnimatePresence mode="wait">
          {open && (
            <>
              {/* ── Overlay ─────────────────────────────────────────────── */}
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  key="overlay"
                  className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]"
                  variants={overlayVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onClick={onClose}
                  aria-hidden="true"
                />
              </DialogPrimitive.Overlay>

              {/* ── Modal card ──────────────────────────────────────────── */}
              <DialogPrimitive.Content asChild forceMount>
                <motion.div
                  key="card"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="exercise-modal-title"
                  className={cn(
                    "fixed z-50 flex flex-col overflow-hidden",
                    "bg-[#18181B] text-[#FAFAFA]",
                    // Mobile: sheet from bottom
                    "bottom-0 left-0 right-0 max-h-[90svh] rounded-t-2xl",
                    // Desktop: centered card
                    "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
                    "sm:right-auto sm:w-full sm:max-w-md sm:rounded-2xl sm:max-h-[88svh]",
                    "shadow-2xl ring-1 ring-[#3F3F46]/60",
                  )}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {/* Close button — always visible above media */}
                  <DialogPrimitive.Close asChild>
                    <button
                      type="button"
                      aria-label="Cerrar"
                      onClick={onClose}
                      className={cn(
                        "absolute right-3 top-3 z-20",
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        "bg-black/50 backdrop-blur-sm ring-1 ring-white/10",
                        "text-white/80 transition-colors hover:bg-black/70 hover:text-white",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]",
                      )}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogPrimitive.Close>

                  {/* ── Media hero (sticky, does not scroll) ────────────── */}
                  <MediaHero
                    nameEs={exercise.nameEs}
                    gifUrl={exercise.gifUrl}
                    thumbnailUrl={exercise.thumbnailUrl}
                    videoUrl={videoUrl}
                  />

                  {/* Hidden title for a11y (visible title is inside MediaHero) */}
                  <DialogPrimitive.Title className="sr-only" id="exercise-modal-title">
                    {exercise.nameEs}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">
                    {`Detalles del ejercicio ${exercise.nameEs}. Músculo primario: ${MUSCLE_LABELS[exercise.primaryMuscle] ?? exercise.primaryMuscle}. Dificultad: ${difficultyMeta.label}.`}
                  </DialogPrimitive.Description>

                  {/* ── Scrollable content ──────────────────────────────── */}
                  <div className="flex-1 overflow-y-auto overscroll-contain">
                    <div className="flex flex-col gap-5 px-4 pt-4 pb-6">

                      {/* Context bar (sets / reps / rest) */}
                      {context !== null && (
                        <motion.div
                          initial={sectionHidden}
                          animate={makeSectionVariant(0)}
                        >
                          <ContextBar
                            targetSets={context.targetSets}
                            targetRepsMin={context.targetRepsMin}
                            targetRepsMax={context.targetRepsMax}
                            restSeconds={context.restSeconds}
                          />
                        </motion.div>
                      )}

                      {/* Muscles */}
                      <motion.div
                        initial={sectionHidden}
                        animate={makeSectionVariant(context !== null ? 1 : 0)}
                        className="flex flex-col gap-2"
                      >
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#52525B]">
                          Músculos
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          <MuscleBadge muscle={exercise.primaryMuscle} />
                          {exercise.secondaryMuscles.map((m) => (
                            <MuscleBadge key={m} muscle={m} faded />
                          ))}
                        </div>
                      </motion.div>

                      {/* Equipment + Difficulty */}
                      <motion.div
                        initial={sectionHidden}
                        animate={makeSectionVariant(context !== null ? 2 : 1)}
                        className="flex items-center justify-between rounded-xl bg-[#27272A] px-4 py-3 ring-1 ring-[#3F3F46]"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                            Equipo
                          </span>
                          <span className="text-sm font-medium text-[#E4E4E7]">
                            {equipmentLabel}
                          </span>
                        </div>

                        <div className="h-6 w-px bg-[#3F3F46]" aria-hidden="true" />

                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                            Dificultad
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#E4E4E7]">
                              {difficultyMeta.label}
                            </span>
                            <DifficultyDots filled={difficultyMeta.filled} />
                          </div>
                        </div>
                      </motion.div>

                      {/* Instructions */}
                      <motion.div
                        initial={sectionHidden}
                        animate={makeSectionVariant(context !== null ? 3 : 2)}
                        className="flex flex-col gap-2"
                      >
                        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#52525B]">
                          Instrucciones
                        </h3>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#A1A1AA]">
                          {exercise.instructionsEs}
                        </p>
                      </motion.div>

                      {/* Trainer notes callout */}
                      {context?.notes && (
                        <motion.div
                          initial={sectionHidden}
                          animate={makeSectionVariant(context !== null ? 4 : 3)}
                          className="flex gap-3 rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/5 px-4 py-3"
                        >
                          <StickyNote
                            className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]"
                            aria-hidden="true"
                          />
                          <p className="text-sm italic leading-relaxed text-[#E4E4E7]">
                            {context.notes}
                          </p>
                        </motion.div>
                      )}

                      {/* Bottom safe area for mobile home indicator */}
                      <div className="h-4" aria-hidden="true" />
                    </div>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </>
          )}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
