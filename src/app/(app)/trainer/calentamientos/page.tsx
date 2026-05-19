"use client";

import { Flame } from "lucide-react";
import { ExerciseLibraryPage } from "@/components/shared/exercise-library-page";

export default function CalentamientosPage() {
  return (
    <ExerciseLibraryPage
      category="WARMUP"
      basePath="/trainer/calentamientos"
      title="Calentamientos"
      description="Ejercicios de calentamiento, estiramiento y movilidad para antes de entrenar."
      searchPlaceholder="Buscar calentamiento..."
      createLabel="Crear calentamiento"
      emptyHeading="No hay calentamientos aún"
      emptyBody="Creá tu primer ejercicio de calentamiento o estiramiento."
      loadingLabel="Cargando calentamientos"
      emptyIcon={<Flame className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />}
    />
  );
}
