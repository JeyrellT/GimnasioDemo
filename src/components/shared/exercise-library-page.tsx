"use client";

// =============================================================================
// BLACKLINE FITNESS — ExerciseLibraryPage
// Shared grid + filter UI for ejercicios and calentamientos pages.
// Props drive the differences: category filter, basePath, labels, pills, icon.
// =============================================================================

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Loader2, Dumbbell } from "lucide-react";
import { searchExercises } from "@/app/actions/exercises";
import { PageHeader } from "@/components/shared/page-header";
import {
  MUSCLE_COLORS,
  MUSCLE_LABELS,
  EQUIPMENT_LABELS,
  DIFFICULTY_META,
} from "@/lib/constants/exercise-display";
import type { ExerciseSearchResult } from "@/types/api";

// ── Shared pill constants ─────────────────────────────────────────────────────

const MUSCLE_PILLS_STRENGTH = [
  { label: "Pecho", value: "CHEST" },
  { label: "Espalda", value: "BACK" },
  { label: "Hombros", value: "SHOULDERS" },
  { label: "Bíceps", value: "BICEPS" },
  { label: "Tríceps", value: "TRICEPS" },
  { label: "Piernas", value: "QUADS" },
  { label: "Core", value: "ABS" },
] as const;

const MUSCLE_PILLS_WARMUP = [
  { label: "Pecho", value: "CHEST" },
  { label: "Espalda", value: "BACK" },
  { label: "Hombros", value: "SHOULDERS" },
  { label: "Bíceps", value: "BICEPS" },
  { label: "Tríceps", value: "TRICEPS" },
  { label: "Piernas", value: "QUADS" },
  { label: "Core", value: "ABS" },
  { label: "Cuerpo completo", value: "FULL_BODY" },
] as const;

const EQUIPMENT_PILLS_STRENGTH = [
  { label: "Barra", value: "BARBELL" },
  { label: "Mancuerna", value: "DUMBBELL" },
  { label: "Máquina", value: "MACHINE" },
  { label: "Peso corporal", value: "BODYWEIGHT" },
  { label: "Cable", value: "CABLE" },
  { label: "Banda", value: "BAND" },
] as const;

const EQUIPMENT_PILLS_WARMUP = [
  { label: "Peso corporal", value: "BODYWEIGHT" },
  { label: "Banda", value: "BAND" },
  { label: "Mancuerna", value: "DUMBBELL" },
  { label: "Barra", value: "BARBELL" },
] as const;

// ── Difficulty dots ───────────────────────────────────────────────────────────

function DifficultyDots({ level }: { level: string | null }) {
  const meta = level ? DIFFICULTY_META[level] : undefined;
  const filled = meta?.filled ?? 0;
  return (
    <span className="flex items-center gap-0.5" aria-label={level ?? "sin nivel"}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={
            n <= filled
              ? "h-1.5 w-1.5 rounded-full bg-brand-primary"
              : "h-1.5 w-1.5 rounded-full bg-[#3F3F46]"
          }
        />
      ))}
    </span>
  );
}

// ── URL builder ───────────────────────────────────────────────────────────────

