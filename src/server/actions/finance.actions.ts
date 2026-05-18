"use server";
// =============================================================================
// VIZION — Finance server actions
// Owner: backend-api.
//
// Covers: trainer locations, location visits (with auto-expense), expenses,
// one-off sales, and the monthly finance summary.
//
// All monetary amounts are stored as Prisma Decimal and returned as plain
// numbers (CRC, no sub-unit). AuditLog is written for every mutation.
// =============================================================================

import { prisma, Prisma } from "@/server/db";
import { requireTrainer } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { logInfo, logError } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import type {
  LocationKind,
  LocationCostModel,
  ExpenseCategory,
  ExpenseSource,
  IncomeCategory,
  OneOffPaidStatus,
} from "@prisma/client";

// =============================================================================
// Helper types
// =============================================================================

export interface LocationItem {
  id: string;
  trainerUserId: string;
  name: string;
  address: string | null;
  kind: LocationKind;
  costModel: LocationCostModel;
  costPerVisitCRC: number | null;
  costPerKmCRC: number | null;
  defaultKm: number | null;
  monthlyRentCRC: number | null;
  notes: string | null;
  createdAt: Date;
}

export interface VisitItem {
  id: string;
  locationId: string;
  locationName: string;
  visitedAt: Date;
  kmTraveled: number | null;
  computedCostCRC: number;
  notes: string | null;
}

export interface ExpenseItem {
  id: string;
  occurredAt: Date;
  amountCRC: number;
  category: ExpenseCategory;
  locationId: string | null;
  locationName: string | null;
  description: string | null;
  source: ExpenseSource;
  visitId: string | null;
  createdAt: Date;
}

export interface SaleItem {
  id: string;
  occurredAt: Date;
  amountCRC: number;
  category: IncomeCategory;
  description: string | null;
  paymentMethod: string | null;
  paidStatus: OneOffPaidStatus;
  paidAt: Date | null;
  clientId: string | null;
  clientName: string | null;
  createdAt: Date;
}

export interface FinanceSummary {
  month: string; // "YYYY-MM"
  totalIncomeCRC: number;
  totalExpensesCRC: number;
  netCRC: number;
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  chargesIncome: number;
  oneOffIncome: number;
  chargesCount: number;
  salesCount: number;
  expensesCount: number;
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Extract a positive decimal number from a FormData field.
 * Returns the number, or null if the field is absent/invalid.
 */
function parsePositiveDecimal(formData: FormData, field: string): number | null {
  const raw = formData.get(field)?.toString().trim();
  if (!raw) return null;
  const n = parseFloat(raw);
  return isNaN(n) || n <= 0 ? null : n;
}

async function writeAuditLog(
  actorUserId: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        action: "UPDATE",
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    logError(e, { fn: "finance.writeAuditLog", entityType, entityId });
  }
}

// =============================================================================
// Typed input interfaces
// =============================================================================

export interface CreateLocationInput {
  name: string;
  kind: LocationKind;
  address?: string;
  costModel?: LocationCostModel;
  costPerVisitCRC?: number | null;
  costPerKmCRC?: number | null;
  defaultKm?: number | null;
  monthlyRentCRC?: number | null;
  notes?: string | null;
}

export interface UpdateLocationInput {
  id: string;
  name?: string;
  kind?: LocationKind;
  address?: string | null;
  costModel?: LocationCostModel;
  costPerVisitCRC?: number | null;
  costPerKmCRC?: number | null;
  defaultKm?: number | null;
  monthlyRentCRC?: number | null;
  notes?: string | null;
}

export interface RecordVisitInput {
  locationId: string;
  visitedAt?: string;
  kmTraveled?: number;
  notes?: string;
}

export interface CreateExpenseInput {
  occurredAt?: string;
  amountCRC: number;
  category: ExpenseCategory;
  locationId?: string;
  description?: string;
}

export interface CreateOneOffSaleInput {
  occurredAt?: string;
  amountCRC: number;
  category: IncomeCategory;
  paidStatus?: OneOffPaidStatus;
  clientUserId?: string;
  description?: string;
  paymentMethod?: string;
}

