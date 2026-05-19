"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardFilterStore } from "@/stores/dashboard-filter-store";
import type { Goal, ParqStatus } from "@prisma/client";

// ── Constants ─────────────────────────────────────────────────────────────────

type RangeChip = "today" | "7d" | "30d" | "90d";

const RANGE_LABELS: Record<RangeChip, string> = {
  today: "Hoy",
  "7d": "7 días",
  "30d": "30 días",
  "90d": "90 días",
};

const GOAL_LABELS: Record<Goal, string> = {
  FAT_LOSS: "Pérdida de grasa",
  MUSCLE_GAIN: "Ganancia muscular",
  MAINTENANCE: "Mantenimiento",
  PERFORMANCE: "Rendimiento",
  GENERAL_HEALTH: "Salud general",
};

const PARQ_LABELS: Record<ParqStatus, string> = {
  RED: "Alerta roja",
  REVIEW: "En revisión",
  GREEN: "Apto",
  NOT_COMPLETED: "Sin completar",
};

const ALL_GOALS: Goal[] = [
  "FAT_LOSS",
  "MUSCLE_GAIN",
  "MAINTENANCE",
  "PERFORMANCE",
  "GENERAL_HEALTH",
];

const ALL_PARQ: ParqStatus[] = ["RED", "REVIEW", "GREEN"];

