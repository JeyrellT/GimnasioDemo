"use client";

// =============================================================================
// BLACKLINE FITNESS — Error boundary: perfil de cliente
// Owner: frontend-react.
// =============================================================================

import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ClientProfileError({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
        <AlertTriangle
          className="h-8 w-8 text-[#EF4444]"
          aria-hidden="true"
        />
      </div>

      <div className="max-w-sm space-y-2 text-center">
        <h2 className="text-xl font-bold text-[#FAFAFA]">
          No pudimos cargar este perfil.
        </h2>
        <p className="text-sm text-[#71717A]">
          {error.message
            ? error.message
            : "Ocurrió un error inesperado. Reintentá en unos segundos."}
        </p>
        {error.digest && (
          <p className="text-[11px] text-[#52525B]">Código: {error.digest}</p>
        )}
      </div>

      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-[#09090B] transition-colors hover:bg-[#2563EB] focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2"
        aria-label="Reintentar carga del perfil"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reintentar
      </button>
    </div>
  );
}
