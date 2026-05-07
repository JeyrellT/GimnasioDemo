// =============================================================================
// FORJA — Demo actions: finance
// =============================================================================

import { db } from "@/lib/offline/db";
import { ok, tryCatch } from "@/lib/result";
import { NotFoundError } from "@/lib/errors";
import { DEMO_TRAINER_ID } from "../seed-data";
import * as store from "../store";
import type { ActionResult } from "@/types/api";
import type {
  TrainerLocationDTO,
  LocationVisitDTO,
  ExpenseDTO,
  OneOffSaleDTO,
  FinanceFilters,
  FinanceDashboardPayload,
  FinanceKPIs,
} from "@/types/finance";
import type { DemoExpenseRow, DemoSaleRow } from "@/lib/offline/db";

function toIso(d: Date): string { return d.toISOString(); }

// ── LOCATIONS ─────────────────────────────────────────────────────────────────

export async function listLocations(): Promise<ActionResult<TrainerLocationDTO[]>> {
  return tryCatch(async () => {
    const locs = await store.listLocations(DEMO_TRAINER_ID);
    const visits = await store.listLocationVisits(DEMO_TRAINER_ID);

    return locs.map((loc): TrainerLocationDTO => {
      const locVisits = visits.filter((v) => v.locationId === loc.id);
      return {
        id: loc.id,
        name: loc.name,
        address: loc.address,
        kind: loc.kind as TrainerLocationDTO["kind"],
        costModel: loc.costModel as TrainerLocationDTO["costModel"],
        costPerVisitCRC: loc.costPerVisitCRC,
        costPerKmCRC: loc.costPerKmCRC,
        defaultKm: loc.defaultKm,
        monthlyRentCRC: loc.monthlyRentCRC,
        notes: loc.notes,
        visitCount: locVisits.length,
        totalSpentCRC: locVisits.reduce((sum, v) => sum + v.computedCostCRC, 0),
      };
    });
  });
}

export async function createLocation(input: unknown): Promise<ActionResult<{ locationId: string }>> {
  return tryCatch(async () => {
    const data = input as {
      name: string;
      address?: string;
      kind: string;
      costModel: string;
      costPerVisitCRC?: number;
      costPerKmCRC?: number;
      defaultKm?: number;
      monthlyRentCRC?: number;
      notes?: string;
    };

    const id = `loc-${Date.now()}`;
    await db.demoLocations.put({
      id,
      trainerUserId: DEMO_TRAINER_ID,
      name: data.name,
      address: data.address ?? null,
      kind: data.kind as "HOME" | "GYM" | "STUDIO" | "CLIENT_HOME" | "OUTDOOR" | "OTHER",
      costModel: data.costModel as "FLAT" | "PER_KM",
      costPerVisitCRC: data.costPerVisitCRC ?? null,
      costPerKmCRC: data.costPerKmCRC ?? null,
      defaultKm: data.defaultKm ?? null,
      monthlyRentCRC: data.monthlyRentCRC ?? null,
      notes: data.notes ?? null,
    });
    return { locationId: id };
  });
}

export async function updateLocation(input: unknown): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    const { id, ...fields } = input as { id: string; [k: string]: unknown };
    await db.demoLocations.update(id, fields as Record<string, unknown>);
  });
}

export async function deleteLocation(locationId: string): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    await db.demoLocations.delete(locationId);
  });
}

// ── EXPENSES ──────────────────────────────────────────────────────────────────

export async function listExpenses(filters: FinanceFilters): Promise<ActionResult<ExpenseDTO[]>> {
  return tryCatch(async () => {
    const expenses = await store.listExpenses(
      DEMO_TRAINER_ID,
      filters.fromDate.toISOString(),
      filters.toDate.toISOString(),
    );
    const locations = await store.listLocations(DEMO_TRAINER_ID);

    return expenses.map((e): ExpenseDTO => ({
      id: e.id,
      occurredAt: e.occurredAt,
      amountCRC: e.amountCRC,
      category: e.category as ExpenseDTO["category"],
      locationId: e.locationId,
      locationName: e.locationId ? (locations.find((l) => l.id === e.locationId)?.name ?? null) : null,
      description: e.description,
      source: e.source as ExpenseDTO["source"],
    }));
  });
}

