"use client";

// =============================================================================
// BLACKLINE FITNESS — UnavailableInDemo
// Shared stub component for pages not available in the demo build.
// =============================================================================

import Link from "next/link";
import { Construction } from "lucide-react";

export function UnavailableInDemo() {
  return (
    <div className="max-w-md mx-auto py-12 px-6 text-center space-y-4">
      <Construction className="h-12 w-12 text-[#FF6A1A] mx-auto" />
      <h2 className="text-xl font-bold text-[#FAFAFA]">No disponible en demo</h2>
      <p className="text-sm text-[#A1A1AA]">
        Esta sección está disponible en la versión completa.
        En el demo, podés explorar las funcionalidades del entrenador.
      </p>
      <Link
        href="/inicio"
        className="inline-block px-4 py-2 bg-[#FF6A1A] hover:bg-[#E55A0E] text-white text-sm font-semibold rounded-lg"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