export interface ListExpensesInput {
  category?: string;
  from?: string;
  to?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface ListOneOffSalesInput {
  category?: string;
  from?: string;
  to?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface GetFinanceSummaryInput {
  fromDate?: Date;
  toDate?: Date;
  month?: string;
}

// =============================================================================
// LOCATIONS
// =============================================================================

export async function listLocations(): Promise<
  ActionResult<{ locations: LocationItem[] }>
> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const rows = await prisma.trainerLocation.findMany({
      where: { trainerUserId: trainer.id },
      orderBy: { name: "asc" },
    });

    return {
      locations: rows.map((r) => ({
        id: r.id,
        trainerUserId: r.trainerUserId,
        name: r.name,
        address: r.address,
        kind: r.kind,
        costModel: r.costModel,
        costPerVisitCRC: r.costPerVisitCRC ? Number(r.costPerVisitCRC) : null,
        costPerKmCRC: r.costPerKmCRC ? Number(r.costPerKmCRC) : null,
        defaultKm: r.defaultKm ? Number(r.defaultKm) : null,
        monthlyRentCRC: r.monthlyRentCRC ? Number(r.monthlyRentCRC) : null,
        notes: r.notes,
        createdAt: r.createdAt,
      })),
    };
  });
}

export async function createLocation(
  input: CreateLocationInput,
): Promise<ActionResult<{ locationId: string }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    if (!input.name?.trim()) {
      throw new ValidationError(
        "MISSING_NAME",
        "El nombre del lugar es requerido.",
      );
    }

    const validKinds: LocationKind[] = [
      "HOME",
      "GYM",
      "STUDIO",
      "CLIENT_HOME",
      "OUTDOOR",
      "OTHER",
    ];
    if (!validKinds.includes(input.kind)) {
      throw new ValidationError(
        "INVALID_KIND",
        "Tipo de lugar inválido.",
      );
    }

    const validModels: LocationCostModel[] = ["FLAT", "PER_KM", "HYBRID"];
    const costModel: LocationCostModel = input.costModel && validModels.includes(input.costModel)
      ? input.costModel
      : "FLAT";

    const location = await prisma.trainerLocation.create({
      data: {
        trainerUserId: trainer.id,
        name: input.name.trim(),
        address: input.address?.trim() || null,
        kind: input.kind,
        costModel,
        costPerVisitCRC: input.costPerVisitCRC ?? null,
        costPerKmCRC: input.costPerKmCRC ?? null,
        defaultKm: input.defaultKm ?? null,
        monthlyRentCRC: input.monthlyRentCRC ?? null,
        notes: input.notes?.trim() || null,
      },
      select: { id: true },
    });

    await writeAuditLog(trainer.id, "TrainerLocation", location.id, {
      action: "CREATE",
    });

    logInfo("Location created", {
      trainerId: trainer.id,
      locationId: location.id,
    });

    return { locationId: location.id };
  });
}

export async function updateLocation(
  input: UpdateLocationInput,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();
    const id = input.id;

    const location = await prisma.trainerLocation.findUnique({
      where: { id },
      select: { id: true, trainerUserId: true },
    });

    if (!location) {
      throw new NotFoundError("LOCATION_NOT_FOUND", "Lugar no encontrado.");
    }

    if (location.trainerUserId !== trainer.id) {
      throw new ForbiddenError(
        "LOCATION_NOT_OWNED",
        "No tenés permiso para editar este lugar.",
      );
    }

    const validModels: LocationCostModel[] = ["FLAT", "PER_KM", "HYBRID"];

    await prisma.trainerLocation.update({
      where: { id },
      data: {
        ...(input.name?.trim() ? { name: input.name.trim() } : {}),
        ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
        ...(input.costModel && validModels.includes(input.costModel) ? { costModel: input.costModel } : {}),
        ...(input.costPerVisitCRC !== undefined ? { costPerVisitCRC: input.costPerVisitCRC } : {}),
        ...(input.costPerKmCRC !== undefined ? { costPerKmCRC: input.costPerKmCRC } : {}),
        ...(input.defaultKm !== undefined ? { defaultKm: input.defaultKm } : {}),
        ...(input.monthlyRentCRC !== undefined ? { monthlyRentCRC: input.monthlyRentCRC } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      },
    });

    await writeAuditLog(trainer.id, "TrainerLocation", id, {
      action: "UPDATE",
    });

    return { updated: true };
  });
}

