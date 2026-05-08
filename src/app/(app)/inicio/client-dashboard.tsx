"use client";

// =============================================================================
// VIZION — Client Dashboard (demo stub)
// This component is not currently used in the demo build.
// Replaced with demo-friendly version that avoids direct Prisma usage.
// =============================================================================

import Link from "next/link";
import { Dumbbell, TrendingUp, Scale, ArrowRight } from "lucide-react";

interface ClientDashboardProps {
  userId: string;
  name: string;
}

export function ClientDashboard({ userId: _userId, name }: ClientDashboardProps) {
  const firstName = name.split(" ")[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">
          Bienvenido, {firstName}.
        </h1>
      </div>

      {/* Today's session card */}
      <section aria-labelledby="today-section">
        <h2 id="today-section" className="sr-only">
          Sesión de hoy
        </h2>
        <div className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-5">
          <p className="text-sm text-[#71717A]">Tu sesión de hoy</p>
          <p className="text-base font-medium text-[#A1A1AA] mt-1">
            Tu entrenador está armando tu primera rutina.
          </p>
        </div>
      </section>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/client/progreso"
          className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 hover:bg-[#27272A] transition-colors"
        >
          <TrendingUp className="h-4 w-4 text-[#A1A1AA] mb-2" aria-hidden="true" />
          <p className="text-xl font-bold tabular-nums text-[#FAFAFA]">—</p>
          <p className="text-xs text-[#71717A]">Último peso registrado</p>
        </Link>

        <Link
          href="/client/mediciones/nueva"
          className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 hover:bg-[#27272A] transition-colors"
        >
          <Scale className="h-4 w-4 text-[#A1A1AA] mb-2" aria-hidden="true" />
          <p className="text-xl font-bold text-[#FF6A1A]">Pesarme</p>
          <p className="text-xs text-[#71717A]">Registrar medición</p>
        </Link>
      </div>
    </div>
  );
}
