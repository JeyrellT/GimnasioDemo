"use client";
// Sin conexión — fallback page del service worker

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#09090B] px-6 text-center">
      {/* Isotipo inline (SVG mínimo para no depender de assets de red) */}
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        aria-hidden="true"
      >
        <rect width="56" height="56" rx="12" fill="#1E2A38" />
        <path d="M14 38 L28 16 L42 38 H32 L28 30 L24 38 Z" fill="var(--brand-primary)" />
        <rect x="11" y="40" width="34" height="4" rx="2" fill="var(--brand-primary)" />
      </svg>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Sin conexión</h1>
        <p className="text-[#A1A1AA] text-base max-w-xs text-balance">
          Tu trabajo sigue guardado. Cuando vuelva la red, todo se sincroniza
          automáticamente.
        </p>
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 rounded-lg bg-brand-primary px-6 py-3 text-sm font-semibold text-white min-h-[44px] hover:bg-brand-primary-hover transition-colors"
      >
        Reintentar
      </button>
    </main>
  );
}