export async function createExpense(input: unknown): Promise<ActionResult<{ expenseId: string }>> {
  return tryCatch(async () => {
    const data = input as {
      occurredAt: string | Date;
      amountCRC: number;
      category: string;
      locationId?: string;
      description?: string;
    };

    const id = `exp-${Date.now()}`;
    await db.demoExpenses.put({
      id,
      trainerUserId: DEMO_TRAINER_ID,
      occurredAt: typeof data.occurredAt === "string" ? data.occurredAt : data.occurredAt.toISOString(),
      amountCRC: data.amountCRC,
      category: data.category as DemoExpenseRow["category"],
      locationId: data.locationId ?? null,
      description: data.description ?? null,
      source: "MANUAL",
      visitId: null,
    });
    return { expenseId: id };
  });
}

export async function deleteExpense(expenseId: string): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    await db.demoExpenses.delete(expenseId);
  });
}

// ── ONE-OFF SALES ─────────────────────────────────────────────────────────────

export async function listOneOffSales(filters: FinanceFilters): Promise<ActionResult<OneOffSaleDTO[]>> {
  return tryCatch(async () => {
    const sales = await store.listSales(
      DEMO_TRAINER_ID,
      filters.fromDate.toISOString(),
      filters.toDate.toISOString(),
    );
    const clients = await db.demoClients.toArray();

    return sales.map((s): OneOffSaleDTO => ({
      id: s.id,
      occurredAt: s.occurredAt,
      amountCRC: s.amountCRC,
      category: s.category as OneOffSaleDTO["category"],
      clientUserId: s.clientUserId,
      clientName: s.clientUserId ? (clients.find((c) => c.id === s.clientUserId)?.name ?? null) : null,
      description: s.description,
      paidStatus: s.paidStatus as OneOffSaleDTO["paidStatus"],
    }));
  });
}

export async function createOneOffSale(input: unknown): Promise<ActionResult<{ saleId: string }>> {
  return tryCatch(async () => {
    const data = input as {
      occurredAt: string | Date;
      amountCRC: number;
      category: string;
      clientUserId?: string;
      description?: string;
      paidStatus: string;
    };

    const id = `sale-${Date.now()}`;
    await db.demoSales.put({
      id,
      trainerUserId: DEMO_TRAINER_ID,
      clientUserId: data.clientUserId ?? null,
      occurredAt: typeof data.occurredAt === "string" ? data.occurredAt : data.occurredAt.toISOString(),
      amountCRC: data.amountCRC,
      category: data.category as DemoSaleRow["category"],
      description: data.description ?? null,
      paymentMethod: null,
      paidStatus: data.paidStatus as DemoSaleRow["paidStatus"],
    });
    return { saleId: id };
  });
}

export async function deleteOneOffSale(saleId: string): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    await db.demoSales.delete(saleId);
  });
}

// ── LOCATION VISITS ───────────────────────────────────────────────────────────

export async function createLocationVisit(input: unknown): Promise<ActionResult<{ visitId: string; expenseId?: string }>> {
  return tryCatch(async () => {
    const data = input as {
      locationId: string;
      visitedAt: string | Date;
      kmTraveled?: number;
      notes?: string;
    };

    const loc = await db.demoLocations.get(data.locationId);
    if (!loc) throw new NotFoundError("LOCATION_NOT_FOUND", "Ubicación no encontrada.");

    const computedCostCRC = loc.costPerVisitCRC ?? 0;
    const visitId = `lv-${Date.now()}`;
    const visitedAt = typeof data.visitedAt === "string" ? data.visitedAt : data.visitedAt.toISOString();

    await db.demoLocationVisits.put({
      id: visitId,
      trainerUserId: DEMO_TRAINER_ID,
      locationId: data.locationId,
      visitedAt,
      kmTraveled: data.kmTraveled ?? null,
      computedCostCRC,
      notes: data.notes ?? null,
    });

    let expenseId: string | undefined;
    if (computedCostCRC > 0) {
      expenseId = `exp-visit-${Date.now()}`;
      await db.demoExpenses.put({
        id: expenseId,
        trainerUserId: DEMO_TRAINER_ID,
        occurredAt: visitedAt,
        amountCRC: computedCostCRC,
        category: "TRANSPORTE",
        locationId: data.locationId,
        description: `Visita a ${loc.name}`,
        source: "LOCATION_VISIT",
        visitId,
      });
    }

    return { visitId, ...(expenseId ? { expenseId } : {}) };
  });
}

