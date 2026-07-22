"use client";

// =============================================================================
// BLACKLINE FITNESS — Error boundary para el route group (app)
// Owner: frontend-react.
//
// Captura errores no manejados en cualquier ruta autenticada (/inicio, /trainer,
// /client, /admin, /perfil). El boundary de un sub-route como
// /trainer/clientes/[clientId]/error.tsx sigue teniendo prioridad cuando existe.
// Tener este genérico evita que un error en /trainer/finanzas o /trainer/rutinas
// crashee el shell completo y caiga al boundary root inutil.
// =============================================================================

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: ErrorPageProps) {
  // Captura en Sentry si esta wired (instrumentation.ts). Si no hay DSN, no-op.
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import("@sentry/nextjs")
        .then((Sentry) => Sentry.captureException(error))
        .catch(() => {});
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)]">
        <AlertTriangle className="h-8 w-8 text-[#EF4444]" aria-hidden="true" />
      </div>

      <div className="max-w-sm space-y-2 text-center">
        <h2 className="text-xl font-bold text-[#FAFAFA]">
          Algo se rompió en esta sección.
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
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-[#09090B] transition-colors hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2"
        aria-label="Reintentar carga de la sección"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reintentar
      </button>
    </div>
  );
}
