"use server";
// =============================================================================
// VIZION — Billing server actions
// Owner: backend-api.
//
// Handles: manual charges, bulk monthly generation, waive/cancel,
// charge listing, subscription queries, and invoice listing.
//
// AuditLog entries are written for every mutation.
// =============================================================================

import { prisma, Prisma } from "@/server/db";
import {
  requireTrainer,
  assertOwnsClient,
  requireActiveSubscription,
} from "@/server/guards";
import { tryCatch } from "@/lib/result";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@/lib/errors";
import { logInfo, logError } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import type {
  GenerateMonthlyChargesResult,
  InvoiceListItem,
} from "@/types/api";
import type {
  ChargeStatus,
  InvoiceStatus,
  SubscriptionTier,
  SubscriptionStatus,
} from "@prisma/client";

// =============================================================================
// Helper types
// =============================================================================

export interface ChargeListItem {
  chargeId: string;
  clientId: string;
  clientName: string;
  amountCRC: number;
  periodStart: Date;
  periodEnd: Date;
  status: ChargeStatus;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
}

export interface SubscriptionDetail {
  id: string;
  planTier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
}

// =============================================================================
// Internal audit helper
// =============================================================================

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
    logError(e, { fn: "billing.writeAuditLog", entityType, entityId });
  }
}

// =============================================================================
// createCharge
// Manually issue a billing charge to a specific client.
// =============================================================================

export async function createCharge(
  formData: FormData,
): Promise<ActionResult<{ chargeId: string }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const clientId = formData.get("clientId");
    if (typeof clientId !== "string" || !clientId.trim()) {
      throw new ValidationError("MISSING_CLIENT", "El cliente es requerido.");
    }

    const rawAmount = formData.get("amountCRC");
    const amountCRC = parseFloat(typeof rawAmount === "string" ? rawAmount : "");
    if (isNaN(amountCRC) || amountCRC <= 0) {
      throw new ValidationError(
        "INVALID_AMOUNT",
        "El monto debe ser mayor a cero.",
      );
    }

    const rawPeriodStart = formData.get("periodStart");
    const rawPeriodEnd = formData.get("periodEnd");
    if (typeof rawPeriodStart !== "string" || typeof rawPeriodEnd !== "string") {
      throw new ValidationError(
        "MISSING_PERIOD",
        "El período de cobro es requerido.",
      );
    }

    const periodStart = new Date(rawPeriodStart);
    const periodEnd = new Date(rawPeriodEnd);

    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      throw new ValidationError(
        "INVALID_PERIOD",
        "Las fechas del período no son válidas.",
      );
    }

    if (periodEnd <= periodStart) {
      throw new ValidationError(
        "PERIOD_ORDER",
        "La fecha de fin debe ser posterior a la de inicio.",
      );
    }

    const rawNotes = formData.get("notes");
    const notes =
      typeof rawNotes === "string" && rawNotes.trim() ? rawNotes.trim() : null;

    // Verify trainer→client ownership
    await assertOwnsClient(trainer.id, clientId.trim());

    // Prevent duplicate charge for the same period
    const existing = await prisma.clientCharge.findUnique({
      where: {
        trainerUserId_clientUserId_periodStart: {
          trainerUserId: trainer.id,
          clientUserId: clientId.trim(),
          periodStart,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError(
        "DUPLICATE_CHARGE",
        "Ya existe un cobro para este cliente en ese período.",
      );
    }

    const charge = await prisma.clientCharge.create({
      data: {
        trainerUserId: trainer.id,
        clientUserId: clientId.trim(),
        amountCRC,
        periodStart,
        periodEnd,
        status: "PENDING",
        notes,
      },
      select: { id: true },
    });

    // Notify client in-app
    await prisma.notification.create({
      data: {
        userUserId: clientId.trim(),
        type: "CHARGE_CREATED",
        title: "Nuevo cobro",
        body: `Tu entrenador generó un cobro de ₡${amountCRC.toLocaleString("es-CR")} para el período ${periodStart.toLocaleDateString("es-CR")} – ${periodEnd.toLocaleDateString("es-CR")}.`,
        data: { chargeId: charge.id },
        sentVia: [],
      },
    });

    await writeAuditLog(trainer.id, "ClientCharge", charge.id, {
      action: "CREATE",
      clientId,
      amountCRC,
    });

    logInfo("Charge created", {
      trainerId: trainer.id,
      chargeId: charge.id,
      clientId,
    });

    return { chargeId: charge.id };
  });
}

