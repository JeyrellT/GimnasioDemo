"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Error logged to Sentry via next.config instrumentation
    // Do NOT log sensitive data here
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#09090B] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#450A0A]">
        <AlertCircle className="h-8 w-8 text-[#EF4444]" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Algo se rompió</h1>
        <p className="text-[#A1A1AA] text-base max-w-sm text-balance">
          Algo se rompió de nuestro lado. Equipo Blackline Fitness ya fue notificado. Si
          urge, escribí a{" "}
          <a
            href="mailto:soporte@blacklinefitness.app"
            className="text-[#3B82F6] underline underline-offset-4"
          >
            soporte@blacklinefitness.app
          </a>
          .
        </p>
        {error.digest && (
          <p className="text-[#71717A] text-xs mt-1 font-mono">
            ID: {error.digest}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white min-h-[44px] hover:bg-[#2563EB] transition-colors"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Intentá de nuevo
      </button>
    </div>
  );
}
