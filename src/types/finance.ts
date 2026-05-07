// =============================================================================
// FORJA — Finance domain types
// Owner: backend-api.
// All monetary amounts are number (CRC). Dates are ISO 8601 strings.
// =============================================================================

import type {
  LocationKind,
  LocationCostModel,
  ExpenseCategory,
  ExpenseSource,
  IncomeCategory,
  OneOffPaidStatus,
} from "@prisma/client";

export type {
  LocationKind,
  LocationCostModel,
  ExpenseCategory,
  ExpenseSource,
  IncomeCategory,
  OneOffPaidStatus,
};

// ── Filters ───────────────────────────────────────────────────────────────────

export interface FinanceFilters {
  fromDate: Date;
  toDate: Date;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface TrainerLocationDTO {
  id: string;
  name: string;
  address: string | null;
  kind: LocationKind;
  costModel: LocationCostModel;
  costPerVisitCRC: number | null;
  costPerKmCRC: number | null;
  defaultKm: number | null;
  monthlyRentCRC: number | null;
  notes: string | null;
  /** Computed: total non-deleted visits for this location. */
  visitCount: number;
  /** Computed: sum of computedCostCRC across non-deleted visits. */
  totalSpentCRC: number;
}

export interface LocationVisitDTO {
  id: string;
  locationId: string;
  locationName: string;
  visitedAt: string; // ISO
  kmTraveled: number | null;
  computedCostCRC: number;
  notes: string | null;
}

export interface ExpenseDTO {
  id: string;
  occurredAt: string; // ISO
  amountCRC: number;
  category: ExpenseCategory;
  locationId: string | null;
  locationName: string | null;
  description: string | null;
  source: ExpenseSource;
}

export interface OneOffSaleDTO {
  id: string;
  occurredAt: string; // ISO
  amountCRC: number;
  category: IncomeCategory;
  clientUserId: string | null;
  clientName: string | null;
  description: string | null;
  paidStatus: OneOffPaidStatus;
}

// ── KPIs & aggregates ─────────────────────────────────────────────────────────

export interface FinanceKPIs {
  /** Sum of ClientCharge.PAID + OneOffSale.PAID in window. */
  ingresosCRC: number;
  /** Sum of TrainerExpense in window. */
  gastosCRC: number;
  /** ingresos - gastos */
  utilidadCRC: number;
  /** utilidad / ingresos × 100 (null when ingresos = 0). */
  margenPct: number | null;
  // Deltas vs the prior comparable window (null when no prior data).
  ingresosDeltaPct: number | null;
  gastosDeltaPct: number | null;
  utilidadDeltaPct: number | null;
}

export interface FinanceIncomeBreakdown {
  /** Sum of ClientCharge.PAID amounts. */
  recurringCRC: number;
  /** Sum of OneOffSale.PAID amounts. */
  oneOffCRC: number;
}

export interface FinanceExpenseBreakdown {
  category: ExpenseCategory;
  amountCRC: number;
  /** 0-100, rounded to 1 decimal. */
  pct: number;
}

export interface FinanceLocationCost {
  locationId: string;
  locationName: string;
  visitCount: number;
  /** Average computed cost per visit across the window. */
  costPerVisitAvg: number;
  totalCostCRC: number;
  /** Distinct active clients served at this location (approximated from visits). */
  clientCount: number;
}

export interface FinanceTransaction {
  id: string;
  type: "expense" | "sale" | "visit" | "client_charge";
  occurredAt: string; // ISO
  amountCRC: number;
  description: string;
  category: string; // ExpenseCategory | IncomeCategory | "MENSUALIDAD"
}

export interface FinanceDashboardPayload {
  kpis: FinanceKPIs;
  incomeBreakdown: FinanceIncomeBreakdown;
  expenseBreakdown: FinanceExpenseBreakdown[];
  locationCosts: FinanceLocationCost[];
  recentTransactions: FinanceTransaction[];
}
