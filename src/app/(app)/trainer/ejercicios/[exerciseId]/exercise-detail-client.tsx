"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Dumbbell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getExerciseDetail, updateExerciseInstructions } from "@/app/actions/exercises";
import { ExerciseBodyMapView } from "./_components/exercise-body-map-view";
import { ExerciseMediaGallery } from "./_components/exercise-media-gallery";
import { useAuth } from "@/components/providers/auth-provider";
import type { Exercise, MuscleGroup } from "@prisma/client";
import { MUSCLE_LABELS, MUSCLE_COLORS, EQUIPMENT_LABELS, DIFFICULTY_META } from "@/lib/constants/exercise-display";

// ---------------------------------------------------------------------------
// Small UI atoms
// ---------------------------------------------------------------------------

function DifficultyDots({ level }: { level: string }) {
  const meta = DIFFICULTY_META[level] ?? { label: level, filled: 1 as const };
  return (
    <span className="flex items-center gap-1.5" aria-label={meta.label}>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {([1, 2, 3] as const).map((n) => (
          <span
            key={n}
            className={
              n <= meta.filled
                ? "h-2 w-2 rounded-full bg-[#3B82F6]"
                : "h-2 w-2 rounded-full bg-[#3F3F46]"
            }
          />
        ))}
      </span>
      <span className="text-xs text-[#71717A]">{meta.label}</span>
    </span>
  );
}

