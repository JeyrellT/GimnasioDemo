"use client";

import type { RoutineSnapshotExercise } from "@/types/domain";
import { ExerciseThumbnail } from "@/components/shared/exercise-thumbnail";
import { Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type NextExerciseVariant = "compact" | "full";

interface NextExercisePreviewProps {
  exercise: RoutineSnapshotExercise;
  positionHuman: number;
  total: number;
  variant?: NextExerciseVariant;
  className?: string;
}

function repsLabel(ex: RoutineSnapshotExercise): string {
  return ex.targetRepsMin === ex.targetRepsMax
    ? `${ex.targetRepsMin} reps`
    : `${ex.targetRepsMin}-${ex.targetRepsMax} reps`;
}

export function NextExercisePreview({
  exercise,
  positionHuman,
  total,
  variant = "compact",
  className,
}: NextExercisePreviewProps) {
  if (variant === "full") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-4",
          className,
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-primary">
          Siguiente {positionHuman}/{total}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#27272A]">
            <ExerciseThumbnail
              thumbnailUrl={exercise.thumbnailUrl}
              gifUrl={exercise.gifUrl}
              slug={exercise.slug}
              nameEn={exercise.nameEn}
              alt={exercise.nameEs}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-base font-bold text-[#FAFAFA] leading-tight">
              {exercise.nameEs}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#A1A1AA]">
              <span>
                {exercise.targetSets}{" "}
                {exercise.targetSets === 1 ? "serie" : "series"}
              </span>
              <span>{repsLabel(exercise)}</span>
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {exercise.restSeconds}s
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-[#27272A] bg-[#09090B]/40 px-3 py-2.5",
        className,
      )}
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#27272A]">
        <ExerciseThumbnail
          thumbnailUrl={exercise.thumbnailUrl}
          gifUrl={exercise.gifUrl}
          slug={exercise.slug}
          nameEn={exercise.nameEn}
          alt={exercise.nameEs}
          iconSize="sm"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#52525B]">
          Siguiente {positionHuman}/{total}
        </p>
        <p className="truncate text-xs font-medium text-[#A1A1AA]">
          {exercise.nameEs}
        </p>
      </div>
      <ChevronRight
        className="h-3.5 w-3.5 shrink-0 text-[#52525B]"
        aria-hidden="true"
      />
    </div>
  );
}
