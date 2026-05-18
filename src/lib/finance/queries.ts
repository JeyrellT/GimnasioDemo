// =============================================================================
// BLACKLINE FITNESS — Finance private query helpers (DEMO STUB)
// Owner: backend-api.
//
// In demo mode, all Prisma queries are replaced with empty stubs.
// Real data comes from src/lib/demo/actions/finance.ts.
// =============================================================================

import type {
  TrainerLocationDTO,
  ExpenseDTO,
  OneOffSaleDTO,
  FinanceLocationCost,
  FinanceTransaction,
} from "@/types/finance";

// ── Locations ─────────────────────────────────────────────────────────────────

export async function queryLocations(
  _trainerUserId: string,
): Promise<TrainerLocationDTO[]> {
  return [];
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function queryExpenses(
  _trainerUserId: string,
  _fromDate: Date,
  _toDate: Date,
): Promise<ExpenseDTO[]> {
  return [];
}

// ── One-off sales ─────────────────────────────────────────────────────────────

export async function queryOneOffSales(
  _trainerUserId: string,
  _fromDate: Date,
  _toDate: Date,
): Promise<OneOffSaleDTO[]> {
  return [];
}

// ── Location costs ────────────────────────────────────────────────────────────

export async function queryLocationCosts(
  _trainerUserId: string,
  _fromDate: Date,
  _toDate: Date,
): Promise<FinanceLocationCost[]> {
  return [];
}

// ── Recent transactions ───────────────────────────────────────────────────────

export async function queryRecentTransactions(
  _trainerUserId: string,
  _fromDate: Date,
  _toDate: Date,
  _limit = 20,
): Promise<FinanceTransaction[]> {
  return [];
}
