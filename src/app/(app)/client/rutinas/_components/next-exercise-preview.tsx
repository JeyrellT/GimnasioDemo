"use client";

import type { RoutineSnapshotExercise } from "@/types/domain";
import { ExerciseThumbnail } from "@/components/shared/exercise-thumbnail";
import { SupersetBadge } from "@/components/shared/superset-badge";
import { getSupersetColor } from "@/lib/supersets";
import { Clock, ChevronRight, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

type NextExerciseVariant = "compact" | "full";

interface NextExercisePreviewProps {
  exercise: RoutineSnapshotExercise;
  positionHuman: number;
  total: number;
  variant?: NextExerciseVariant;
  /**
   * `true` cuando este "next" comparte supersetGroup con el ejercicio actual.
   * Cambia la copia y resalta el preview con el color del grupo para
   * comunicar "no es un descanso largo, vas para adentro de la superserie".
   */
  sameSupersetAsCurrent?: boolean;
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
  sameSupersetAsCurrent = false,
  className,
}: NextExercisePreviewProps) {
  const groupColor =
    sameSupersetAsCurrent && exercise.supersetGroup
      ? getSupersetColor(exercise.supersetGroup)
      : null;

  const groupStyle: React.CSSProperties | undefined = groupColor
    ? { borderColor: groupColor, boxShadow: `inset 4px 0 0 ${groupColor}` }
    : undefined;

  if (variant === "full") {
    return (
      <div
        className={cn(
          "rounded-2xl border bg-brand-primary/5 p-4",
          groupColor ? "border-2" : "border border-brand-primary/30",
          className,
        )}
        style={groupStyle}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={groupColor ? { color: groupColor } : undefined}
          >
            {sameSupersetAsCurrent ? (
              <span className="inline-flex items-center gap-1">
                <Link2 className="h-3 w-3" aria-hidden="true" />
                Continúa en superserie {positionHuman}/{total}
              </span>
            ) : (
              <>Siguiente {positionHuman}/{total}</>
            )}
          </p>
          <SupersetBadge group={exercise.supersetGroup} size="xs" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-[#27272A]">
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
        "flex items-center gap-3 rounded-lg border bg-[#09090B]/40 px-3 py-2.5",
        groupColor ? "border-2" : "border-[#27272A]",
        className,
      )}
      style={groupStyle}
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
        <div className="flex items-center gap-1.5 flex-wrap">
          <p
            className="text-[10px] font-medium uppercase tracking-wide"
            style={
              groupColor ? { color: groupColor } : { color: "#52525B" }
            }
          >
            {sameSupersetAsCurrent
              ? `Continúa SS · ${positionHuman}/${total}`
              : `Siguiente ${positionHuman}/${total}`}
          </p>
          <SupersetBadge group={exercise.supersetGroup} size="xs" />
        </div>
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
