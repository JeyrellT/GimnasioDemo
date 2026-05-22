"use client";

import { cn } from "@/lib/utils";

interface CountdownOverlayProps {
  /** El número grande a mostrar: 3, 2, 1 o "GO!" cuando es 0. */
  secondsLeft: number;
  /** Nombre del ejercicio que está a punto de empezar (caption arriba). */
  nextExerciseName: string;
  /** "Empezando" / "Set 2 de Press de banca" / etc. */
  contextLabel: string;
}

export function CountdownOverlay({
  secondsLeft,
  nextExerciseName,
  contextLabel,
}: CountdownOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-primary">
        {contextLabel}
      </span>
      <span className="px-4 text-center text-sm font-medium text-[#FAFAFA]">
        {nextExerciseName}
      </span>

      {/* key fuerza remount en cada tick, re-disparando animate-in */}
      <span
        key={secondsLeft}
        aria-live="polite"
        className={cn(
          "tabular tabular-nums select-none",
          secondsLeft === 0
            ? "text-[64px] font-extrabold tracking-tight text-brand-primary"
            : "text-[120px] leading-none font-extrabold text-[#FAFAFA]",
          "animate-in zoom-in-50 fade-in-0 duration-500 ease-out",
        )}
      >
        {secondsLeft === 0 ? "¡GO!" : secondsLeft}
      </span>

      <span className="text-xs text-[#A1A1AA]">
        Preparate para arrancar
      </span>
    </div>
  );
}