function MuscleBadge({ muscle }: { muscle: string }) {
  const colors = MUSCLE_COLORS[muscle] ?? { bg: "bg-[#27272A]", text: "text-[#A1A1AA]" };
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide " +
        colors.bg +
        " " +
        colors.text
      }
    >
      {MUSCLE_LABELS[muscle] ?? muscle}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  exerciseId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExerciseDetailClient({ exerciseId }: Props) {
  const { user } = useAuth();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  // Inline instructions edit state
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);

  useEffect(() => {
    getExerciseDetail({ id: exerciseId }).then((result) => {
      if (result.ok) {
        setExercise(result.value);
      } else {
        setMissing(true);
      }
      setLoading(false);
    });
  }, [exerciseId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#3B82F6]" aria-label="Cargando ejercicio" />
      </div>
    );
  }

  if (missing || !exercise) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#3F3F46] px-6 py-20 text-center">
        <Dumbbell className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-[#FAFAFA]">Ejercicio no encontrado</p>
          <p className="mt-1 text-xs text-[#71717A]">
            El ejercicio no existe o fue eliminado.
          </p>
        </div>
        <Link
          href="/trainer/ejercicios"
          className="text-xs text-[#3B82F6] hover:text-[#2563EB] transition-colors"
        >
          Volver a la biblioteca
        </Link>
      </div>
    );
  }

  const isOwner =
    user !== null && exercise.createdById !== null && exercise.createdById === user.id;
  function handleEditInstructions() {
    setInstructionsDraft(exercise?.instructionsEs ?? "");
    setEditingInstructions(true);
  }

  function handleCancelInstructions() {
    setEditingInstructions(false);
    setInstructionsDraft("");
  }

  async function handleSaveInstructions() {
    if (!exercise) return;
    setSavingInstructions(true);
    try {
      const result = await updateExerciseInstructions({ id: exercise.id, instructionsEs: instructionsDraft });
      if (result.ok) {
        setExercise((prev) => prev ? { ...prev, instructionsEs: instructionsDraft } : prev);
        setEditingInstructions(false);
        setInstructionsDraft("");
        toast.success("Instrucciones actualizadas");
      } else {
        toast.error("No se pudo guardar. Intenta de nuevo.");
      }
    } catch {
      toast.error("Error inesperado al guardar.");
    } finally {
      setSavingInstructions(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Back navigation */}
      <Link
        href="/trainer/ejercicios"
        className="inline-flex items-center gap-1.5 text-sm text-[#71717A] transition-colors hover:text-[#FAFAFA]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Biblioteca
      </Link>

      {/* Hero card */}
      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {/* Name row + owner badge + edit button */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-[#FAFAFA] leading-tight">
              {exercise.nameEs}
            </h1>
            {isOwner && (
              <span className="inline-flex items-center rounded-full bg-[#3B82F6]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#3B82F6]">
                Tuyo
              </span>
            )}
          </div>

          {isOwner && (
            <Link
              href={`/trainer/ejercicios/${exerciseId}/editar`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-1.5 text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3B82F6]/40 hover:bg-[#3F3F46]"
            >
              <Pencil className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
              Editar
            </Link>
          )}
        </div>

        {/* Badges row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <MuscleBadge muscle={exercise.primaryMuscle} />

          {exercise.secondaryMuscles.map((m) => {
            const colors = MUSCLE_COLORS[m] ?? { bg: "bg-[#27272A]", text: "text-[#A1A1AA]" };
            return (
              <span
                key={m}
                className={
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium " +
                  colors.bg +
                  " " +
                  colors.text +
                  " opacity-70"
                }
              >
                {MUSCLE_LABELS[m] ?? m}
              </span>
            );
          })}

          <span className="inline-flex items-center gap-1 rounded-full bg-[#27272A] px-2.5 py-0.5 text-[11px] text-[#A1A1AA]">
            <Dumbbell className="h-3 w-3" aria-hidden="true" />
            {EQUIPMENT_LABELS[exercise.equipment] ?? exercise.equipment}
          </span>
        </div>

        {/* Difficulty */}
        <div className="mt-3">
          <DifficultyDots level={exercise.difficulty} />
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left column: body map */}
        <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h2 className="mb-3 text-sm font-semibold text-[#FAFAFA]">Músculos trabajados</h2>
          <ExerciseBodyMapView
            primaryMuscle={exercise.primaryMuscle as MuscleGroup}
            secondaryMuscles={exercise.secondaryMuscles as MuscleGroup[]}
          />
        </div>

        {/* Right column: media + instructions */}
        <div className="flex flex-col gap-4">
          {/* Media gallery — always visible, with static fallback for photos */}
          <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <h2 className="mb-2 text-sm font-semibold text-[#FAFAFA]">Multimedia</h2>
            <ExerciseMediaGallery
              thumbnailUrl={exercise.thumbnailUrl}
              gifUrl={exercise.gifUrl}
              mediaUrl={exercise.mediaUrl}
              slug={exercise.slug}
            />
          </div>

          {/* Instructions — editable by any trainer */}
          <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#FAFAFA]">Instrucciones</h2>
              {!editingInstructions && (
                <button
                  type="button"
                  onClick={handleEditInstructions}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#3F3F46] bg-[#27272A] px-2.5 py-1 text-[11px] font-medium text-[#A1A1AA] transition-colors hover:border-[#3B82F6]/40 hover:text-[#FAFAFA]"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  Editar
                </button>
              )}
            </div>

            {editingInstructions ? (
              <div className="flex flex-col gap-3">
                <textarea
                  value={instructionsDraft}
                  onChange={(e) => setInstructionsDraft(e.target.value)}
                  className="w-full rounded-lg border border-[#3F3F46] bg-[#09090B] px-3 py-2.5 text-sm text-[#FAFAFA] leading-relaxed placeholder-[#52525B] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] resize-y min-h-[180px]"
                  placeholder="Describí los pasos del ejercicio...&#10;&#10;Cada párrafo separado por un enter doble se muestra como un paso distinto."
                  autoFocus
                />
                <p className="text-[11px] text-[#52525B]">
                  Podés editar el texto predeterminado o escribir tus propias instrucciones.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveInstructions}
                    disabled={savingInstructions}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingInstructions && (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    )}
                    Guardar cambios
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelInstructions}
                    disabled={savingInstructions}
                    className="inline-flex items-center rounded-lg border border-[#3F3F46] bg-transparent px-4 py-2 text-xs font-medium text-[#A1A1AA] transition-colors hover:border-[#52525B] hover:text-[#FAFAFA] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#A1A1AA]">
                {exercise.instructionsEs || (
                  <p className="italic text-[#52525B]">Sin instrucciones. Hacé clic en Editar para agregar.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