export async function deleteLocation(
  id: string,
): Promise<ActionResult<{ deleted: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const location = await prisma.trainerLocation.findUnique({
      where: { id },
      select: { id: true, trainerUserId: true },
    });

    if (!location) {
      throw new NotFoundError("LOCATION_NOT_FOUND", "Lugar no encontrado.");
    }

    if (location.trainerUserId !== trainer.id) {
      throw new ForbiddenError(
        "LOCATION_NOT_OWNED",
        "No tenés permiso para eliminar este lugar.",
      );
    }

    await prisma.trainerLocation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAuditLog(trainer.id, "TrainerLocation", id, {
      action: "DELETE",
    });

    logInfo("Location deleted", { trainerId: trainer.id, locationId: id });

    return { deleted: true };
  });
}

// =============================================================================
// VISITS
// =============================================================================

export async function recordVisit(
  input: RecordVisitInput,
): Promise<ActionResult<{ visitId: string; costCRC: number }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    if (!input.locationId?.trim()) {
      throw new ValidationError(
        "MISSING_LOCATION",
        "El lugar de visita es requerido.",
      );
    }

    const location = await prisma.trainerLocation.findUnique({
      where: { id: input.locationId.trim() },
      select: {
        id: true,
        trainerUserId: true,
        costModel: true,
        costPerVisitCRC: true,
        costPerKmCRC: true,
        defaultKm: true,
        name: true,
      },
    });

    if (!location) {
      throw new NotFoundError("LOCATION_NOT_FOUND", "Lugar no encontrado.");
    }

    if (location.trainerUserId !== trainer.id) {
      throw new ForbiddenError(
        "LOCATION_NOT_OWNED",
        "No tenés acceso a este lugar.",
      );
    }

    const visitedAt =
      input.visitedAt && input.visitedAt.trim()
        ? new Date(input.visitedAt)
        : new Date();

    if (isNaN(visitedAt.getTime())) {
      throw new ValidationError(
        "INVALID_DATE",
        "La fecha de visita no es válida.",
      );
    }

    const kmTraveled = input.kmTraveled !== undefined && input.kmTraveled >= 0 ? input.kmTraveled : null;
    const notesStr = input.notes?.trim() || null;

    // Compute cost based on the location's cost model
    let computedCostCRC = 0;

    if (location.costModel === "FLAT") {
      computedCostCRC = location.costPerVisitCRC
        ? Number(location.costPerVisitCRC)
        : 0;
    } else if (location.costModel === "PER_KM") {
      const km = kmTraveled ?? (location.defaultKm ? Number(location.defaultKm) : 0);
      const perKm = location.costPerKmCRC ? Number(location.costPerKmCRC) : 0;
      computedCostCRC = km * perKm;
    } else {
      // HYBRID: base flat + per-km component
      const base = location.costPerVisitCRC
        ? Number(location.costPerVisitCRC)
        : 0;
      const km =
        kmTraveled ?? (location.defaultKm ? Number(location.defaultKm) : 0);
      const perKm = location.costPerKmCRC ? Number(location.costPerKmCRC) : 0;
      computedCostCRC = base + km * perKm;
    }

    // Create visit + auto-expense in a transaction
    const [visit] = await prisma.$transaction(async (tx) => {
      const v = await tx.locationVisit.create({
        data: {
          trainerUserId: trainer.id,
          locationId: location.id,
          visitedAt,
          kmTraveled: kmTraveled ?? undefined,
          computedCostCRC,
          notes: notesStr,
        },
        select: { id: true },
      });

      // Auto-create a TrainerExpense linked to this visit
      await tx.trainerExpense.create({
        data: {
          trainerUserId: trainer.id,
          occurredAt: visitedAt,
          amountCRC: computedCostCRC,
          category: "TRANSPORTE",
          locationId: location.id,
          description: `Visita: ${location.name}`,
          source: "LOCATION_VISIT",
          visitId: v.id,
        },
      });

      return [v];
    });

    await writeAuditLog(trainer.id, "LocationVisit", visit.id, {
      action: "CREATE",
      locationId: location.id,
      costCRC: computedCostCRC,
    });

    logInfo("Visit recorded", {
      trainerId: trainer.id,
      visitId: visit.id,
      computedCostCRC,
    });

    return { visitId: visit.id, costCRC: computedCostCRC };
  });
}

