// =============================================================================
// FORJA — KPIHeroRow
// Phase 3, Agent 7 (data-viz).
// Server Component: maps DashboardKPIBand → 5 KpiHeroCard instances.
// Layout: 1-col mobile → 3-col tablet → 5-col desktop.
// =============================================================================

import { KpiHeroCard } from "@/components/shared/kpi-hero-card";
import { cn } from "@/lib/utils";
import type { DashboardKPIBand, DashboardKPI } from "@/types/dashboard";
import type { DeltaAlignment } from "@/types/profile";

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

export interface KPIHeroRowProps {
  kpis: DashboardKPIBand;
  className?: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Formats a numeric value into a display string.
 * Whole numbers stay as integers; fractional values get 1 decimal.
 */
function formatValue(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

/**
 * Formats a delta number into a signed string with the unit if relevant.
 * Keeps the sign explicit: "+3", "-2.5".
 */
function formatDelta(delta: number | null, unit: string): string | undefined {
  if (delta === null) return undefined;
  const sign = delta >= 0 ? "+" : "";
  const formatted = Number.isInteger(delta) ? delta.toString() : delta.toFixed(1);
  const suffix = unit && unit !== "" ? ` ${unit}` : "";
  return `${sign}${formatted}${suffix}`;
}

/**
 * Resolves the goalAlignment, with a hard override for openAlerts:
 * any non-zero alert count must be "bad".
 */
function resolveAlignment(
  kpiKey: keyof DashboardKPIBand,
  kpi: DashboardKPI,
): DeltaAlignment {
  if (kpiKey === "openAlerts") {
    return kpi.value > 0 ? "bad" : "good";
  }
  return kpi.goalAlignment;
}

// -----------------------------------------------------------------------------
// KPI display order (intentional — most critical first)
// -----------------------------------------------------------------------------

type KPIEntry = {
  key: keyof DashboardKPIBand;
  kpi: DashboardKPI;
};

function buildEntries(kpis: DashboardKPIBand): KPIEntry[] {
  return [
    { key: "activeClients", kpi: kpis.activeClients },
    { key: "groupAdherence", kpi: kpis.groupAdherence },
    { key: "sessionsThisWeek", kpi: kpis.sessionsThisWeek },
    { key: "routinesEnding14d", kpi: kpis.routinesEnding14d },
    { key: "openAlerts", kpi: kpis.openAlerts },
  ];
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function KPIHeroRow({ kpis, className }: KPIHeroRowProps) {
  const entries = buildEntries(kpis);

  return (
    <section
      aria-label="Indicadores clave del tablero"
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5",
        className,
      )}
    >
      {entries.map(({ key, kpi }, index) => (
        <div
          key={key}
          className="group/kpi rounded-xl transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgba(255,106,26,0.25),0_4px_24px_-4px_rgba(255,106,26,0.12)]"
        >
          <KpiHeroCard
            label={kpi.label}
            value={formatValue(kpi.value)}
            unit={kpi.unit !== "" ? kpi.unit : undefined}
            delta={formatDelta(kpi.delta, kpi.unit)}
            deltaLabel={kpi.deltaLabel ?? undefined}
            sparklineData={kpi.sparklineData}
            goalAlignment={resolveAlignment(key, kpi)}
            index={index}
          />
        </div>
      ))}
    </section>
  );
}
