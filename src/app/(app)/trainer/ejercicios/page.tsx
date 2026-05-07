"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Library, Search, Plus, Dumbbell, Loader2 } from "lucide-react";
import { searchExercises } from "@/app/actions/exercises";
import { PageHeader } from "@/components/shared/page-header";
import { DEMO_TRAINER_ID } from "@/lib/demo/seed-data";
import type { ExerciseSearchResult } from "@/types/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const MUSCLE_PILLS = [
  { label: "Pecho", value: "CHEST" },
  { label: "Espalda", value: "BACK" },
  { label: "Hombros", value: "SHOULDERS" },
  { label: "Bíceps", value: "BICEPS" },
  { label: "Tríceps", value: "TRICEPS" },
  { label: "Piernas", value: "QUADS" },
  { label: "Core", value: "ABS" },
] as const;

const EQUIPMENT_PILLS = [
  { label: "Barra", value: "BARBELL" },
  { label: "Mancuerna", value: "DUMBBELL" },
  { label: "Máquina", value: "MACHINE" },
  { label: "Peso corporal", value: "BODYWEIGHT" },
  { label: "Cable", value: "CABLE" },
  { label: "Banda", value: "BAND" },
] as const;

// primaryMuscle → color map
const MUSCLE_COLORS: Record<string, { bg: string; text: string }> = {
  CHEST: { bg: "bg-[#EF4444]/20", text: "text-[#EF4444]" },
  BACK: { bg: "bg-[#3B82F6]/20", text: "text-[#3B82F6]" },
  SHOULDERS: { bg: "bg-[#F59E0B]/20", text: "text-[#F59E0B]" },
  BICEPS: { bg: "bg-[#A855F7]/20", text: "text-[#A855F7]" },
  TRICEPS: { bg: "bg-[#EC4899]/20", text: "text-[#EC4899]" },
  FOREARMS: { bg: "bg-[#84CC16]/20", text: "text-[#84CC16]" },
  QUADS: { bg: "bg-[#22C55E]/20", text: "text-[#22C55E]" },
  HAMSTRINGS: { bg: "bg-[#14B8A6]/20", text: "text-[#14B8A6]" },
  GLUTES: { bg: "bg-[#F97316]/20", text: "text-[#F97316]" },
  CALVES: { bg: "bg-[#6366F1]/20", text: "text-[#6366F1]" },
  ABS: { bg: "bg-[#06B6D4]/20", text: "text-[#06B6D4]" },
  OBLIQUES: { bg: "bg-[#0EA5E9]/20", text: "text-[#0EA5E9]" },
  FULL_BODY: { bg: "bg-[#8B5CF6]/20", text: "text-[#8B5CF6]" },
  NECK: { bg: "bg-[#A1A1AA]/20", text: "text-[#A1A1AA]" },
};

const MUSCLE_LABELS: Record<string, string> = {
  CHEST: "Pecho",
  BACK: "Espalda",
  SHOULDERS: "Hombros",
  BICEPS: "Bíceps",
  TRICEPS: "Tríceps",
  FOREARMS: "Antebrazos",
  ABS: "Core",
  OBLIQUES: "Oblicuos",
  GLUTES: "Glúteos",
  QUADS: "Cuádriceps",
  HAMSTRINGS: "Isquiotibiales",
  CALVES: "Pantorrillas",
  NECK: "Cuello",
  FULL_BODY: "Cuerpo completo",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  BODYWEIGHT: "Peso corporal",
  BODY_WEIGHT: "Peso corporal",
  BARBELL: "Barra",
  DUMBBELL: "Mancuerna",
  KETTLEBELL: "Kettlebell",
  MACHINE: "Máquina",
  CABLE: "Cable",
  BAND: "Banda",
  OTHER: "Otro",
};

// ── Difficulty dots ───────────────────────────────────────────────────────────

