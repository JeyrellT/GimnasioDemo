"use client";

// =============================================================================
// FORJA — DashboardSkeleton (and section-level variants)
// Phase 3, Agent 7 (data-viz).
// Loading fallbacks for Suspense boundaries. Mirrors the real page layout to
// prevent layout shift. Uses ShimmerSkeleton for animated placeholders.
//
// Exports:
//   DashboardSkeleton  — full page
//   KPISkeleton        — KPI hero row only
//   ChartsSkeleton     — aggregate charts row only
//   RosterSkeleton     — roster table only
// =============================================================================

import { ShimmerSkeleton } from "@/components/ui/shimmer-skeleton";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// KPISkeleton
// Mirrors the 1→3→5 column grid of KPIHeroRow.
// -----------------------------------------------------------------------------

export function KPISkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando indicadores clave"
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5",
        className,
      )}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-xl border border-[#3F3F46] bg-[#18181B] p-4"
        >
          {/* Label */}
          <ShimmerSkeleton className="h-2.5 w-20" rounded="sm" />
          {/* Value */}
          <ShimmerSkeleton className="h-9 w-16" rounded="md" />
          {/* Delta badge */}
          <ShimmerSkeleton className="h-5 w-24" rounded="full" />
          {/* Sparkline */}
          <ShimmerSkeleton className="mt-2 h-8 w-full" rounded="sm" />
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ChartsSkeleton
// Mirrors the 1→2→3 column grid of AggregateCharts.
// -----------------------------------------------------------------------------

export function ChartsSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando gráficos"
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-xl border border-[#3F3F46] bg-[#18181B] p-5"
        >
          {/* Card header */}
          <div className="flex flex-col gap-1.5">
            <ShimmerSkeleton className="h-2.5 w-36" rounded="sm" />
            <ShimmerSkeleton className="h-2 w-28" rounded="sm" />
          </div>
          {/* Chart body placeholder */}
          <ShimmerSkeleton className="h-[240px] w-full" rounded="lg" />
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// RosterSkeleton
// Mirrors a table: a header row + 6 data rows, each with avatar + cells.
// Agent 8 can drop this inside its own Suspense boundary.
// -----------------------------------------------------------------------------

export function RosterSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando lista de clientes"
      className={cn(
        "overflow-hidden rounded-xl border border-[#3F3F46] bg-[#18181B]",
        className,
      )}
    >
      {/* Table header */}
      <div className="flex items-center gap-4 border-b border-[#3F3F46] px-5 py-3">
        <ShimmerSkeleton className="h-3 w-24" rounded="sm" />
        <ShimmerSkeleton className="ml-auto h-3 w-16" rounded="sm" />
        <ShimmerSkeleton className="h-3 w-16" rounded="sm" />
        <ShimmerSkeleton className="h-3 w-16" rounded="sm" />
        <ShimmerSkeleton className="h-3 w-20" rounded="sm" />
      </div>

      {/* Data rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-[#27272A] px-5 py-3 last:border-b-0"
        >
          {/* Avatar */}
          <ShimmerSkeleton className="size-8 shrink-0" rounded="full" />
          {/* Name + email */}
          <div className="flex flex-col gap-1.5">
            <ShimmerSkeleton className="h-3 w-28" rounded="sm" />
            <ShimmerSkeleton className="h-2 w-36" rounded="sm" />
          </div>
          {/* Adherence */}
          <ShimmerSkeleton className="ml-auto h-5 w-12" rounded="full" />
          {/* Last session */}
          <ShimmerSkeleton className="h-3 w-20" rounded="sm" />
          {/* Routine */}
          <ShimmerSkeleton className="h-3 w-24" rounded="sm" />
          {/* Alert count */}
          <ShimmerSkeleton className="h-5 w-8" rounded="full" />
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Internal: CalendarAlertsSkeleton
// Mirrors the 2-panel row that Agents 5/6 own. Used only inside DashboardSkeleton.
// Agent 8 does NOT import this directly.
// -----------------------------------------------------------------------------

function CalendarAlertsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Calendar panel */}
      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5">
        <div className="mb-4 flex flex-col gap-1.5">
          <ShimmerSkeleton className="h-2.5 w-28" rounded="sm" />
          <ShimmerSkeleton className="h-2 w-20" rounded="sm" />
        </div>
        {/* Heatmap grid: 14 days × 1 row */}
        <div className="flex gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <ShimmerSkeleton key={i} className="h-8 w-full" rounded="md" />
          ))}
        </div>
        {/* Event list */}
        <div className="mt-4 flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <ShimmerSkeleton className="h-3 w-14" rounded="sm" />
              <ShimmerSkeleton className="h-3 flex-1" rounded="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Alerts panel */}
      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5">
        <div className="mb-4 flex flex-col gap-1.5">
          <ShimmerSkeleton className="h-2.5 w-20" rounded="sm" />
          <ShimmerSkeleton className="h-2 w-32" rounded="sm" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="mb-2.5 flex items-start gap-3 rounded-lg border border-[#27272A] p-3"
          >
            <ShimmerSkeleton className="mt-0.5 size-4 shrink-0" rounded="full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <ShimmerSkeleton className="h-3 w-32" rounded="sm" />
              <ShimmerSkeleton className="h-2 w-full" rounded="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// DashboardSkeleton — full page
// Matches the visual structure:
//   [greeting]
//   [KPI row × 5]
//   [calendar | alerts]
//   [charts × 3]
//   [roster table]
// -----------------------------------------------------------------------------

export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando tablero"
      className={cn("flex flex-col gap-6", className)}
    >
      {/* Greeting bar */}
      <div className="flex flex-col gap-2">
        <ShimmerSkeleton className="h-7 w-64" rounded="md" />
        <ShimmerSkeleton className="h-4 w-48" rounded="sm" />
      </div>

      {/* KPI hero row */}
      <KPISkeleton />

      {/* Calendar + Alerts */}
      <CalendarAlertsSkeleton />

      {/* Aggregate charts */}
      <ChartsSkeleton />

      {/* Roster table */}
      <RosterSkeleton />
    </div>
  );
}
