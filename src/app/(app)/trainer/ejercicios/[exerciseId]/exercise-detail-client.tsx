"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Dumbbell, Loader2 } from "lucide-react";
import { getExerciseDetail } from "@/app/actions/exercises";
import { ExerciseBodyMapView } from "./_components/exercise-body-map-view";
import { ExerciseMediaGallery } from "./_components/exercise-media-gallery";
import { DEMO_TRAINER_ID } from "@/lib/demo/seed-data";
import type { DemoExerciseRow } from "@/lib/offline/db";
import type { MuscleGroup, ExerciseEquipment, ExerciseDifficulty } from "@prisma/client";

// ---------------------------------------------------------------------------
// Display constants
// ---------------------------------------------------------------------------

const MUSCLE_COLORS: Record<string, { bg: string; text: string }> = {
  CHEST:      { bg: "bg-[#EF4444]/20", text: "text-[#EF4444]" },
  BACK:       { bg: "bg-[#3B82F6]/20", text: "text-[#3B82F6]" },
  SHOULDERS:  { bg: "bg-[#F59E0B]/20", text: "text-[#F59E0B]" },
  BICEPS:     { bg: "bg-[#A855F7]/20", text: "text-[#A855F7]" },
  TRICEPS:    { bg: "bg-[#EC4899]/20", text: "text-[#EC4899]" },
  FOREARMS:   { bg: "bg-[#84CC16]/20", text: "text-[#84CC16]" },
  ABS:        { bg: "bg-[#06B6D4]/20", text: "text-[#06B6D4]" },
  OBLIQUES:   { bg: "bg-[#0EA5E9]/20", text: "text-[#0EA5E9]" },
  GLUTES:     { bg: "bg-[#F97316]/20", text: "text-[#F97316]" },
  QUADS:      { bg: "bg-[#22C55E]/20", text: "text-[#22C55E]" },
  HAMSTRINGS: { bg: "bg-[#14B8A6]/20", text: "text-[#14B8A6]" },
  CALVES:     { bg: "bg-[#6366F1]/20", text: "text-[#6366F1]" },
  NECK:       { bg: "bg-[#A1A1AA]/20", text: "text-[#A1A1AA]" },
  FULL_BODY:  { bg: "bg-[#8B5CF6]/20", text: "text-[#8B5CF6]" },
  BODY_WEIGHT: { bg: "bg-[#27272A]",   text: "text-[#A1A1AA]" },
};

const MUSCLE_LABELS: Record<string, string> = {
  CHEST:      "Pecho",
  BACK:       "Espalda",
  SHOULDERS:  "Hombros",
  BICEPS:     "Bíceps",
  TRICEPS:    "Tríceps",
  FOREARMS:   "Antebrazos",
  ABS:        "Abdomen",
  OBLIQUES:   "Oblicuos",
  GLUTES:     "Glúteos",
  QUADS:      "Cuádriceps",
  HAMSTRINGS: "Isquiotibiales",
  CALVES:     "Gemelos",
  NECK:       "Cuello",
  FULL_BODY:  "Cuerpo entero",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  BODYWEIGHT:  "Peso corporal",
  BODY_WEIGHT: "Peso corporal",
  BARBELL:     "Barra",
  DUMBBELL:    "Mancuerna",
  KETTLEBELL:  "Kettlebell",
  MACHINE:     "Máquina",
  CABLE:       "Cable",
  BAND:        "Banda",
  OTHER:       "Otro",
};

const DIFFICULTY_META: Record<string, { label: string; filled: 1 | 2 | 3 }> = {
  BEGINNER:     { label: "Principiante", filled: 1 },
  INTERMEDIATE: { label: "Intermedio",   filled: 2 },
  ADVANCED:     { label: "Avanzado",     filled: 3 },
};

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
                ? "h-2 w-2 rounded-full bg-[#FF6A1A]"
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
  const [exercise, setExercise] = useState<DemoExerciseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

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
        <Loader2 className="h-6 w-6 animate-spin text-[#FF6A1A]" aria-label="Cargando ejercicio" />
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
          className="text-xs text-[#FF6A1A] hover:text-[#E55A0E] transition-colors"
        >
          Volver a la biblioteca
        </Link>
      </div>
    );
  }

  const isOwner =
    exercise.createdById !== null && exercise.createdById === DEMO_TRAINER_ID;
  const hasMedia = !!(exercise.thumbnailUrl ?? exercise.gifUrl);

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href="/trainer/ejercicios"
        className="inline-flex items-center gap-1.5 text-sm text-[#71717A] transition-colors hover:text-[#FAFAFA]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Biblioteca
      </Link>

      {/* Hero card */}
      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {/* Name row + owner badge + edit button */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-[#FAFAFA] leading-tight">
              {exercise.nameEs}
            </h1>
            {isOwner && (
              <span className="inline-flex items-center rounded-full bg-[#FF6A1A]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#FF6A1A]">
                Tuyo
              </span>
            )}
          </div>

          {isOwner && (
            <Link
              href={`/trainer/ejercicios/${exerciseId}/editar`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-1.5 text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#FF6A1A]/40 hover:bg-[#3F3F46]"
            >
              <Pencil className="h-3.5 w-3.5 text-[#FF6A1A]" aria-hidden="true" />
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
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left column: body map */}
        <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h2 className="mb-4 text-sm font-semibold text-[#FAFAFA]">Músculos trabajados</h2>
          <ExerciseBodyMapView
            primaryMuscle={exercise.primaryMuscle as MuscleGroup}
            secondaryMuscles={exercise.secondaryMuscles as MuscleGroup[]}
          />
        </div>

        {/* Right column: media + instructions */}
        <div className="flex flex-col gap-5">
          {/* Media gallery */}
          {hasMedia && (
            <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <h2 className="mb-4 text-sm font-semibold text-[#FAFAFA]">Multimedia</h2>
              <ExerciseMediaGallery
                thumbnailUrl={exercise.thumbnailUrl}
                gifUrl={exercise.gifUrl}
                mediaUrl={null}
              />
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <h2 className="mb-3 text-sm font-semibold text-[#FAFAFA]">Instrucciones</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#A1A1AA]">
              {exercise.instructionsEs}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
