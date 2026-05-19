"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BlacklineFitnessLogo } from "@/components/shared/blackline-fitness-logo";

interface OnboardingLayoutProps {
  children: ReactNode;
}

// Steps shown in the wizard progress bar — ordered by pathname segment
const STEP_PATHS = [
  "/onboarding/cliente/consentimientos",
  "/onboarding/cliente/cedula",
  "/onboarding/cliente/parq",
  "/onboarding/cliente/antropometria",
  "/onboarding/cliente/objetivo",
  "/onboarding/cliente/foto-inicial",
  "/onboarding/cliente/resumen",
];

const TOTAL_STEPS = STEP_PATHS.length;

function deriveStep(pathname: string): number {
  const idx = STEP_PATHS.findIndex((p) => pathname.startsWith(p));
  return idx >= 0 ? idx + 1 : 1;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const pathname = usePathname();
  const currentStep = deriveStep(pathname);
  const progressPct = Math.round((currentStep / TOTAL_STEPS) * 100);

  return (
    <div className="flex min-h-dvh flex-col bg-[#09090B]">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b border-[#3F3F46] px-4">
        <Link href="/" aria-label="Blackline Fitness — inicio">
          <BlacklineFitnessLogo variant="mark" size={28} />
        </Link>
        <p className="text-xs text-[#71717A]">
          Paso {currentStep} de {TOTAL_STEPS}
        </p>
        {/* Spacer */}
        <div className="w-7" aria-hidden="true" />
      </header>

      {/* Progress bar */}
      <div
        aria-label="Progreso del registro"
        className="h-1 bg-[#27272A]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={currentStep}
      >
        <div
          className="h-full bg-brand-primary transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center px-4 py-8">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