// =============================================================================
// generateMonthlyCharges
// Auto-creates one charge per ACTIVE TrainerClient that has a monthlyPriceCRC set,
// for the current calendar month, skipping if one already exists.
// =============================================================================

export async function generateMonthlyCharges(): Promise<
  ActionResult<GenerateMonthlyChargesResult>
> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Find all active clients with a price set
    const links = await prisma.trainerClient.findMany({
      where: {
        trainerId: trainer.id,
        status: "ACTIVE",
        monthlyPriceCRC: { not: null },
      },
      select: {
        clientId: true,
        monthlyPriceCRC: true,
      },
    });

    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const link of links) {
      if (!link.monthlyPriceCRC) {
        skipped++;
        continue;
      }

      try {
        // Check if charge already exists for this period
        const exists = await prisma.clientCharge.findUnique({
          where: {
            trainerUserId_clientUserId_periodStart: {
              trainerUserId: trainer.id,
              clientUserId: link.clientId,
              periodStart,
            },
          },
          select: { id: true },
        });

        if (exists) {
          skipped++;
          continue;
        }

        const amountCRC = Number(link.monthlyPriceCRC);

        const charge = await prisma.clientCharge.create({
          data: {
            trainerUserId: trainer.id,
            clientUserId: link.clientId,
            amountCRC,
            periodStart,
            periodEnd,
            status: "PENDING",
          },
          select: { id: true },
        });

        // Notify client
        await prisma.notification.create({
          data: {
            userUserId: link.clientId,
            type: "CHARGE_CREATED",
            title: "Cobro mensual generado",
            body: `Tu entrenador generó el cobro mensual de ₡${amountCRC.toLocaleString("es-CR")}.`,
            data: { chargeId: charge.id },
            sentVia: [],
          },
        });

        generated++;
      } catch (e) {
        logError(e, {
          fn: "generateMonthlyCharges",
          trainerId: trainer.id,
          clientId: link.clientId,
        });
        errors++;
      }
    }

    await writeAuditLog(trainer.id, "ClientCharge", trainer.id, {
      action: "BULK_GENERATE",
      generated,
      skipped,
      errors,
      month: periodStart.toISOString().slice(0, 7),
    });

    logInfo("Monthly charges generated", {
      trainerId: trainer.id,
      generated,
      skipped,
      errors,
    });

    return { generated, skipped, errors };
  });
}

// =============================================================================
// waiveCharge
// =============================================================================

export async function waiveCharge(
  chargeId: string,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const charge = await prisma.clientCharge.findUnique({
      where: { id: chargeId },
      select: { id: true, trainerUserId: true, status: true },
    });

    if (!charge) {
      throw new NotFoundError("CHARGE_NOT_FOUND", "Cobro no encontrado.");
    }

    if (charge.trainerUserId !== trainer.id) {
      throw new ForbiddenError(
        "CHARGE_NOT_OWNED",
        "No tenés permiso para modificar este cobro.",
      );
    }

    if (charge.status === "WAIVED" || charge.status === "CANCELLED") {
      throw new ValidationError(
        "CHARGE_ALREADY_TERMINAL",
        "El cobro ya fue anulado o cancelado.",
      );
    }

    await prisma.clientCharge.update({
      where: { id: chargeId },
      data: { status: "WAIVED" },
    });

    await writeAuditLog(trainer.id, "ClientCharge", chargeId, {
      action: "WAIVE",
      prevStatus: charge.status,
    });

    logInfo("Charge waived", { trainerId: trainer.id, chargeId });

    return { updated: true };
  });
}

// =============================================================================
// cancelCharge
// =============================================================================

export async function cancelCharge(
  chargeId: string,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const charge = await prisma.clientCharge.findUnique({
      where: { id: chargeId },
      select: { id: true, trainerUserId: true, status: true },
    });

    if (!charge) {
      throw new NotFoundError("CHARGE_NOT_FOUND", "Cobro no encontrado.");
    }

    if (charge.trainerUserId !== trainer.id) {
      throw new ForbiddenError(
        "CHARGE_NOT_OWNED",
        "No tenés permiso para modificar este cobro.",
      );
    }

    if (charge.status === "PAID") {
      throw new ValidationError(
        "CHARGE_ALREADY_PAID",
        "No se puede cancelar un cobro ya pagado.",
      );
    }

    if (charge.status === "CANCELLED") {
      throw new ValidationError(
        "CHARGE_ALREADY_CANCELLED",
        "El cobro ya está cancelado.",
      );
    }

    await prisma.clientCharge.update({
      where: { id: chargeId },
      data: { status: "CANCELLED" },
    });

    await writeAuditLog(trainer.id, "ClientCharge", chargeId, {
      action: "CANCEL",
      prevStatus: charge.status,
    });

    logInfo("Charge cancelled", { trainerId: trainer.id, chargeId });

    return { updated: true };
  });
}

