"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";
import { getExerciseDetail } from "@/app/actions/exercises";
import { ExerciseForm } from "@/components/forms/exercise-form";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import type { Exercise, MuscleGroup, ExerciseEquipment, ExerciseDifficulty, ExerciseCategory } from "@prisma/client";

interface Props {
  exerciseId: string;
  basePath?: string;
}

export default function EditarEjercicioClient({ exerciseId, basePath = "/trainer/ejercicios" }: Props) {
  const { user } = useAuth();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"ok" | "not-found" | "public" | "not-owner">("ok");

  useEffect(() => {
    if (!user) return;

    getExerciseDetail({ id: exerciseId }).then((result) => {
      if (!result.ok) {
        setStatus("not-found");
        setLoading(false);
        return;
      }

      const ex = result.value;

      // Public exercises cannot be edited
      if (ex.isPublic || ex.createdById === null) {
        setStatus("public");
        setLoading(false);
        return;
      }

      // Only the owner trainer can edit
      if (ex.createdById !== user.id) {
        setStatus("not-owner");
        setLoading(false);
        return;
      }

      setExercise(ex);
      setLoading(false);
    });
  }, [exerciseId, user]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-label="Cargando ejercicio" />
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#3F3F46] px-6 py-16 text-center">
        <Lock className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-semibold text-[#FAFAFA]">
            Ejercicio no encontrado
          </p>
          <p className="mt-1 text-xs text-[#71717A]">
            El ejercicio no existe o fue eliminado.
          </p>
        </div>
        <Link
          href={basePath}
          className="text-xs text-brand-primary hover:text-brand-primary-hover transition-colors"
        >
          Volver a la biblioteca
        </Link>
      </div>
    );
  }

  if (status === "public") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#3F3F46] px-6 py-16 text-center">
        <Lock className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-semibold text-[#FAFAFA]">
            No podés editar este ejercicio
          </p>
          <p className="mt-1 text-xs text-[#71717A]">
            Los ejercicios de la biblioteca pública no se pueden modificar. Podés
            crear una copia privada desde la vista de detalle.
          </p>
        </div>
        <Link
          href={`${basePath}/${exerciseId}`}
          className="text-xs text-brand-primary hover:text-brand-primary-hover transition-colors"
        >
          Ver ejercicio
        </Link>
      </div>
    );
  }

  if (status === "not-owner") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#3F3F46] px-6 py-16 text-center">
        <Lock className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-semibold text-[#FAFAFA]">
            Sin permiso
          </p>
          <p className="mt-1 text-xs text-[#71717A]">
            Solo podés editar los ejercicios que vos creaste.
          </p>
        </div>
        <Link
          href={basePath}
          className="text-xs text-brand-primary hover:text-brand-primary-hover transition-colors"
        >
          Volver a la biblioteca
        </Link>
      </div>
    );
  }

  if (!exercise) return null;

  // All checks passed — render the form
  const exerciseData = {
    id: exercise.id,
    nameEs: exercise.nameEs,
    nameEn: exercise.nameEn,
    instructionsEs: exercise.instructionsEs,
    primaryMuscle: exercise.primaryMuscle as MuscleGroup,
    secondaryMuscles: (exercise.secondaryMuscles ?? []) as MuscleGroup[],
    equipment: exercise.equipment as ExerciseEquipment,
    difficulty: exercise.difficulty as ExerciseDifficulty,
    category: (exercise.category ?? "STRENGTH") as ExerciseCategory,
    thumbnailUrl: exercise.thumbnailUrl,
    gifUrl: exercise.gifUrl,
    mediaUrl: null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`${basePath}/${exerciseId}`}
          className="flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#A1A1AA] transition-colors"
          aria-label="Volver al detalle del ejercicio"
        >
          <ArrowLeft className="h-4 w-4" />
          {exercise.nameEs}
        </Link>
      </div>

      <PageHeader
        title="Editar ejercicio"
        description="Modificá los detalles de tu ejercicio privado."
      />

      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-6 shadow-sm">
        <ExerciseForm exercise={exerciseData} basePath={basePath} />
      </div>
    </div>
  );
}
