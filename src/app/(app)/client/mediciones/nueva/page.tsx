"use client";

import { Scale } from "lucide-react";
import Link from "next/link";

export default function NuevaMedicionPage() {
  return (
    <div className="max-w-md mx-auto py-12 px-6 text-center space-y-4">
      <Scale className="h-12 w-12 text-neutral-600 mx-auto" />
      <h2 className="text-xl font-bold text-neutral-50">Nueva medición</h2>
      <p className="text-sm text-neutral-400">
        El registro de mediciones estará disponible en la versión completa.
        Podés ver tu historial en la sección de mediciones.
      </p>
      <Link
        href="/client/mediciones"
        className="inline-block px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold rounded-lg transition-colors"
      >
        Ver mediciones
      </Link>
    </div>
  );
}