// =============================================================================
// listCharges
// =============================================================================

export async function listCharges(filters?: {
  status?: string;
  clientId?: string;
  month?: string; // "YYYY-MM"
}): Promise<ActionResult<{ charges: ChargeListItem[]; total: number }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    // Build dynamic where clause
    type WhereClause = {
      trainerUserId: string;
      status?: ChargeStatus;
      clientUserId?: string;
      periodStart?: { gte: Date; lt: Date };
    };

    const where: WhereClause = { trainerUserId: trainer.id };

    const validStatuses: ChargeStatus[] = [
      "PENDING",
      "PAID",
      "OVERDUE",
      "WAIVED",
      "CANCELLED",
    ];

    if (filters?.status && validStatuses.includes(filters.status as ChargeStatus)) {
      where.status = filters.status as ChargeStatus;
    }

    if (filters?.clientId) {
      where.clientUserId = filters.clientId;
    }

    if (filters?.month) {
      const [year, month] = filters.month.split("-").map(Number);
      if (year && month) {
        where.periodStart = {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        };
      }
    }

    const [rows, total] = await prisma.$transaction([
      prisma.clientCharge.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { name: true } },
        },
        take: 100,
      }),
      prisma.clientCharge.count({ where }),
    ]);

    const charges: ChargeListItem[] = rows.map((row) => ({
      chargeId: row.id,
      clientId: row.clientUserId,
      clientName: row.client.name,
      amountCRC: Number(row.amountCRC),
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      status: row.status,
      paidAt: row.paidAt,
      notes: row.notes,
      createdAt: row.createdAt,
    }));

    return { charges, total };
  });
}

// =============================================================================
// getMySubscription
// =============================================================================

export async function getMySubscription(): Promise<
  ActionResult<SubscriptionDetail>
> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const sub = await prisma.trainerSubscription.findUnique({
      where: { trainerUserId: trainer.id },
      select: {
        id: true,
        planTier: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        trialEndsAt: true,
      },
    });

    if (!sub) {
      throw new NotFoundError(
        "NO_SUBSCRIPTION",
        "No tenés una suscripción registrada.",
      );
    }

    return {
      id: sub.id,
      planTier: sub.planTier,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
    };
  });
}

// =============================================================================
// listInvoices
// =============================================================================

export async function listInvoices(filters?: {
  status?: string;
  month?: string; // "YYYY-MM"
}): Promise<ActionResult<{ invoices: InvoiceListItem[] }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    type InvoiceWhereClause = {
      status?: InvoiceStatus;
      charge: {
        trainerUserId: string;
        periodStart?: { gte: Date; lt: Date };
      };
    };

    const where: InvoiceWhereClause = {
      charge: { trainerUserId: trainer.id },
    };

    const validInvoiceStatuses: InvoiceStatus[] = [
      "DRAFT",
      "SIGNED",
      "ACCEPTED",
      "REJECTED",
      "FAILED",
    ];

    if (
      filters?.status &&
      validInvoiceStatuses.includes(filters.status as InvoiceStatus)
    ) {
      where.status = filters.status as InvoiceStatus;
    }

    if (filters?.month) {
      const [year, month] = filters.month.split("-").map(Number);
      if (year && month) {
        where.charge.periodStart = {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        };
      }
    }

    const rows = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        charge: {
          select: {
            id: true,
            amountCRC: true,
            periodStart: true,
            periodEnd: true,
            status: true,
            client: { select: { name: true } },
          },
        },
      },
      take: 100,
    });

    const invoices: InvoiceListItem[] = rows.map((row) => ({
      invoiceId: row.id,
      chargeId: row.chargeId,
      clientName: row.charge.client.name,
      amountCRC: row.charge.amountCRC.toString(),
      periodStart: row.charge.periodStart,
      periodEnd: row.charge.periodEnd,
      chargeStatus: row.charge.status,
      invoiceStatus: row.status,
      issuedAt: row.issuedAt,
      claveNumerica: row.claveNumerica,
    }));

    return { invoices };
  });
}
