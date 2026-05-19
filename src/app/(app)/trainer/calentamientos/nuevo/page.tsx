"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExerciseForm } from "@/components/forms/exercise-form";
import { PageHeader } from "@/components/shared/page-header";

export default function NuevoCalentamientoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/trainer/calentamientos"
          className="flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#A1A1AA] transition-colors"
          aria-label="Volver a calentamientos"
        >
          <ArrowLeft className="h-4 w-4" />
          Calentamientos
        </Link>
      </div>

      <PageHeader
        title="Nuevo calentamiento"
        description="Creá un ejercicio de calentamiento o estiramiento para tus rutinas."
      />

      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-6 shadow-sm">
        <ExerciseForm exercise={null} defaultCategory="WARMUP" />
      </div>
    </div>
  );
}