export async function listVisits(filters?: {
  locationId?: string;
  from?: string;
  to?: string;
}): Promise<ActionResult<{ visits: VisitItem[] }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    type VisitWhereClause = {
      trainerUserId: string;
      locationId?: string;
      visitedAt?: { gte?: Date; lte?: Date };
    };

    const where: VisitWhereClause = { trainerUserId: trainer.id };

    if (filters?.locationId) where.locationId = filters.locationId;

    if (filters?.from || filters?.to) {
      where.visitedAt = {};
      if (filters.from) where.visitedAt.gte = new Date(filters.from);
      if (filters.to) where.visitedAt.lte = new Date(filters.to);
    }

    const rows = await prisma.locationVisit.findMany({
      where,
      orderBy: { visitedAt: "desc" },
      include: {
        location: { select: { name: true } },
      },
      take: 200,
    });

    return {
      visits: rows.map((r) => ({
        id: r.id,
        locationId: r.locationId,
        locationName: r.location.name,
        visitedAt: r.visitedAt,
        kmTraveled: r.kmTraveled ? Number(r.kmTraveled) : null,
        computedCostCRC: Number(r.computedCostCRC),
        notes: r.notes,
      })),
    };
  });
}

// =============================================================================
// EXPENSES
// =============================================================================

export async function createExpense(
  input: CreateExpenseInput,
): Promise<ActionResult<{ expenseId: string }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    if (!input.amountCRC || input.amountCRC <= 0) {
      throw new ValidationError("INVALID_AMOUNT", "El monto debe ser un número positivo.");
    }
    const amountCRC = input.amountCRC;

    const occurredAt = input.occurredAt?.trim()
      ? new Date(input.occurredAt)
      : new Date();

    if (isNaN(occurredAt.getTime())) {
      throw new ValidationError("INVALID_DATE", "La fecha no es válida.");
    }

    const rawCategory = input.category;
    const validCategories: ExpenseCategory[] = [
      "TRANSPORTE",
      "ALQUILER_ESPACIO",
      "EQUIPO",
      "MARKETING",
      "EDUCACION",
      "SOFTWARE",
      "COMIDAS",
      "IMPUESTOS",
      "SERVICIOS_PROFESIONALES",
      "OTROS",
    ];

    if (!validCategories.includes(rawCategory)) {
      throw new ValidationError(
        "INVALID_CATEGORY",
        "Categoría de gasto inválida.",
      );
    }

    const locationId = input.locationId?.trim() || null;

    // Validate location belongs to trainer if provided
    if (locationId) {
      const loc = await prisma.trainerLocation.findUnique({
        where: { id: locationId },
        select: { trainerUserId: true },
      });
      if (!loc || loc.trainerUserId !== trainer.id) {
        throw new ForbiddenError(
          "LOCATION_NOT_OWNED",
          "No tenés acceso a ese lugar.",
        );
      }
    }

    const expense = await prisma.trainerExpense.create({
      data: {
        trainerUserId: trainer.id,
        occurredAt,
        amountCRC,
        category: rawCategory,
        locationId,
        description: input.description?.trim() || null,
        source: "MANUAL",
      },
      select: { id: true },
    });

    await writeAuditLog(trainer.id, "TrainerExpense", expense.id, {
      action: "CREATE",
      amountCRC,
      category: rawCategory,
    });

    logInfo("Expense created", {
      trainerId: trainer.id,
      expenseId: expense.id,
    });

    return { expenseId: expense.id };
  });
}

export async function updateExpense(
  id: string,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const expense = await prisma.trainerExpense.findUnique({
      where: { id },
      select: { id: true, trainerUserId: true, source: true },
    });

    if (!expense) {
      throw new NotFoundError("EXPENSE_NOT_FOUND", "Gasto no encontrado.");
    }

    if (expense.trainerUserId !== trainer.id) {
      throw new ForbiddenError(
        "EXPENSE_NOT_OWNED",
        "No tenés permiso para editar este gasto.",
      );
    }

    // Auto-generated expenses (from visits or rent) should not be manually edited
    if (expense.source !== "MANUAL") {
      throw new ValidationError(
        "EXPENSE_NOT_MANUAL",
        "Los gastos generados automáticamente no se pueden editar directamente.",
      );
    }

    const amountCRC = parsePositiveDecimal(formData, "amountCRC");
    const description = formData.get("description");
    const rawOccurredAt = formData.get("occurredAt");

    await prisma.trainerExpense.update({
      where: { id },
      data: {
        ...(amountCRC !== null ? { amountCRC } : {}),
        ...(typeof description === "string"
          ? { description: description.trim() || null }
          : {}),
        ...(typeof rawOccurredAt === "string" && rawOccurredAt.trim()
          ? { occurredAt: new Date(rawOccurredAt) }
          : {}),
      },
    });

    await writeAuditLog(trainer.id, "TrainerExpense", id, {
      action: "UPDATE",
    });

    return { updated: true };
  });
}

