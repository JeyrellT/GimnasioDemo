"use client";

import { cn } from "@/lib/utils";

interface SegmentedProgressBarProps {
  /** Cantidad total de segmentos (ejercicios). */
  total: number;
  /** Índice del ejercicio actual (0-based). */
  currentIndex: number;
  /** Sets totales del ejercicio actual. */
  currentSetsTotal: number;
  /** Sets completados del ejercicio actual. 0 si está empezando. */
  currentSetsDone: number;
  /** Click en un segmento — navegación libre. Opcional. */
  onSegmentClick?: (index: number) => void;
  className?: string;
}

export function SegmentedProgressBar({
  total,
  currentIndex,
  currentSetsTotal,
  currentSetsDone,
  onSegmentClick,
  className,
}: SegmentedProgressBarProps) {
  const safeTotal = Math.max(1, total);
  const completed = Math.min(currentIndex, safeTotal);
  const isFinished = currentIndex >= safeTotal;
  const currentPct = isFinished
    ? 100
    : Math.min(
        100,
        Math.max(0, (currentSetsDone / Math.max(1, currentSetsTotal)) * 100),
      );

  return (
    <div
      aria-label={`Progreso de rutina: ejercicio ${Math.min(completed + 1, safeTotal)} de ${safeTotal}`}
      className={cn("flex w-full items-stretch gap-1 px-4 py-2", className)}
    >
      {Array.from({ length: safeTotal }).map((_, i) => {
        const isDone = isFinished || i < currentIndex;
        const isCurrent = !isFinished && i === currentIndex;
        const fillPct = isDone ? 100 : isCurrent ? currentPct : 0;

        const segment = (
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#27272A]">
            <div
              className={cn(
                "absolute inset-y-0 left-0 transition-[width] duration-500 ease-out rounded-full",
                isDone ? "bg-[#22C55E]" : "bg-brand-primary",
              )}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        );

        if (!onSegmentClick) {
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are fixed-position and never reordered
            <div key={i} className="flex-1 min-w-[8px]">
              {segment}
            </div>
          );
        }

        return (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are fixed-position and never reordered
            key={i}
            type="button"
            onClick={() => onSegmentClick(i)}
            className="flex-1 min-w-[8px] py-1.5 -my-1.5 group focus-visible:outline-none"
            aria-label={`Ir al ejercicio ${i + 1}`}
          >
            <div className="group-hover:opacity-80 transition-opacity">{segment}</div>
          </button>
        );
      })}
    </div>
  );
}