function buildHref(
  basePath: string,
  params: { q?: string; muscle?: string; equipment?: string; owner?: string },
): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.muscle) sp.set("muscle", params.muscle);
  if (params.equipment) sp.set("equipment", params.equipment);
  if (params.owner) sp.set("owner", params.owner);
  const qs = sp.toString();
  return `${basePath}${qs ? "?" + qs : ""}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ExerciseLibraryPageProps {
  /** Filters exercises by ExerciseCategory. Omit for all categories. */
  category?: "STRENGTH" | "WARMUP";
  /** URL base, e.g. "/trainer/ejercicios" or "/trainer/calentamientos" */
  basePath: string;
  title: string;
  description: string;
  /** Search input placeholder */
  searchPlaceholder: string;
  /** CTA button label */
  createLabel: string;
  /** Empty-state headline */
  emptyHeading: string;
  /** Empty-state body text */
  emptyBody: string;
  /** Aria label for the loading spinner */
  loadingLabel: string;
  /** Icon shown in the empty state */
  emptyIcon: ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExerciseLibraryPage({
  category,
  basePath,
  title,
  description,
  searchPlaceholder,
  createLabel,
  emptyHeading,
  emptyBody,
  loadingLabel,
  emptyIcon,
}: ExerciseLibraryPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get("q") ?? undefined;
  const muscle = searchParams.get("muscle") ?? undefined;
  const equipment = searchParams.get("equipment") ?? undefined;
  const ownerRaw = searchParams.get("owner");
  const owner: "mine" | "public" | undefined =
    ownerRaw === "mine" || ownerRaw === "public" ? ownerRaw : undefined;

  const [exercises, setExercises] = useState<ExerciseSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(q ?? "");

  const hasFilters = !!(q || muscle || equipment || owner);
  const clearHref = basePath;

  const loadExercises = useCallback(async () => {
    setLoading(true);
    const result = await searchExercises(
      q ?? "",
      { muscle, equipment, ...(category ? { category } : {}), owner },
      1,
      40,
    );
    setExercises(result.ok ? result.value.exercises : []);
    setLoading(false);
  }, [q, muscle, equipment, category, owner]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  useEffect(() => {
    setSearchInput(q ?? "");
  }, [q]);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(buildHref(basePath, { q: searchInput || undefined, muscle, equipment, owner }));
  }

  const musclePills = category === "WARMUP" ? MUSCLE_PILLS_WARMUP : MUSCLE_PILLS_STRENGTH;
  const equipmentPills = category === "WARMUP" ? EQUIPMENT_PILLS_WARMUP : EQUIPMENT_PILLS_STRENGTH;

  const pillBase =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ";
  const pillActive = "bg-brand-primary text-white";
  const pillInactive =
    "bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-[#FAFAFA]";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={title} description={description} />
        <Link
          href={`${basePath}/nuevo`}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white min-h-[44px] hover:brightness-110 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/60"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {createLabel}
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
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-[#3F3F46] bg-[#18181B] pl-9 pr-28 py-3 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:ring-2 focus:ring-brand-primary/60 min-h-[44px] transition-colors"
        />
        <button
          type="submit"
          className="absolute right-1.5 rounded-lg bg-brand-primary px-4 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition-colors min-h-[36px]"
        >
          Buscar
        </button>
      </form>

      {/* Filter pills */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {musclePills.map(({ label, value }) => (
            <Link
              key={value}
              href={buildHref(basePath, {
                q,
                muscle: muscle === value ? undefined : value,
                equipment,
                owner,
              })}
              className={pillBase + (muscle === value ? pillActive : pillInactive)}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {equipmentPills.map(({ label, value }) => (
            <Link
              key={value}
              href={buildHref(basePath, {
                q,
                muscle,
                equipment: equipment === value ? undefined : value,
                owner,
              })}
              className={pillBase + (equipment === value ? pillActive : pillInactive)}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref(basePath, { q, muscle, equipment, owner: owner === "mine" ? undefined : "mine" })}
            className={pillBase + (owner === "mine" ? pillActive : pillInactive)}
          >
            Tuyos
          </Link>
          <Link
            href={buildHref(basePath, { q, muscle, equipment, owner: owner === "public" ? undefined : "public" })}
            className={pillBase + (owner === "public" ? pillActive : pillInactive)}
          >
            Públicos
          </Link>
        </div>
      </div>

      {hasFilters && (
        <Link
          href={clearHref}
          className="inline-flex text-xs text-brand-primary hover:brightness-110 transition-colors"
        >
          Limpiar filtros
        </Link>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-label={loadingLabel} />
        </div>
      ) : exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#3F3F46] px-6 py-16 text-center">
          {emptyIcon}
          <div>
            <p className="text-sm font-semibold text-[#FAFAFA]">{emptyHeading}</p>
            <p className="mt-1 text-xs text-[#71717A]">{emptyBody}</p>
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
              const muscleLabel =
                MUSCLE_LABELS[ex.primaryMuscle ?? ""] ?? ex.primaryMuscle ?? "";
              const equipLabel = EQUIPMENT_LABELS[ex.equipment ?? ""] ?? ex.equipment ?? "";
              const diffMeta = ex.difficulty ? DIFFICULTY_META[ex.difficulty] : undefined;

              return (
                <li key={ex.id}>
                  <Link
                    href={`${basePath}/${ex.id}`}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-[#3F3F46] bg-[#18181B]/80 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:scale-[1.02] hover:border-brand-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/60 cursor-pointer"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-[#27272A] flex items-center justify-center">
                      {(ex.thumbnailUrl || ex.gifUrl) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={ex.thumbnailUrl ?? ex.gifUrl ?? ""}
                          alt={ex.nameEs}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Dumbbell className="h-10 w-10 text-[#3F3F46]" strokeWidth={1.5} />
                      )}
                    </div>

                    <div className="flex flex-col gap-3 p-4">
                      <p className="text-sm font-semibold text-[#FAFAFA] leading-tight">
                        {ex.nameEs}
                      </p>

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

                      {ex.difficulty && diffMeta && (
                        <div className="flex items-center gap-1.5">
                          <DifficultyDots level={ex.difficulty} />
                          <span className="text-[10px] text-[#71717A] capitalize">
                            {diffMeta.label}
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