export async function deleteExpense(
  id: string,
): Promise<ActionResult<{ deleted: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const expense = await prisma.trainerExpense.findUnique({
      where: { id },
      select: { id: true, trainerUserId: true },
    });

    if (!expense) {
      throw new NotFoundError("EXPENSE_NOT_FOUND", "Gasto no encontrado.");
    }

    if (expense.trainerUserId !== trainer.id) {
      throw new ForbiddenError(
        "EXPENSE_NOT_OWNED",
        "No tenés permiso para eliminar este gasto.",
      );
    }

    await prisma.trainerExpense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAuditLog(trainer.id, "TrainerExpense", id, {
      action: "DELETE",
    });

    return { deleted: true };
  });
}

export async function listExpenses(filters?: ListExpensesInput): Promise<ActionResult<{ expenses: ExpenseItem[]; total: number }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    type ExpenseWhereClause = {
      trainerUserId: string;
      category?: ExpenseCategory;
      occurredAt?: { gte?: Date; lte?: Date };
    };

    const where: ExpenseWhereClause = { trainerUserId: trainer.id };

    const validCategories: ExpenseCategory[] = [
      "TRANSPORTE",
      "ALQUILER_ESPACIO",
      "EQUIPO",
      "MARKETING",
      "EDUCACION",
      "SOFTWARE",
      "COMIDAS",
      "IMPUESTOS",
      "SERVICIOS_PROFESIONALES",
      "OTROS",
    ];

    if (filters?.category && validCategories.includes(filters.category as ExpenseCategory)) {
      where.category = filters.category as ExpenseCategory;
    }

    // Support both {from, to} string ISO and {fromDate, toDate} Date objects
    const fromDate = filters?.fromDate ?? (filters?.from ? new Date(filters.from) : undefined);
    const toDate = filters?.toDate ?? (filters?.to ? new Date(filters.to) : undefined);

    if (fromDate || toDate) {
      where.occurredAt = {};
      if (fromDate) where.occurredAt.gte = fromDate;
      if (toDate) where.occurredAt.lte = toDate;
    }

    const [rows, total] = await prisma.$transaction([
      prisma.trainerExpense.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        include: {
          location: { select: { name: true } },
        },
        take: 200,
      }),
      prisma.trainerExpense.count({ where }),
    ]);

    return {
      expenses: rows.map((r) => ({
        id: r.id,
        occurredAt: r.occurredAt,
        amountCRC: Number(r.amountCRC),
        category: r.category,
        locationId: r.locationId,
        locationName: r.location?.name ?? null,
        description: r.description,
        source: r.source,
        visitId: r.visitId,
        createdAt: r.createdAt,
      })),
      total,
    };
  });
}

// =============================================================================
// ONE-OFF SALES
// =============================================================================