const PARQ_DOT_COLOR: Record<ParqStatus, string> = {
  RED: "bg-[#EF4444]",
  REVIEW: "bg-[#F59E0B]",
  GREEN: "bg-[#22C55E]",
  NOT_COMPLETED: "bg-[#71717A]",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getFormattedDate(): string {
  const now = new Date();
  const raw = now.toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function isDefaultFilters(
  range: RangeChip,
  goals: string[],
  parqStatuses: string[],
): boolean {
  return range === "30d" && goals.length === 0 && parqStatuses.length === 0;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardFilterBarProps {
  trainerName: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardFilterBar({
  trainerName,
}: DashboardFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive current range chip from searchParams (URL is source of truth).
  const currentRange = (searchParams.get("range") ?? "30d") as RangeChip;
  const currentGoals = searchParams.get("goals")?.split(",").filter(Boolean) ?? [];
  const currentParq =
    searchParams.get("parqStatuses")?.split(",").filter(Boolean) ?? [];

  const { pendingGoals, pendingParqStatuses, setPendingGoals, setPendingParqStatuses, hydrate } =
    useDashboardFilterStore();

  // Hydrate pending state from URL on mount.
  useEffect(() => {
    hydrate(currentGoals, currentParq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [now] = useState(() => new Date());
  // Safe split: fall back to full name if split produces no first token.
  const firstName = trainerName.split(" ")[0] ?? trainerName;
  const greeting = `${getGreeting(now.getHours())}, ${firstName}.`;
  const dateDisplay = getFormattedDate();

  const isDirty = !isDefaultFilters(currentRange, currentGoals, currentParq);

  // Count how many filter dimensions are non-default (for the badge).
  const activeFilterCount =
    (currentRange !== "30d" ? 1 : 0) +
    (currentGoals.length > 0 ? 1 : 0) +
    (currentParq.length > 0 ? 1 : 0);

  // ── URL push helper ─────────────────────────────────────────────────────────

  const pushFilters = useCallback(
    (overrides: {
      range?: RangeChip;
      goals?: string[];
      parqStatuses?: string[];
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      const range = overrides.range ?? currentRange;
      const goals = overrides.goals ?? pendingGoals;
      const parq = overrides.parqStatuses ?? pendingParqStatuses;

      if (range === "30d") {
        params.delete("range");
      } else {
        params.set("range", range);
      }

      if (goals.length === 0) {
        params.delete("goals");
      } else {
        params.set("goals", goals.join(","));
      }

      if (parq.length === 0) {
        params.delete("parqStatuses");
      } else {
        params.set("parqStatuses", parq.join(","));
      }

      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, currentRange, pendingGoals, pendingParqStatuses],
  );

  function handleRangeChange(range: RangeChip) {
    pushFilters({ range });
  }

  function handleReset() {
    setPendingGoals([]);
    setPendingParqStatuses([]);
    router.replace("?", { scroll: false });
  }

  function handleGoalToggle(goal: string) {
    const next = pendingGoals.includes(goal)
      ? pendingGoals.filter((g) => g !== goal)
      : [...pendingGoals, goal];
    setPendingGoals(next);
    pushFilters({ goals: next });
  }

  function handleParqToggle(status: string) {
    const next = pendingParqStatuses.includes(status)
      ? pendingParqStatuses.filter((s) => s !== status)
      : [...pendingParqStatuses, status];
    setPendingParqStatuses(next);
    pushFilters({ parqStatuses: next });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      {/* Greeting */}
      <div className="min-w-0 space-y-0.5">
        <h1 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">
          {greeting}
        </h1>
        <p className="text-sm text-[#71717A]">{dateDisplay}</p>
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Range chips */}
        <div
          role="group"
          aria-label="Período"
          className="flex items-center gap-1 rounded-lg border border-[#3F3F46] bg-[#09090B] p-1"
        >
          {(["today", "7d", "30d", "90d"] as RangeChip[]).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => handleRangeChange(range)}
              aria-pressed={currentRange === range}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors min-h-[28px]",
                currentRange === range
                  ? "bg-[#3B82F6] text-[#FAFAFA]"
                  : "text-[#71717A] hover:text-[#A1A1AA] hover:bg-[#27272A]",
              )}
            >
              {RANGE_LABELS[range]}
            </button>
          ))}
        </div>

        {/* Goal multi-select */}
        <MultiSelectDropdown
          label="Objetivo"
          options={ALL_GOALS}
          selected={pendingGoals}
          onToggle={handleGoalToggle}
          renderOption={(goal) => (
            <span>{GOAL_LABELS[goal as Goal]}</span>
          )}
          renderSelectedLabel={(selected) =>
            selected.length === 0
              ? "Objetivo"
              : selected.length === 1
                ? GOAL_LABELS[selected[0] as Goal]
                : `${selected.length} objetivos`
          }
        />

        {/* PAR-Q multi-select */}
        <MultiSelectDropdown
          label="Estado PAR-Q"
          options={ALL_PARQ}
          selected={pendingParqStatuses}
          onToggle={handleParqToggle}
          renderOption={(status) => (
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  PARQ_DOT_COLOR[status as ParqStatus],
                )}
              />
              {PARQ_LABELS[status as ParqStatus]}
            </span>
          )}
          renderSelectedLabel={(selected) =>
            selected.length === 0
              ? "PAR-Q"
              : selected.length === 1
                ? PARQ_LABELS[selected[0] as ParqStatus]
                : `${selected.length} estados`
          }
        />

        {/* Active filter count badge + reset */}
        {isDirty && (
          <div className="flex items-center gap-1.5">
            {/* Badge showing count of active filter dimensions */}
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#3B82F6]/15 px-2.5 py-0.5 text-xs font-semibold text-[#3B82F6]"
              aria-live="polite"
              aria-label={`${activeFilterCount} ${activeFilterCount === 1 ? "filtro activo" : "filtros activos"}`}
            >
              {activeFilterCount} {activeFilterCount === 1 ? "filtro" : "filtros"}
            </span>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-[#3F3F46] bg-[#18181B] px-3 py-1.5 text-xs font-medium text-[#71717A] hover:text-[#FAFAFA] hover:border-[#71717A] transition-colors min-h-[36px]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Restablecer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MultiSelectDropdown ───────────────────────────────────────────────────────

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  renderOption: (value: string) => React.ReactNode;
  renderSelectedLabel: (selected: string[]) => string;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  renderOption,
  renderSelectedLabel,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;

    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;

    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const hasSelection = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px]",
          hasSelection
            ? "border-[#3B82F6]/40 bg-[#3B82F6]/8 text-[#3B82F6]"
            : "border-[#3F3F46] bg-[#18181B] text-[#71717A] hover:text-[#A1A1AA] hover:border-[#52525B]",
        )}
      >
        {renderSelectedLabel(selected)}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[180px] rounded-xl border border-[#3F3F46] bg-[#18181B] p-1.5 shadow-xl shadow-black/40"
        >
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#71717A]">
            {label}
          </p>
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onToggle(option)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                  isSelected
                    ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                    : "text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]",
                )}
              >
                {/* Checkbox indicator */}
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    isSelected
                      ? "border-[#3B82F6] bg-[#3B82F6]"
                      : "border-[#52525B] bg-transparent",
                  )}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <svg
                      viewBox="0 0 10 8"
                      className="h-2.5 w-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="1 4 4 7 9 1" />
                    </svg>
                  )}
                </span>
                {renderOption(option)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
