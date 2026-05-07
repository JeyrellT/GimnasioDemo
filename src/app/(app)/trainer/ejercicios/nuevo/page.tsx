"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExerciseForm } from "@/components/forms/exercise-form";
import { PageHeader } from "@/components/shared/page-header";

export default function NuevoEjercicioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/trainer/ejercicios"
          className="flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#A1A1AA] transition-colors"
          aria-label="Volver a la biblioteca"
        >
          <ArrowLeft className="h-4 w-4" />
          Biblioteca
        </Link>
      </div>

      <PageHeader
        title="Nuevo ejercicio"
        description="Creá un ejercicio privado para usar en tus rutinas."
      />

      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-6 shadow-sm">
        <ExerciseForm exercise={null} />
      </div>
    </div>
  );
}