export async function createOneOffSale(
  input: CreateOneOffSaleInput,
): Promise<ActionResult<{ saleId: string }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    if (!input.amountCRC || input.amountCRC <= 0) {
      throw new ValidationError("INVALID_AMOUNT", "El monto debe ser un número positivo.");
    }
    const amountCRC = input.amountCRC;

    const occurredAt = input.occurredAt?.trim()
      ? new Date(input.occurredAt)
      : new Date();

    if (isNaN(occurredAt.getTime())) {
      throw new ValidationError("INVALID_DATE", "La fecha no es válida.");
    }

    const rawCategory = input.category;
    const validCategories: IncomeCategory[] = [
      "SESION_PT",
      "EVALUACION_INICIAL",
      "PLAN_NUTRICIONAL",
      "CLASE_GRUPAL",
      "ASESORIA_ONLINE",
      "PRODUCTO",
      "OTROS",
    ];

    if (!validCategories.includes(rawCategory)) {
      throw new ValidationError(
        "INVALID_CATEGORY",
        "Categoría de venta inválida.",
      );
    }

    const validPaidStatuses: OneOffPaidStatus[] = ["PAID", "PENDING", "CANCELLED"];
    const paidStatus: OneOffPaidStatus = input.paidStatus && validPaidStatuses.includes(input.paidStatus)
      ? input.paidStatus
      : "PAID";

    const clientId = input.clientUserId?.trim() || null;

    const sale = await prisma.oneOffSale.create({
      data: {
        trainerUserId: trainer.id,
        clientUserId: clientId,
        occurredAt,
        amountCRC,
        category: rawCategory,
        description: input.description?.trim() || null,
        paymentMethod: input.paymentMethod?.trim() || null,
        paidStatus,
        paidAt: paidStatus === "PAID" ? occurredAt : null,
      },
      select: { id: true },
    });

    await writeAuditLog(trainer.id, "OneOffSale", sale.id, {
      action: "CREATE",
      amountCRC,
      category: rawCategory,
    });

    logInfo("One-off sale created", {
      trainerId: trainer.id,
      saleId: sale.id,
    });

    return { saleId: sale.id };
  });
}

export async function listOneOffSales(filters?: ListOneOffSalesInput): Promise<ActionResult<{ sales: SaleItem[]; total: number }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    type SaleWhereClause = {
      trainerUserId: string;
      category?: IncomeCategory;
      occurredAt?: { gte?: Date; lte?: Date };
    };

    const where: SaleWhereClause = { trainerUserId: trainer.id };

    const validCategories: IncomeCategory[] = [
      "SESION_PT",
      "EVALUACION_INICIAL",
      "PLAN_NUTRICIONAL",
      "CLASE_GRUPAL",
      "ASESORIA_ONLINE",
      "PRODUCTO",
      "OTROS",
    ];

    if (filters?.category && validCategories.includes(filters.category as IncomeCategory)) {
      where.category = filters.category as IncomeCategory;
    }

    // Support both {from, to} string ISO and {fromDate, toDate} Date objects
    const fromDate = filters?.fromDate ?? (filters?.from ? new Date(filters.from) : undefined);
    const toDate = filters?.toDate ?? (filters?.to ? new Date(filters.to) : undefined);

    if (fromDate || toDate) {
      where.occurredAt = {};
      if (fromDate) where.occurredAt.gte = fromDate;
      if (toDate) where.occurredAt.lte = toDate;
    }

    const [rows, total] = await prisma.$transaction([
      prisma.oneOffSale.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        include: {
          client: { select: { name: true } },
        },
        take: 200,
      }),
      prisma.oneOffSale.count({ where }),
    ]);

    return {
      sales: rows.map((r) => ({
        id: r.id,
        occurredAt: r.occurredAt,
        amountCRC: Number(r.amountCRC),
        category: r.category,
        description: r.description,
        paymentMethod: r.paymentMethod,
        paidStatus: r.paidStatus,
        paidAt: r.paidAt,
        clientId: r.clientUserId,
        clientName: r.client?.name ?? null,
        createdAt: r.createdAt,
      })),
      total,
    };
  });
}

// =============================================================================
// FINANCE SUMMARY
// Aggregates income (PAID charges + PAID one-off) and expenses for a given month.
// =============================================================================

