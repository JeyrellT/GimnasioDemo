"use client";

import * as React from "react";
import { Play, Dumbbell, Clock, ListTodo } from "lucide-react";
import { ExerciseThumbnail } from "@/components/shared/exercise-thumbnail";
import { LoopMediaFrame } from "@/components/shared/loop-media-frame";
import { getVideoLoopEmbed, type LoopEmbed } from "@/lib/media/video-url";
import { cn } from "@/lib/utils";
import type { RoutineSnapshotExercise } from "@/types/domain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function repsLabel(ex: RoutineSnapshotExercise): string {
  return ex.targetRepsMin === ex.targetRepsMax
    ? `${ex.targetRepsMin} reps`
    : `${ex.targetRepsMin}-${ex.targetRepsMax} reps`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReadyToGoScreenProps {
  routineName: string;
  dayName: string;
  totalExercises: number;
  firstExercise: RoutineSnapshotExercise;
  onStart: () => void;
  onShowList: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReadyToGoScreen({
  routineName,
  dayName,
  totalExercises,
  firstExercise,
  onStart,
  onShowList,
}: ReadyToGoScreenProps) {
  const videoLoopEmbed = React.useMemo<LoopEmbed | null>(
    () => getVideoLoopEmbed(firstExercise.mediaUrl ?? null),
    [firstExercise.mediaUrl],
  );
  const [videoError, setVideoError] = React.useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on exercise change is the intent
  React.useEffect(() => {
    setVideoError(false);
  }, [firstExercise.exerciseId]);

  const totalSets = Math.max(1, firstExercise.targetSets);

  return (
    <div className="flex flex-col bg-[#18181B]">
      {/* Media */}
      <div className="relative w-full overflow-hidden bg-[#09090B] px-4 py-3 sm:p-0">
        <div className="mx-auto w-full max-w-[320px] sm:max-w-none">
          {videoLoopEmbed && !videoError ? (
            // maxAspectRatio={1} caps the frame to a 1:1 square — portrait
            // videos show torso + arms while keeping the mobile CTA reachable.
            <LoopMediaFrame
              embed={videoLoopEmbed}
              title={`Demostración: ${firstExercise.nameEs}`}
              onVideoError={() => setVideoError(true)}
              fit="contain"
              minAspectRatio={1}
              maxAspectRatio={1.35}
            />
          ) : (
            // aspect-square matches the maxAspectRatio={1} used for videos
            // above, so the fallback renders at the same compact size.
            <div className="aspect-square w-full">
              <ExerciseThumbnail
                thumbnailUrl={firstExercise.thumbnailUrl}
                gifUrl={firstExercise.gifUrl}
                slug={firstExercise.slug}
                nameEn={firstExercise.nameEn}
                alt={firstExercise.nameEs}
              />
            </div>
          )}
        </div>

        {/* "PRÓXIMO" ribbon */}
        <div className="absolute left-3 top-3">
          <span className="bg-[#09090B]/70 px-2 py-1 rounded-full backdrop-blur-sm text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-primary">
            PRÓXIMO
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4">
        {/* Day + exercise name */}
        <div>
          <p className="text-xs text-[#71717A]">{dayName}</p>
          <p className="mt-0.5 text-xl font-bold text-[#FAFAFA] leading-tight">
            {firstExercise.nameEs}
          </p>
        </div>

        {/* Meta: series, reps, rest */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#A1A1AA]">
          <span className="inline-flex items-center gap-1">
            <Dumbbell className="h-3 w-3" aria-hidden="true" />
            {totalSets} {totalSets === 1 ? "serie" : "series"}
          </span>
          <span className="inline-flex items-center gap-1">
            {repsLabel(firstExercise)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {firstExercise.restSeconds}s descanso
          </span>
        </div>

        {/* Routine summary card */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-brand-primary/30",
            "bg-brand-primary/5 px-4 py-3",
          )}
        >
          <Dumbbell className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-[#A1A1AA]">
            Rutina completa:{" "}
            <span className="text-[#FAFAFA] font-semibold">
              {totalExercises} {totalExercises === 1 ? "ejercicio" : "ejercicios"}
            </span>
          </p>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={onStart}
          aria-label={`Comenzar ${routineName}`}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-xl",
            "bg-brand-primary hover:bg-brand-primary-hover text-white",
            "py-3.5 text-sm font-semibold min-h-[48px] transition-colors",
          )}
        >
          <Play className="h-4 w-4 fill-current" aria-hidden="true" />
          Comenzar
        </button>

        {/* Secondary: show list */}
        <button
          type="button"
          onClick={onShowList}
          className={cn(
            "inline-flex w-full items-center justify-center gap-1.5",
            "text-xs text-[#A1A1AA] hover:text-[#FAFAFA] min-h-[40px] transition-colors",
          )}
        >
          <ListTodo className="h-3.5 w-3.5" aria-hidden="true" />
          Ver los {totalExercises} ejercicios
        </button>
      </div>
    </div>
  );
}
