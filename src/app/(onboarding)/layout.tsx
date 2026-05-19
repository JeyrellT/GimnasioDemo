import Link from "next/link";
import type { ReactNode } from "react";
import { BlacklineFitnessLogo } from "@/components/shared/blackline-fitness-logo";

interface OnboardingLayoutProps {
  children: ReactNode;
}

// Steps shown in the wizard progress bar
const STEPS = [
  "Consentimientos",
  "Identidad",
  "PAR-Q",
  "Medidas",
  "Objetivo",
  "Fotos",
  "Resumen",
];

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#09090B]">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b border-[#3F3F46] px-4">
        <Link href="/" aria-label="Blackline Fitness — inicio">
          <BlacklineFitnessLogo variant="mark" size={28} />
        </Link>
        <p className="text-xs text-[#71717A]">Configuración inicial</p>
        {/* Spacer */}
        <div className="w-7" aria-hidden="true" />
      </header>

      {/* Progress bar — visual only, steps counted per page */}
      <div
        aria-label="Progreso del registro"
        className="h-1 bg-[#27272A]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={STEPS.length}
      >
        <div
          className="h-full bg-[#3B82F6] transition-all duration-500"
          style={{ width: "14.28%" }}
        />
      </div>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center px-4 py-8">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
