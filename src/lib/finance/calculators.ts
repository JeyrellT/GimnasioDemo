// =============================================================================
// BLACKLINE FITNESS — Finance KPI and cost calculators
// Owner: backend-api.
// Pure functions — no I/O, no Prisma imports.
// =============================================================================

import type { Prisma } from "@prisma/client";
import type {
  FinanceKPIs,
  FinanceExpenseBreakdown,
  ExpenseCategory,
} from "@/types/finance";

// ── Decimal utility ───────────────────────────────────────────────────────────

/**
 * Convert a Prisma Decimal (or null/undefined) to a plain JS number.
 * Returns 0 when the value is absent.
 */
export function toNum(d: Prisma.Decimal | null | undefined): number {
  if (d == null) return 0;
  return Number(d.toString());
}

// ── Visit cost computation ────────────────────────────────────────────────────

export interface LocationCostParams {
  costModel: "FLAT" | "PER_KM" | "HYBRID";
  costPerVisitCRC: Prisma.Decimal | null;
  costPerKmCRC: Prisma.Decimal | null;
  defaultKm: Prisma.Decimal | null;
}

/**
 * Compute the cost of a single visit, freezing it at insert time.
 *
 * FLAT: costPerVisitCRC (required for FLAT locations — validated at location creation)
 * PER_KM: costPerKmCRC * kmTraveled (falls back to defaultKm when kmTraveled is absent)
 * HYBRID: not implemented in MVP; treated as FLAT.
 */
export function computeVisitCost(
  params: LocationCostParams,
  kmTraveled?: number | null,
): number {
  const { costModel } = params;

  if (costModel === "PER_KM") {
    const rate = toNum(params.costPerKmCRC);
    const km = kmTraveled ?? toNum(params.defaultKm);
    return Math.round(rate * km * 100) / 100;
  }

  // FLAT and HYBRID both use costPerVisitCRC for now.
  return toNum(params.costPerVisitCRC);
}

// ── KPI computation ───────────────────────────────────────────────────────────

export interface KPIInputs {
  ingresosCRC: number;
  gastosCRC: number;
  prevIngresosCRC: number | null;
  prevGastosCRC: number | null;
}

/**
 * Compute KPI deltas as percentages.
 * Returns null for a delta when there is no previous-period data.
 */
export function computeKPIs(inputs: KPIInputs): FinanceKPIs {
  const { ingresosCRC, gastosCRC, prevIngresosCRC, prevGastosCRC } = inputs;
  const utilidadCRC = ingresosCRC - gastosCRC;
  const margenPct = ingresosCRC > 0
    ? Math.round((utilidadCRC / ingresosCRC) * 10000) / 100
    : null;

  const prevUtilidadCRC =
    prevIngresosCRC !== null && prevGastosCRC !== null
      ? prevIngresosCRC - prevGastosCRC
      : null;

  const pctDelta = (current: number, prev: number | null): number | null => {
    if (prev === null) return null;
    if (prev === 0) return current === 0 ? 0 : null; // avoid Infinity
    return Math.round(((current - prev) / prev) * 10000) / 100;
  };

  return {
    ingresosCRC,
    gastosCRC,
    utilidadCRC,
    margenPct,
    ingresosDeltaPct: pctDelta(ingresosCRC, prevIngresosCRC),
    gastosDeltaPct: pctDelta(gastosCRC, prevGastosCRC),
    utilidadDeltaPct: pctDelta(utilidadCRC, prevUtilidadCRC),
  };
}

// ── Expense breakdown ─────────────────────────────────────────────────────────

export interface ExpenseGroupRow {
  category: ExpenseCategory;
  _sum: { amountCRC: Prisma.Decimal | null };
}

/**
 * Convert raw groupBy rows into a sorted breakdown with percentage.
 * Sorted descending by amount.
 */
export function buildExpenseBreakdown(
  rows: ExpenseGroupRow[],
  totalGastosCRC: number,
): FinanceExpenseBreakdown[] {
  return rows
    .map((r) => {
      const amountCRC = toNum(r._sum.amountCRC);
      const pct =
        totalGastosCRC > 0
          ? Math.round((amountCRC / totalGastosCRC) * 1000) / 10
          : 0;
      return { category: r.category, amountCRC, pct };
    })
    .sort((a, b) => b.amountCRC - a.amountCRC);
}

// ── Previous period window ────────────────────────────────────────────────────

export interface PreviousPeriod {
  prevFrom: Date;
  prevTo: Date;
}

/**
 * Compute the previous comparable date window.
 * Shifts the current window back by exactly its own duration.
 */
export function previousPeriod(fromDate: Date, toDate: Date): PreviousPeriod {
  const windowMs = toDate.getTime() - fromDate.getTime();
  // Add 1ms to ensure non-overlapping with the current window.
  const prevTo = new Date(fromDate.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - windowMs);
  return { prevFrom, prevTo };
}