export async function getFinanceSummary(
  month: string, // "YYYY-MM"
): Promise<ActionResult<FinanceSummary>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const parts = month.split("-");
    if (parts.length !== 2) {
      throw new ValidationError(
        "INVALID_MONTH",
        "El mes debe tener formato YYYY-MM.",
      );
    }

    const year = Number(parts[0]);
    const monthNum = Number(parts[1]);

    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new ValidationError("INVALID_MONTH", "Mes inválido.");
    }

    const from = new Date(year, monthNum - 1, 1);
    const to = new Date(year, monthNum, 1);

    // Fetch PAID charges for this period
    const charges = await prisma.clientCharge.findMany({
      where: {
        trainerUserId: trainer.id,
        status: "PAID",
        periodStart: { gte: from, lt: to },
      },
      select: { amountCRC: true },
    });

    const chargesIncome = charges.reduce(
      (acc, c) => acc + Number(c.amountCRC),
      0,
    );

    // Fetch PAID one-off sales
    const sales = await prisma.oneOffSale.findMany({
      where: {
        trainerUserId: trainer.id,
        paidStatus: "PAID",
        occurredAt: { gte: from, lt: to },
      },
      select: { amountCRC: true, category: true },
    });

    const oneOffIncome = sales.reduce(
      (acc, s) => acc + Number(s.amountCRC),
      0,
    );

    // Income by category (one-off only; charges are bulk-summed separately)
    const incomeByCategory: Record<string, number> = {};
    for (const s of sales) {
      incomeByCategory[s.category] =
        (incomeByCategory[s.category] ?? 0) + Number(s.amountCRC);
    }

    // Fetch expenses
    const expenses = await prisma.trainerExpense.findMany({
      where: {
        trainerUserId: trainer.id,
        occurredAt: { gte: from, lt: to },
      },
      select: { amountCRC: true, category: true },
    });

    const totalExpensesCRC = expenses.reduce(
      (acc, e) => acc + Number(e.amountCRC),
      0,
    );

    const expenseByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expenseByCategory[e.category] =
        (expenseByCategory[e.category] ?? 0) + Number(e.amountCRC);
    }

    const totalIncomeCRC = chargesIncome + oneOffIncome;
    const netCRC = totalIncomeCRC - totalExpensesCRC;

    return {
      month,
      totalIncomeCRC,
      totalExpensesCRC,
      netCRC,
      incomeByCategory,
      expenseByCategory,
      chargesIncome,
      oneOffIncome,
      chargesCount: charges.length,
      salesCount: sales.length,
      expensesCount: expenses.length,
    };
  });
}

// =============================================================================
// deleteOneOffSale
// Soft-deletes a one-off sale. Only the creator can delete.
// =============================================================================

export async function deleteOneOffSale(
  id: string,
): Promise<ActionResult<{ deleted: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const sale = await prisma.oneOffSale.findUnique({
      where: { id },
      select: { id: true, trainerUserId: true },
    });

    if (!sale) {
      throw new NotFoundError("SALE_NOT_FOUND", "Venta no encontrada.");
    }
    if (sale.trainerUserId !== trainer.id) {
      throw new ForbiddenError("SALE_NOT_OWNED", "Esta venta no te pertenece.");
    }

    await prisma.oneOffSale.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logInfo("finance.deleteOneOffSale", { userId: trainer.id, saleId: id });

    return { deleted: true as const };
  });
}

// =============================================================================
// deleteLocationVisit
// Soft-deletes a location visit. Only the visit owner can delete.
// =============================================================================

export async function deleteLocationVisit(
  id: string,
): Promise<ActionResult<{ deleted: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const visit = await prisma.locationVisit.findUnique({
      where: { id },
      select: { id: true, trainerUserId: true },
    });

    if (!visit) {
      throw new NotFoundError("VISIT_NOT_FOUND", "Visita no encontrada.");
    }
    if (visit.trainerUserId !== trainer.id) {
      throw new ForbiddenError("VISIT_NOT_OWNED", "Esta visita no te pertenece.");
    }

    await prisma.locationVisit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logInfo("finance.deleteLocationVisit", { userId: trainer.id, visitId: id });

    return { deleted: true as const };
  });
}

// -----------------------------------------------------------------------------
// Aliases — match the names the proxy layer (src/app/actions/) expects
// -----------------------------------------------------------------------------

/** @alias recordVisit — proxy expects `createLocationVisit`. */
export async function createLocationVisit(...args: Parameters<typeof recordVisit>) {
  return recordVisit(...args);
}

/** @alias getFinanceSummary — proxy expects `getFinanceDashboard`.
 * Accepts either a "YYYY-MM" month string or a { fromDate, toDate } object.
 */
export async function getFinanceDashboard(
  input: string | GetFinanceSummaryInput,
): Promise<ActionResult<FinanceSummary>> {
  if (typeof input === "string") {
    return getFinanceSummary(input);
  }
  // Derive month string from fromDate if provided
  const d = input.fromDate ?? new Date();
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return getFinanceSummary(input.month ?? month);
}
