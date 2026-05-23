"use client";

import { useEffect, useRef } from "react";
import type { RoutineSnapshotExercise } from "@/types/domain";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExerciseThumbnail } from "@/components/shared/exercise-thumbnail";
import { CheckCircle, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExerciseListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: RoutineSnapshotExercise[];
  currentIndex: number;
  /** Indices de ejercicios completados (los que estan antes del current cuentan como done). */
  completedIndexes?: number[];
  /** Callback al tocar una tarjeta. */
  onSelectExercise: (index: number) => void;
}

export function ExerciseListSheet({
  open,
  onOpenChange,
  exercises,
  currentIndex,
  completedIndexes,
  onSelectExercise,
}: ExerciseListSheetProps) {
  const currentRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open && currentRef.current) {
      const el = currentRef.current;
      setTimeout(() => {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 50);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#3F3F46] px-5 py-4 flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-brand-primary" aria-hidden="true" />
          <DialogTitle className="text-base font-semibold text-[#FAFAFA]">
            {exercises.length} ejercicios
          </DialogTitle>
        </div>
        <DialogDescription className="sr-only">
          Lista completa de ejercicios de la rutina. El ejercicio actual esta resaltado.
        </DialogDescription>

        {/* Lista scrollable */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {(() => {
            // Pre-compute occurrence counters so the same exercise repeated
            // within the routine (back-off / drop / eccentric round) gets a
            // "Vuelta X/Y" label instead of looking like a duplicate bug.
            const seenCount = new Map<string, number>();
            const totalCount = new Map<string, number>();
            for (const e of exercises) {
              totalCount.set(
                e.exerciseId,
                (totalCount.get(e.exerciseId) ?? 0) + 1,
              );
            }
            return exercises.map((ex, i) => {
              const isCurrent = i === currentIndex;
              const isDone =
                (completedIndexes ?? []).includes(i) || i < currentIndex;
              const occurrence = (seenCount.get(ex.exerciseId) ?? 0) + 1;
              seenCount.set(ex.exerciseId, occurrence);
              const total = totalCount.get(ex.exerciseId) ?? 1;
              const isRepeat = total > 1;

              return (
                <button
                  type="button"
                  key={`${ex.exerciseId}_${i}`}
                  ref={isCurrent ? currentRef : null}
                  onClick={() => {
                    // Sheet close is the consumer's responsibility — calling
                    // onOpenChange(false) here would let the pointerdown
                    // propagate to the underlying dialog overlay (Radix bug
                    // with sibling dialogs in the same Portal layer).
                    onSelectExercise(i);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    isCurrent
                      ? "bg-brand-primary/15 border border-brand-primary/40"
                      : "border border-transparent hover:bg-[#27272A]",
                  )}
                  aria-current={isCurrent ? "true" : undefined}
                >
                  {/* Estado */}
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle
                        className="h-5 w-5 text-[#22C55E]"
                        aria-hidden="true"
                      />
                    ) : isCurrent ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#3F3F46] text-[10px] font-medium text-[#52525B]">
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Thumb */}
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#27272A]">
                    <ExerciseThumbnail
                      thumbnailUrl={ex.thumbnailUrl}
                      gifUrl={ex.gifUrl}
                      slug={ex.slug}
                      nameEn={ex.nameEn}
                      alt={ex.nameEs}
                      iconSize="sm"
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          isCurrent
                            ? "text-[#FAFAFA]"
                            : isDone
                              ? "text-[#A1A1AA]"
                              : "text-[#E4E4E7]",
                        )}
                      >
                        {ex.nameEs}
                      </p>
                      {isRepeat && (
                        <span className="inline-flex items-center rounded-full bg-brand-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                          {occurrence}/{total}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#71717A]">
                      {ex.targetSets}{" "}
                      {ex.targetSets === 1 ? "serie" : "series"} &middot;{" "}
                      {ex.targetRepsMin === ex.targetRepsMax
                        ? `${ex.targetRepsMin} reps`
                        : `${ex.targetRepsMin}-${ex.targetRepsMax} reps`}
                    </p>
                  </div>
                </button>
              );
            });
          })()}
        </div>

        {/* Footer */}
        <div className="border-t border-[#3F3F46] px-5 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-xl border border-[#3F3F46] py-3 text-sm font-medium text-[#A1A1AA] hover:bg-[#27272A] transition-colors min-h-[44px]"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
