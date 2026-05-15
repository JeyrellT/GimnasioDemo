"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Dumbbell,
  Flame,
  Zap,
  Wind,
  TrendingDown,
  LayoutGrid,
  Loader2,
  Trash2,
} from "lucide-react";
import { listMyRoutines, deleteRoutine } from "@/app/actions/routines";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateCR } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { DemoRoutineRow } from "@/lib/offline/db";

// ---------------------------------------------------------------------------
// Goal config — color tokens and icons per goal type
// ---------------------------------------------------------------------------

type GoalKey = "HYPERTROPHY" | "STRENGTH" | "FAT_LOSS" | "ENDURANCE" | "GENERAL";

interface GoalConfig {
  label: string;
  icon: LucideIcon;
  /** Tailwind arbitrary border-left color */
  borderColor: string;
  /** Tailwind arbitrary bg for the icon badge */
  iconBg: string;
  /** Tailwind arbitrary text color for the icon */
  iconColor: string;
  /** Tailwind arbitrary gradient stop for the top accent strip */
  gradientFrom: string;
  /** Tailwind arbitrary text color for the goal label */
  labelColor: string;
}

const GOAL_CONFIG: Record<GoalKey, GoalConfig> = {
  HYPERTROPHY: {
    label: "Hipertrofia",
    icon: Flame,
    borderColor: "border-l-[#FF6A1A]",
    iconBg: "bg-[#FF6A1A]/10",
    iconColor: "text-[#FF6A1A]",
    gradientFrom: "from-[#FF6A1A]/8",
    labelColor: "text-[#FF6A1A]",
  },
  STRENGTH: {
    label: "Fuerza",
    icon: Zap,
    borderColor: "border-l-[#EF4444]",
    iconBg: "bg-[#EF4444]/10",
    iconColor: "text-[#EF4444]",
    gradientFrom: "from-[#EF4444]/8",
    labelColor: "text-[#EF4444]",
  },
  FAT_LOSS: {
    label: "Pérdida de grasa",
    icon: TrendingDown,
    borderColor: "border-l-[#22C55E]",
    iconBg: "bg-[#22C55E]/10",
    iconColor: "text-[#22C55E]",
    gradientFrom: "from-[#22C55E]/8",
    labelColor: "text-[#22C55E]",
  },
  ENDURANCE: {
    label: "Resistencia",
    icon: Wind,
    borderColor: "border-l-[#3B82F6]",
    iconBg: "bg-[#3B82F6]/10",
    iconColor: "text-[#3B82F6]",
    gradientFrom: "from-[#3B82F6]/8",
    labelColor: "text-[#3B82F6]",
  },
  GENERAL: {
    label: "General",
    icon: LayoutGrid,
    borderColor: "border-l-[#A1A1AA]",
    iconBg: "bg-[#A1A1AA]/10",
    iconColor: "text-[#A1A1AA]",
    gradientFrom: "from-[#A1A1AA]/8",
    labelColor: "text-[#A1A1AA]",
  },
};

function getGoalConfig(goal: string): GoalConfig {
  return GOAL_CONFIG[goal as GoalKey] ?? GOAL_CONFIG.GENERAL;
}

// ---------------------------------------------------------------------------
// Filter tabs config
// ---------------------------------------------------------------------------

type FilterValue = "todas" | "activas" | "archivadas";

