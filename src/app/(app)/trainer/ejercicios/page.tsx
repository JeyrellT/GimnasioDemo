"use client";

import { Library } from "lucide-react";
import { ExerciseLibraryPage } from "@/components/shared/exercise-library-page";

export default function EjerciciosPage() {
  return (
    <ExerciseLibraryPage
      basePath="/trainer/ejercicios"
      title="Biblioteca de ejercicios"
      description="Buscá y filtrá ejercicios por grupo muscular o equipo."
      searchPlaceholder="Buscar ejercicio..."
      createLabel="Crear ejercicio"
      emptyHeading="No se encontraron ejercicios"
      emptyBody="Probá con otros términos o filtros."
      loadingLabel="Cargando ejercicios"
      emptyIcon={<Library className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />}
    />
  );
}
