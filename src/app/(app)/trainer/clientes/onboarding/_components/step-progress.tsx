"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/stores/onboarding-wizard-store";

const STEP_LABELS: Record<number, string> = {
  1: "Datos básicos",
  2: "Cédula",
  3: "Entrenamiento",
  4: "Cuestionario",
  5: "Medidas",
  6: "Fotos",
  7: "Plan",
  8: "Consentimientos",
  9: "Revisión",
};

interface StepProgressProps {
  currentStep: number;
  total: number;
}

export function StepProgress({ currentStep, total }: StepProgressProps) {
  const goToStep = useOnboardingStore((s) => s.goToStep);
  const payload = useOnboardingStore((s) => s.payload);

  const pct = Math.round((currentStep / total) * 100);

  // A step is "done" if its key exists in the payload (steps 2,3,6 are optional).
  const stepKey = (n: number) => `step${n}` as keyof typeof payload;
  const isDone = (n: number) =>
    n < currentStep && payload[stepKey(n)] !== undefined;

  return (
    <div className="space-y-3 pb-2">
      {/* Fraction + label */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#A1A1AA]">
          Paso{" "}
          <span className="tabular-nums text-[#FAFAFA]">{currentStep}</span>
          {" / "}
          <span className="tabular-nums">{total}</span>
        </span>
        <span className="text-xs text-[#A1A1AA]">
          {STEP_LABELS[currentStep] ?? ""}
        </span>
      </div>

      {/* Bar */}
      <Progress value={pct} aria-label={`Progreso: ${pct}%`} />

      {/* Step dots (scrollable on mobile) */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
        role="list"
        aria-label="Pasos del asistente"
      >
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const isActive = n === currentStep;
          const done = isDone(n);

          return (
            <button
              key={n}
              type="button"
              role="listitem"
              aria-label={`${STEP_LABELS[n]} ${done ? "(completado)" : isActive ? "(actual)" : ""}`}
              aria-current={isActive ? "step" : undefined}
              onClick={() => goToStep(n)}
              className={cn(
                "flex h-7 min-w-[28px] items-center justify-center rounded-full text-[11px] font-bold transition-colors shrink-0",
                isActive
                  ? "bg-[#3B82F6] text-white"
                  : done
                    ? "bg-[#27272A] text-[#22C55E] ring-1 ring-[#22C55E]/40"
                    : "bg-[#27272A] text-[#52525B] hover:text-[#A1A1AA]",
              )}
            >
              {done && !isActive ? "✓" : n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