const FILTER_TABS: { value: FilterValue; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "activas", label: "Activas" },
  { value: "archivadas", label: "Archivadas" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RutinasPage() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const activeFilter: FilterValue =
    filterParam === "archivadas"
      ? "archivadas"
      : filterParam === "activas"
        ? "activas"
        : "todas";

  const [routines, setRoutines] = useState<DemoRoutineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    listMyRoutines().then((result) => {
      if (result.ok) {
        const sorted = [...result.value].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        );
        setRoutines(sorted);
      }
      setLoading(false);
    });
  }, []);

  async function handleDelete(routineId: string) {
    const result = await deleteRoutine(routineId);
    if (result.ok) {
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    }
    setConfirmDeleteId(null);
  }

  const filtered = routines.filter((r) => {
    if (activeFilter === "activas") return !r.isArchived;
    if (activeFilter === "archivadas") return r.isArchived;
    return true;
  });

  const totalCount = routines.length;
  const activeCount = routines.filter((r) => !r.isArchived).length;
  const archivedCount = routines.filter((r) => r.isArchived).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Mis rutinas"
        description="Plantillas de entrenamiento que podés asignar a tus clientes."
        actions={
          <Link
            href="/trainer/rutinas/nueva"
            className="flex items-center gap-2 rounded-lg bg-[#FF6A1A] px-4 py-2 text-sm font-semibold text-white min-h-[44px] hover:bg-[#E55A0E] transition-colors shadow-[0_0_16px_rgba(255,106,26,0.25)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva rutina
          </Link>
        }
      />

      {/* Stats pills */}
      <div className="flex flex-wrap gap-2">
        <StatPill label="Total" value={totalCount} />
        <StatPill label="Activas" value={activeCount} dotColor="bg-[#22C55E]" />
        <StatPill label="Archivadas" value={archivedCount} dimmed />
      </div>

      {/* Filter tabs */}
      <div
        role="tablist"
        aria-label="Filtrar rutinas"
        className="flex gap-1 rounded-xl border border-[#3F3F46] bg-[#18181B] p-1 w-fit"
      >
        {FILTER_TABS.map((tab) => {
          const isActive = tab.value === activeFilter;
          return (
            <Link
              key={tab.value}
              href={
                tab.value === "todas"
                  ? "/trainer/rutinas"
                  : `/trainer/rutinas?filter=${tab.value}`
              }
              role="tab"
              aria-selected={isActive}
              className={[
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-[#FF6A1A] text-white shadow-sm"
                  : "text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A]",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#FF6A1A]" aria-label="Cargando rutinas" />
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="relative flex flex-col items-center justify-center gap-5 rounded-2xl border border-[#3F3F46] bg-[#18181B]/80 px-8 py-20 text-center overflow-hidden backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {/* Radial glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="h-48 w-48 rounded-full bg-[#FF6A1A]/5 blur-3xl" />
          </div>

          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#3F3F46] bg-[#27272A] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <Dumbbell className="h-9 w-9 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
          </div>

          <div className="relative flex flex-col gap-1">
            <h3 className="text-base font-semibold text-[#FAFAFA]">
              {activeFilter === "archivadas"
                ? "No hay rutinas archivadas"
                : activeFilter === "activas"
                  ? "No hay rutinas activas"
                  : "Aún no hay rutinas"}
            </h3>
            <p className="max-w-xs text-sm text-balance text-[#A1A1AA]">
              {activeFilter === "todas"
                ? "Creá tu primera plantilla y empezá a entrenar."
                : "Cambiá el filtro para ver otras rutinas."}
            </p>
          </div>

          {activeFilter === "todas" && (
            <Link
              href="/trainer/rutinas/nueva"
              className="relative mt-2 inline-flex items-center gap-2 rounded-lg bg-[#FF6A1A] px-5 py-2.5 text-sm font-semibold text-white min-h-[44px] hover:bg-[#E55A0E] transition-colors"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nueva rutina
            </Link>
          )}
        </div>
      ) : (
        /* Routine grid */
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => {
            const cfg = getGoalConfig(r.goal);
            const GoalIcon = cfg.icon;
            return (
              <li key={r.id} className="relative">
                <Link
                  href={`/trainer/rutinas/${r.id}`}
                  className={[
                    "group relative flex flex-col overflow-hidden rounded-xl border border-[#3F3F46] border-l-4",
                    cfg.borderColor,
                    "bg-[#18181B]/80 backdrop-blur-sm",
                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
                    "hover:bg-[#27272A]/80",
                    "hover:scale-[1.02]",
                    "hover:shadow-[0_0_20px_rgba(255,106,26,0.08)]",
                    "transition-all duration-200",
                    r.isArchived ? "opacity-60" : "opacity-100",
                  ].join(" ")}
                >
                  <div
                    aria-hidden="true"
                    className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${cfg.gradientFrom} via-transparent to-transparent`}
                  />

                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}
                        >
                          <GoalIcon
                            className={`h-4 w-4 ${cfg.iconColor}`}
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#FAFAFA] leading-snug">
                            {r.name}
                          </p>
                          <p className={`mt-0.5 text-xs font-medium ${cfg.labelColor}`}>
                            {cfg.label}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {r.isArchived ? (
                          <span className="rounded-full border border-[#3F3F46] bg-[#27272A] px-2 py-0.5 text-xs text-[#71717A]">
                            Archivada
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-[#71717A]">
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full bg-[#22C55E]"
                              aria-label="Activa"
                            />
                            Activa
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <MetaChip label={`${r.splitDays} días/sem`} />
                      <MetaChip label={`${r.durationWeeks} sem`} />
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#52525B]">
                        Actualizada {formatDateCR(r.updatedAt, "d MMM yyyy")}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Delete button — positioned absolute top-right, outside the Link */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(r.id);
                  }}
                  className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-[#27272A]/80 border border-[#3F3F46] text-[#71717A] hover:text-[#EF4444] hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10 transition-colors"
                  aria-label={`Eliminar ${r.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6 shadow-2xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EF4444]/10">
                <Trash2 className="h-6 w-6 text-[#EF4444]" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#FAFAFA]">Eliminar rutina</h3>
                <p className="mt-1 text-sm text-[#A1A1AA]">
                  Esta acción no se puede deshacer. La rutina se eliminará permanentemente.
                </p>
              </div>
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 rounded-lg border border-[#3F3F46] bg-[#27272A] px-4 py-2.5 text-sm font-medium text-[#FAFAFA] hover:bg-[#3F3F46] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="flex-1 rounded-lg bg-[#EF4444] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#DC2626] transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components (file-local, no need to extract — single-use)
// ---------------------------------------------------------------------------

function StatPill({
  label,
  value,
  dotColor,
  dimmed = false,
}: {
  label: string;
  value: number;
  dotColor?: string;
  dimmed?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border border-[#3F3F46] bg-[#18181B] px-3 py-1 text-xs",
        dimmed ? "text-[#52525B]" : "text-[#A1A1AA]",
      ].join(" ")}
    >
      {dotColor && (
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
      )}
      <span className={dimmed ? "text-[#52525B]" : "font-semibold text-[#FAFAFA]"}>{value}</span>
      {label}
    </span>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-[#3F3F46] bg-[#27272A] px-2 py-0.5 text-xs text-[#71717A]">
      {label}
    </span>
  );
}