export async function deleteLocationVisit(visitId: string): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    await db.demoLocationVisits.delete(visitId);
    // Also delete linked expense
    const expenses = await db.demoExpenses.where({ visitId }).toArray();
    for (const exp of expenses) {
      await db.demoExpenses.delete(exp.id);
    }
  });
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

export async function getFinanceDashboard(filters: FinanceFilters): Promise<ActionResult<FinanceDashboardPayload>> {
  return tryCatch(async () => {
    const from = filters.fromDate.toISOString();
    const to = filters.toDate.toISOString();

    const [expenses, sales, locations, visits] = await Promise.all([
      store.listExpenses(DEMO_TRAINER_ID, from, to),
      store.listSales(DEMO_TRAINER_ID, from, to),
      store.listLocations(DEMO_TRAINER_ID),
      store.listLocationVisits(DEMO_TRAINER_ID, from, to),
    ]);

    const paidSales = sales.filter((s) => s.paidStatus === "PAID");
    const ingresosCRC = paidSales.reduce((sum, s) => sum + s.amountCRC, 0);
    const gastosCRC = expenses.reduce((sum, e) => sum + e.amountCRC, 0);
    const utilidadCRC = ingresosCRC - gastosCRC;
    const margenPct = ingresosCRC > 0 ? Math.round((utilidadCRC / ingresosCRC) * 1000) / 10 : null;

    const kpis: FinanceKPIs = {
      ingresosCRC,
      gastosCRC,
      utilidadCRC,
      margenPct,
      ingresosDeltaPct: null,
      gastosDeltaPct: null,
      utilidadDeltaPct: null,
    };

    // Expense breakdown by category
    const categoryMap = new Map<string, number>();
    for (const exp of expenses) {
      categoryMap.set(exp.category, (categoryMap.get(exp.category) ?? 0) + exp.amountCRC);
    }
    const expenseBreakdown = Array.from(categoryMap.entries()).map(([category, amountCRC]) => ({
      category: category as ExpenseDTO["category"],
      amountCRC,
      pct: gastosCRC > 0 ? Math.round((amountCRC / gastosCRC) * 1000) / 10 : 0,
    }));

    // Location costs
    const locationCosts = locations.map((loc) => {
      const locVisits = visits.filter((v) => v.locationId === loc.id);
      const totalCostCRC = locVisits.reduce((sum, v) => sum + v.computedCostCRC, 0);
      return {
        locationId: loc.id,
        locationName: loc.name,
        visitCount: locVisits.length,
        costPerVisitAvg: locVisits.length > 0 ? Math.round(totalCostCRC / locVisits.length) : 0,
        totalCostCRC,
        clientCount: 1, // approximation
      };
    });

    // Recent transactions
    const clients = await db.demoClients.toArray();
    const recentTransactions = [
      ...expenses.map((e) => ({
        id: e.id,
        type: "expense" as const,
        occurredAt: e.occurredAt,
        amountCRC: -e.amountCRC,
        description: e.description ?? e.category,
        category: e.category,
      })),
      ...sales.map((s) => ({
        id: s.id,
        type: "sale" as const,
        occurredAt: s.occurredAt,
        amountCRC: s.amountCRC,
        description: s.description ?? (s.clientUserId ? (clients.find((c) => c.id === s.clientUserId)?.name ?? "Venta") : "Venta"),
        category: s.category,
      })),
    ]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 20);

    const oneOffCRC = paidSales.reduce((sum, s) => sum + s.amountCRC, 0);

    return {
      kpis,
      incomeBreakdown: { recurringCRC: 0, oneOffCRC },
      expenseBreakdown,
      locationCosts,
      recentTransactions,
    };
  });
}