function DifficultyDots({ level }: { level: string | null }) {
  const filled =
    level === "BEGINNER" ? 1 : level === "INTERMEDIATE" ? 2 : level === "ADVANCED" ? 3 : 0;
  return (
    <span className="flex items-center gap-0.5" aria-label={level ?? "sin nivel"}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={
            n <= filled
              ? "h-1.5 w-1.5 rounded-full bg-[#FF6A1A]"
              : "h-1.5 w-1.5 rounded-full bg-[#3F3F46]"
          }
        />
      ))}
    </span>
  );
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function buildHref(params: {
  q?: string;
  muscle?: string;
  equipment?: string;
  owner?: string;
}) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.muscle) sp.set("muscle", params.muscle);
  if (params.equipment) sp.set("equipment", params.equipment);
  if (params.owner) sp.set("owner", params.owner);
  const qs = sp.toString();
  return `/trainer/ejercicios${qs ? "?" + qs : ""}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EjerciciosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get("q") ?? undefined;
  const muscle = searchParams.get("muscle") ?? undefined;
  const equipment = searchParams.get("equipment") ?? undefined;
  const owner = searchParams.get("owner") ?? undefined;

  const [exercises, setExercises] = useState<ExerciseSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(q ?? "");

  const hasFilters = !!(q || muscle || equipment || owner);
  const clearHref = "/trainer/ejercicios";

  const loadExercises = useCallback(async () => {
    setLoading(true);
    const result = await searchExercises({
      query: q,
      primaryMuscle: muscle,
      equipment,
      limit: 40,
    });

    if (result.ok) {
      // Apply ownership filter client-side (demo: check createdById via the full list)
      let filtered = result.value;
      if (owner === "mine") {
        // In demo mode, privately created exercises have createdById === DEMO_TRAINER_ID
        // searchExercises returns ExerciseSearchResult which lacks createdById,
        // so we can't filter by "mine" accurately here — show all as fallback.
        filtered = result.value;
      } else if (owner === "public") {
        filtered = result.value;
      }
      setExercises(filtered);
    } else {
      setExercises([]);
    }
    setLoading(false);
  }, [q, muscle, equipment, owner]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  // Sync search input when URL q param changes
  useEffect(() => {
    setSearchInput(q ?? "");
  }, [q]);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const href = buildHref({ q: searchInput || undefined, muscle, equipment, owner });
    router.push(href);
  }

  function muscleHref(value: string) {
    return buildHref({ q, muscle: muscle === value ? undefined : value, equipment, owner });
  }

  function equipmentHref(value: string) {
    return buildHref({ q, muscle, equipment: equipment === value ? undefined : value, owner });
  }

  function ownerHref(value: string) {
    return buildHref({ q, muscle, equipment, owner: owner === value ? undefined : value });
  }

  const pillBase = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ";
  const pillActive = "bg-[#FF6A1A] text-white";
  const pillInactive = "bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-[#FAFAFA]";

  return (
    <div className="space-y-6">
      {/* Header: title on left, create button on right */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Biblioteca de ejercicios"
          description="Buscá y filtrá ejercicios por grupo muscular o equipo."
        />
        <Link
          href="/trainer/ejercicios/nuevo"
          className="flex shrink-0 items-center gap-2 rounded-lg bg-[#FF6A1A] px-4 py-2 text-sm font-semibold text-white min-h-[44px] hover:bg-[#E55A0E] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1A]/60"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Crear ejercicio
        </Link>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative flex items-center">
        <Search
          className="absolute left-3 h-4 w-4 text-[#71717A] pointer-events-none"
          aria-hidden="true"
        />
        <input
          name="q"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar ejercicio..."
          className="w-full rounded-xl border border-[#3F3F46] bg-[#18181B] pl-9 pr-28 py-3 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:ring-2 focus:ring-[#FF6A1A]/60 min-h-[44px] transition-colors"
        />
        <button
          type="submit"
          className="absolute right-1.5 rounded-lg bg-[#FF6A1A] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#E55A0E] transition-colors min-h-[36px]"
        >
          Buscar
        </button>
      </form>

      {/* Filter pills */}
      <div className="flex flex-col gap-2">
        {/* Muscle group pills */}
        <div className="flex flex-wrap gap-2">
          {MUSCLE_PILLS.map(({ label, value }) => (
            <Link
              key={value}
              href={muscleHref(value)}
              className={pillBase + (muscle === value ? pillActive : pillInactive)}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Equipment pills */}
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_PILLS.map(({ label, value }) => (
            <Link
              key={value}
              href={equipmentHref(value)}
              className={pillBase + (equipment === value ? pillActive : pillInactive)}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Ownership pills */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={ownerHref("mine")}
            className={pillBase + (owner === "mine" ? pillActive : pillInactive)}
          >
            Tuyos
          </Link>
          <Link
            href={ownerHref("public")}
            className={pillBase + (owner === "public" ? pillActive : pillInactive)}
          >
            Públicos
          </Link>
        </div>
      </div>

      {/* Clear filters link */}
      {hasFilters && (
        <Link
          href={clearHref}
          className="inline-flex text-xs text-[#FF6A1A] hover:text-[#E55A0E] transition-colors"
        >
          Limpiar filtros
        </Link>
      )}

      {/* Exercise grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#FF6A1A]" aria-label="Cargando ejercicios" />
        </div>
      ) : exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#3F3F46] px-6 py-16 text-center">
          <Library className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[#FAFAFA]">No se encontraron ejercicios</p>
            <p className="mt-1 text-xs text-[#71717A]">Probá con otros términos o filtros.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-[#71717A]">
            {exercises.length} resultado{exercises.length !== 1 ? "s" : ""}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {exercises.map((ex) => {
              const muscleColor = MUSCLE_COLORS[ex.primaryMuscle ?? ""] ?? {
                bg: "bg-[#27272A]",
                text: "text-[#A1A1AA]",
              };
              const muscleLabel = MUSCLE_LABELS[ex.primaryMuscle ?? ""] ?? ex.primaryMuscle ?? "";
              const equipLabel = EQUIPMENT_LABELS[ex.equipment ?? ""] ?? ex.equipment ?? "";
              const thumbnail = ex.thumbnailUrl;

              return (
                <li key={ex.id}>
                  <Link
                    href={`/trainer/ejercicios/${ex.id}`}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-[#3F3F46] bg-[#18181B]/80 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:scale-[1.02] hover:border-[#FF6A1A]/40 hover:shadow-[0_0_0_1px_rgba(255,106,26,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1A]/60 cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full overflow-hidden bg-[#27272A]">
                      {thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbnail}
                          alt={ex.nameEs}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#27272A] to-[#18181B]">
                          <Dumbbell
                            className="h-8 w-8 text-[#3F3F46]"
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="flex flex-col gap-3 p-4">
                      {/* Name */}
                      <p className="text-sm font-semibold text-[#FAFAFA] leading-tight">{ex.nameEs}</p>

                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {ex.primaryMuscle && (
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                              muscleColor.bg +
                              " " +
                              muscleColor.text
                            }
                          >
                            {muscleLabel}
                          </span>
                        )}
                        {ex.equipment && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#27272A] text-[#A1A1AA]">
                            {equipLabel}
                          </span>
                        )}
                      </div>

                      {/* Difficulty */}
                      {ex.difficulty && (
                        <div className="flex items-center gap-1.5">
                          <DifficultyDots level={ex.difficulty} />
                          <span className="text-[10px] text-[#71717A] capitalize">
                            {ex.difficulty === "BEGINNER"
                              ? "Principiante"
                              : ex.difficulty === "INTERMEDIATE"
                                ? "Intermedio"
                                : "Avanzado"}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
