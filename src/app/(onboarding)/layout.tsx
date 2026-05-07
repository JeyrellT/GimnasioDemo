import Link from "next/link";
import type { ReactNode } from "react";

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
        <Link href="/" aria-label="Forja — inicio">
          <svg width="28" height="28" viewBox="0 0 56 56" fill="none" aria-hidden="true">
            <rect width="56" height="56" rx="10" fill="#1E2A38" />
            <path d="M14 38 L28 16 L42 38 H32 L28 30 L24 38 Z" fill="#FF6A1A" />
            <rect x="11" y="40" width="34" height="4" rx="2" fill="#FF6A1A" />
          </svg>
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
          className="h-full bg-[#FF6A1A] transition-all duration-500"
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
