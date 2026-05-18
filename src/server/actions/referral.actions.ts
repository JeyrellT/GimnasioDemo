"use server";
// =============================================================================
// BLACKLINE FITNESS — Referral system server actions
// Owner: backend-api.
//
// Surface:
//   createReferral      — TRAINER crea un referido para un nuevo coach
//   getMyReferrals      — TRAINER consulta sus propios referidos
//   listAllReferrals    — SUPER_ADMIN lista todos los referidos (paginado, filtro por status)
//   reviewReferral      — SUPER_ADMIN aprueba o rechaza un referido
//   getReferralStats    — SUPER_ADMIN obtiene conteos por status
//
// Todas las mutaciones escriben AuditLog.
// Todos los inputs se validan con Zod antes de acceder a DB.
// =============================================================================

import { z } from "zod";

import { prisma, Prisma } from "@/server/db";
import { requireUser, requireSuperAdmin } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@/lib/errors";
import { logInfo, logError } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import type { ReferralStatus } from "@prisma/client";

// =============================================================================
// Exported return-type interfaces
// =============================================================================

/** Referido propio del trainer (vista trainer). */
export interface ReferralItem {
  id: string;
  referredName: string;
  referredEmail: string;
  referredPhone: string | null;
  status: ReferralStatus;
  note: string | null;
  adminNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Datos básicos del usuario registrado si status === REGISTERED. */
  referredUser: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/** Item en el listado admin — incluye info del referente. */
export interface ReferralListItem {
  id: string;
  referredName: string;
  referredEmail: string;
  referredPhone: string | null;
  status: ReferralStatus;
  note: string | null;
  adminNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  referrer: {
    id: string;
    name: string;
    email: string;
  };
  referredUser: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/** Conteos por status para el dashboard de admin. */
export interface ReferralStats {
  pending: number;
  approved: number;
  registered: number;
  rejected: number;
  total: number;
}

// =============================================================================
// Internal: audit helper
// =============================================================================

async function writeReferralAuditLog(
  actorUserId: string,
  action: "CREATE" | "UPDATE",
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType: "Referral",
        entityId,
        metadata: metadata
          ? (metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } catch (e) {
    logError(e, {
      fn: "referral.writeReferralAuditLog",
      action,
      entityId,
    });
  }
}

// =============================================================================
// Zod schemas
// =============================================================================

const createReferralSchema = z.object({
  referredName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120),
  referredEmail: z
    .string()
    .email("Ingresá un email válido.")
    .toLowerCase(),
  referredPhone: z
    .string()
    .max(30)
    .optional()
    .transform((v) => v ?? null),
  note: z
    .string()
    .max(500)
    .optional()
    .transform((v) => v ?? null),
});

const listAllReferralsSchema = z
  .object({
    status: z
      .enum(["PENDING", "APPROVED", "REGISTERED", "REJECTED"])
      .optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(200).default(50),
  })
  .optional();

const reviewReferralSchema = z.object({
  referralId: z.string().cuid(),
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z
    .string()
    .max(500)
    .optional()
    .transform((v) => v ?? null),
});

// =============================================================================
// createReferral
// =============================================================================

export async function createReferral(formData: {
  referredName: string;
  referredEmail: string;
  referredPhone?: string;
  note?: string;
}): Promise<ActionResult<ReferralItem>> {
  return tryCatch(async () => {
    const user = await requireUser();

    // Solo trainers pueden crear referidos
    if (user.role !== "TRAINER") {
      throw new ForbiddenError(
        "TRAINER_ONLY",
        "Solo los entrenadores pueden crear referidos.",
      );
    }

    const { referredName, referredEmail, referredPhone, note } =
      createReferralSchema.parse(formData);

    // Validar que el email no pertenezca a un usuario existente
    const existingUser = await prisma.user.findFirst({
      where: { email: referredEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictError(
        "EMAIL_ALREADY_REGISTERED",
        "El email ingresado ya pertenece a un usuario registrado.",
      );
    }

    // Validar que no haya un referido pendiente para el mismo email por este trainer
    const duplicatePending = await prisma.referral.findFirst({
      where: {
        referrerUserId: user.id,
        referredEmail,
        status: "PENDING",
      },
      select: { id: true },
    });

    if (duplicatePending) {
      throw new ConflictError(
        "DUPLICATE_PENDING_REFERRAL",
        "Ya tenés un referido pendiente para ese email.",
      );
    }

    const referral = await prisma.referral.create({
      data: {
        referrerUserId: user.id,
        referredName,
        referredEmail,
        referredPhone,
        note,
        status: "PENDING",
      },
      select: {
        id: true,
        referredName: true,
        referredEmail: true,
        referredPhone: true,
        status: true,
        note: true,
        adminNote: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        referredUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await writeReferralAuditLog(user.id, "CREATE", referral.id, {
      referredEmail,
    });

    logInfo("Referral created", {
      actorId: user.id,
      referralId: referral.id,
    });

    return {
      ...referral,
      referredUser: referral.referredUser ?? null,
    };
  });
}

// =============================================================================
// getMyReferrals
// =============================================================================

export async function getMyReferrals(): Promise<ActionResult<ReferralItem[]>> {
  return tryCatch(async () => {
    const user = await requireUser();

    if (user.role !== "TRAINER") {
      throw new ForbiddenError(
        "TRAINER_ONLY",
        "Solo los entrenadores pueden consultar sus referidos.",
      );
    }

    const rows = await prisma.referral.findMany({
      where: { referrerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        referredName: true,
        referredEmail: true,
        referredPhone: true,
        status: true,
        note: true,
        adminNote: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        referredUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return rows.map((r) => ({
      ...r,
      referredUser: r.referredUser ?? null,
    }));
  });
}

// =============================================================================
// listAllReferrals
// =============================================================================

export async function listAllReferrals(input?: {
  status?: ReferralStatus;
  page?: number;
  pageSize?: number;
}): Promise<
  ActionResult<{
    referrals: ReferralListItem[];
    total: number;
    page: number;
    pageSize: number;
  }>
> {
  return tryCatch(async () => {
    await requireSuperAdmin();

    const parsed = listAllReferralsSchema.parse(input);
    const page = parsed?.page ?? 1;
    const pageSize = parsed?.pageSize ?? 50;

    const where = parsed?.status ? { status: parsed.status } : {};

    const [rows, total] = await prisma.$transaction([
      prisma.referral.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          referredName: true,
          referredEmail: true,
          referredPhone: true,
          status: true,
          note: true,
          adminNote: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,
          referrer: {
            select: { id: true, name: true, email: true },
          },
          referredUser: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.referral.count({ where }),
    ]);

    const referrals: ReferralListItem[] = rows.map((r) => ({
      ...r,
      referrer: r.referrer,
      referredUser: r.referredUser ?? null,
    }));

    return { referrals, total, page, pageSize };
  });
}

// =============================================================================
// reviewReferral
// =============================================================================

export async function reviewReferral(input: {
  referralId: string;
  status: "APPROVED" | "REJECTED";
  adminNote?: string;
}): Promise<ActionResult<ReferralListItem>> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const { referralId, status, adminNote } = reviewReferralSchema.parse(input);

    const existing = await prisma.referral.findUnique({
      where: { id: referralId },
      select: { id: true, status: true, referredEmail: true },
    });

    if (!existing) {
      throw new NotFoundError(
        "REFERRAL_NOT_FOUND",
        "El referido no existe.",
      );
    }

    // No reabrir referidos ya registrados
    if (existing.status === "REGISTERED") {
      throw new ConflictError(
        "REFERRAL_ALREADY_REGISTERED",
        "No se puede cambiar el estado de un referido que ya se registró.",
      );
    }

    // Evitar actualización redundante
    if (existing.status === status) {
      throw new ConflictError(
        "STATUS_UNCHANGED",
        `El referido ya está en estado ${status}.`,
      );
    }

    const updated = await prisma.referral.update({
      where: { id: referralId },
      data: {
        status,
        adminNote,
        reviewedAt: new Date(),
      },
      select: {
        id: true,
        referredName: true,
        referredEmail: true,
        referredPhone: true,
        status: true,
        note: true,
        adminNote: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        referrer: {
          select: { id: true, name: true, email: true },
        },
        referredUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await writeReferralAuditLog(actor.id, "UPDATE", referralId, {
      previousStatus: existing.status,
      newStatus: status,
    });

    logInfo("Referral reviewed", {
      actorId: actor.id,
      referralId,
      newStatus: status,
    });

    return {
      ...updated,
      referredUser: updated.referredUser ?? null,
    };
  });
}

// =============================================================================
// getReferralStats
// =============================================================================

export async function getReferralStats(): Promise<ActionResult<ReferralStats>> {
  return tryCatch(async () => {
    await requireSuperAdmin();

    const [pending, approved, registered, rejected] =
      await prisma.$transaction([
        prisma.referral.count({ where: { status: "PENDING" } }),
        prisma.referral.count({ where: { status: "APPROVED" } }),
        prisma.referral.count({ where: { status: "REGISTERED" } }),
        prisma.referral.count({ where: { status: "REJECTED" } }),
      ]);

    return {
      pending,
      approved,
      registered,
      rejected,
      total: pending + approved + registered + rejected,
    };
  });
}
