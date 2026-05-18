"use server";
// =============================================================================
// VIZION — Super Admin server actions
// Owner: backend-api.
//
// ALL actions in this file are gated behind requireSuperAdmin(). They are
// not accessible to ADMIN, TRAINER, or CLIENT roles.
//
// Every mutating action writes an AuditLog entry.
// Inputs are validated with Zod before any DB access.
// =============================================================================

import { z } from "zod";
import { cookies } from "next/headers";

import { prisma, prismaRaw, Prisma } from "@/server/db";
import { requireSuperAdmin } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@/lib/errors";
import { logInfo, logError } from "@/lib/logger";
import { serverEnv } from "@/server/env";
import {
  IMPERSONATION_COOKIE_NAME,
  IMPERSONATION_MAX_AGE_SEC,
  signImpersonation,
} from "@/lib/impersonation";
import type { ActionResult } from "@/types/api";
import type {
  UserRole,
  SubscriptionStatus,
  SubscriptionTier,
  TrainerProfile,
  ClientProfile,
  TrainerSubscription,
} from "@prisma/client";

// =============================================================================
// Exported helper types (imported by frontend)
// =============================================================================

export interface AdminDashboardStats {
  totalUsers: number;
  totalTrainers: number;
  totalClients: number;
  totalAdmins: number;
  totalSuperAdmins: number;
  suspendedUsers: number;
  activeSubs: number;
  trialSubs: number;
  cancelledSubs: number;
  readOnlySubs: number;
  newUsersLast30d: number;
  newTrainersLast30d: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  suspendedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  trainerProfile: TrainerProfile | null;
  clientProfile: ClientProfile | null;
  activeSubscription: {
    id: string;
    planTier: string;
    status: string;
    trialEndsAt: Date | null;
    currentPeriodEndsAt: Date;
  } | null;
  totalClients: number | null; // non-null when role === TRAINER
  totalSessions: number | null; // non-null when role === CLIENT
}

export interface AdminSubscriptionItem {
  id: string;
  trainerUserId: string;
  trainerEmail: string;
  trainerName: string;
  planTier: string;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date;
  createdAt: Date;
}

// =============================================================================
// Internal: audit helper
// =============================================================================

async function writeAdminAuditLog(
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        // AuditAction enum — UPDATE covers most admin mutations; use ACCESS for reads
        action: "UPDATE",
        entityType,
        entityId,
        metadata: metadata
          ? (metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } catch (e) {
    logError(e, { fn: "admin.writeAdminAuditLog", action, entityType, entityId });
  }
}

// =============================================================================
// getAdminDashboardStats
// =============================================================================

export async function getAdminDashboardStats(): Promise<
  ActionResult<AdminDashboardStats>
> {
  return tryCatch(async () => {
    await requireSuperAdmin();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalTrainers,
      totalClients,
      totalAdmins,
      totalSuperAdmins,
      suspendedUsers,
      activeSubs,
      trialSubs,
      cancelledSubs,
      readOnlySubs,
      newUsersLast30d,
      newTrainersLast30d,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { role: "TRAINER" } }),
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
      prisma.user.count({ where: { suspendedAt: { not: null } } }),
      prisma.trainerSubscription.count({ where: { status: "ACTIVE" } }),
      prisma.trainerSubscription.count({ where: { status: "TRIAL" } }),
      prisma.trainerSubscription.count({ where: { status: "CANCELLED" } }),
      prisma.trainerSubscription.count({ where: { status: "READ_ONLY" } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({
        where: { role: "TRAINER", createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    return {
      totalUsers,
      totalTrainers,
      totalClients,
      totalAdmins,
      totalSuperAdmins,
      suspendedUsers,
      activeSubs,
      trialSubs,
      cancelledSubs,
      readOnlySubs,
      newUsersLast30d,
      newTrainersLast30d,
    };
  });
}

// =============================================================================
// listAllUsers
// =============================================================================

const listAllUsersSchema = z
  .object({
    role: z
      .enum(["TRAINER", "CLIENT", "ADMIN", "SUPER_ADMIN"])
      .optional(),
    suspended: z.boolean().optional(),
    search: z.string().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(200).default(50),
  })
  .optional();

export async function listAllUsers(
  input?: {
    role?: UserRole;
    suspended?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<
  ActionResult<{
    users: AdminUserListItem[];
    total: number;
    page: number;
    pageSize: number;
  }>
> {
  return tryCatch(async () => {
    await requireSuperAdmin();

    const parsed = listAllUsersSchema.parse(input);
    const page = parsed?.page ?? 1;
    const pageSize = parsed?.pageSize ?? 50;

    type UserWhere = {
      role?: UserRole;
      suspendedAt?: { not: null } | null;
      OR?: Array<{ email?: { contains: string; mode: "insensitive" }; name?: { contains: string; mode: "insensitive" } }>;
    };

    const where: UserWhere = {};

    if (parsed?.role) where.role = parsed.role;
    if (parsed?.suspended === true) where.suspendedAt = { not: null };
    if (parsed?.suspended === false) where.suspendedAt = null;
    if (parsed?.search?.trim()) {
      const s = parsed.search.trim();
      where.OR = [
        { email: { contains: s, mode: "insensitive" } },
        { name: { contains: s, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          suspendedAt: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return { users: rows, total, page, pageSize };
  });
}

// =============================================================================
// getUserDetail
// =============================================================================

export async function getUserDetail(
  userId: string,
): Promise<ActionResult<AdminUserDetail>> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const userIdSchema = z.string().cuid();
    const validatedId = userIdSchema.parse(userId);

    // Use prismaRaw to see soft-deleted users if needed (SUPER_ADMIN investigation)
    const user = await prismaRaw.user.findUnique({
      where: { id: validatedId },
      include: {
        trainerProfile: true,
        clientProfile: true,
        trainerSubscription: {
          select: {
            id: true,
            planTier: true,
            status: true,
            trialEndsAt: true,
            currentPeriodEnd: true,
          },
        },
        _count: {
          select: {
            asTrainer: { where: { status: "ACTIVE" } },
            workoutSessions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "Usuario no encontrado.");
    }

    await writeAdminAuditLog(actor.id, "ACCESS_USER_DETAIL", "User", validatedId, {
      targetUserId: validatedId,
    });

    const sub = user.trainerSubscription;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      suspendedAt: user.suspendedAt,
      suspendedReason: user.suspendedReason,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      trainerProfile: user.trainerProfile,
      clientProfile: user.clientProfile,
      activeSubscription: sub
        ? {
            id: sub.id,
            planTier: sub.planTier,
            status: sub.status,
            trialEndsAt: sub.trialEndsAt,
            currentPeriodEndsAt: sub.currentPeriodEnd,
          }
        : null,
      totalClients:
        user.role === "TRAINER" ? user._count.asTrainer : null,
      totalSessions:
        user.role === "CLIENT" ? user._count.workoutSessions : null,
    };
  });
}

// =============================================================================
// promoteUser
// =============================================================================

const promoteUserSchema = z.object({
  userId: z.string().cuid(),
  targetRole: z.enum(["TRAINER", "CLIENT", "ADMIN", "SUPER_ADMIN"]),
});

export async function promoteUser(input: {
  userId: string;
  targetRole: UserRole;
}): Promise<ActionResult<{ updated: true; previousRole: UserRole; newRole: UserRole }>> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const { userId, targetRole } = promoteUserSchema.parse(input);

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!target) {
      throw new NotFoundError("USER_NOT_FOUND", "Usuario no encontrado.");
    }

    const previousRole = target.role;

    // Prevent demoting the last SUPER_ADMIN (including self-demote)
    if (previousRole === "SUPER_ADMIN" && targetRole !== "SUPER_ADMIN") {
      const superAdminCount = await prisma.user.count({
        where: { role: "SUPER_ADMIN" },
      });

      if (superAdminCount <= 1) {
        throw new ForbiddenError(
          "LAST_SUPER_ADMIN",
          "No podés degradar al único Super Admin del sistema.",
        );
      }

      if (userId === actor.id) {
        throw new ForbiddenError(
          "SELF_DEMOTE",
          "No podés degradar tu propio rol de Super Admin.",
        );
      }
    }

    if (previousRole === targetRole) {
      throw new ConflictError(
        "ROLE_UNCHANGED",
        `El usuario ya tiene el rol ${targetRole}.`,
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: targetRole },
    });

    await writeAdminAuditLog(actor.id, "PROMOTE_USER", "User", userId, {
      previousRole,
      newRole: targetRole,
    });

    logInfo("User role updated", {
      actorId: actor.id,
      targetUserId: userId,
      previousRole,
      newRole: targetRole,
    });

    return { updated: true, previousRole, newRole: targetRole };
  });
}

// =============================================================================
// suspendUser
// =============================================================================

const suspendUserSchema = z.object({
  userId: z.string().cuid(),
  reason: z.string().min(5, "La razón debe tener al menos 5 caracteres."),
});

export async function suspendUser(input: {
  userId: string;
  reason: string;
}): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const { userId, reason } = suspendUserSchema.parse(input);

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, suspendedAt: true },
    });

    if (!target) {
      throw new NotFoundError("USER_NOT_FOUND", "Usuario no encontrado.");
    }

    if (target.role === "SUPER_ADMIN") {
      throw new ForbiddenError(
        "CANNOT_SUSPEND_SUPER_ADMIN",
        "No podés suspender a otro Super Admin.",
      );
    }

    if (target.suspendedAt !== null) {
      throw new ConflictError(
        "ALREADY_SUSPENDED",
        "El usuario ya está suspendido.",
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        suspendedAt: new Date(),
        suspendedReason: reason,
      },
    });

    await writeAdminAuditLog(actor.id, "SUSPEND_USER", "User", userId, {
      reason,
    });

    logInfo("User suspended", { actorId: actor.id, targetUserId: userId });

    return { updated: true };
  });
}

// =============================================================================
// unsuspendUser
// =============================================================================

const unsuspendUserSchema = z.object({
  userId: z.string().cuid(),
});

export async function unsuspendUser(input: {
  userId: string;
}): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const { userId } = unsuspendUserSchema.parse(input);

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, suspendedAt: true },
    });

    if (!target) {
      throw new NotFoundError("USER_NOT_FOUND", "Usuario no encontrado.");
    }

    if (target.suspendedAt === null) {
      throw new ConflictError(
        "NOT_SUSPENDED",
        "El usuario no está suspendido.",
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        suspendedAt: null,
        suspendedReason: null,
      },
    });

    await writeAdminAuditLog(actor.id, "UNSUSPEND_USER", "User", userId, {});

    logInfo("User unsuspended", { actorId: actor.id, targetUserId: userId });

    return { updated: true };
  });
}

// =============================================================================
// listAllSubscriptions
// =============================================================================

const listAllSubscriptionsSchema = z
  .object({
    status: z
      .enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "READ_ONLY"])
      .optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(200).default(50),
  })
  .optional();

export async function listAllSubscriptions(input?: {
  status?: SubscriptionStatus;
  page?: number;
  pageSize?: number;
}): Promise<
  ActionResult<{
    subscriptions: AdminSubscriptionItem[];
    total: number;
    page: number;
    pageSize: number;
  }>
> {
  return tryCatch(async () => {
    await requireSuperAdmin();

    const parsed = listAllSubscriptionsSchema.parse(input);
    const page = parsed?.page ?? 1;
    const pageSize = parsed?.pageSize ?? 50;

    const where = parsed?.status ? { status: parsed.status as SubscriptionStatus } : {};

    const [rows, total] = await prisma.$transaction([
      prisma.trainerSubscription.findMany({
        where,
        select: {
          id: true,
          trainerUserId: true,
          planTier: true,
          status: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
          createdAt: true,
          trainer: { select: { email: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.trainerSubscription.count({ where }),
    ]);

    const subscriptions: AdminSubscriptionItem[] = rows.map((row) => ({
      id: row.id,
      trainerUserId: row.trainerUserId,
      trainerEmail: row.trainer.email,
      trainerName: row.trainer.name,
      planTier: row.planTier,
      status: row.status,
      trialEndsAt: row.trialEndsAt,
      currentPeriodEndsAt: row.currentPeriodEnd,
      createdAt: row.createdAt,
    }));

    return { subscriptions, total, page, pageSize };
  });
}

// =============================================================================
// extendTrial
// =============================================================================

const extendTrialSchema = z.object({
  trainerUserId: z.string().cuid(),
  days: z.number().int().min(1).max(90),
});

export async function extendTrial(input: {
  trainerUserId: string;
  days: number;
}): Promise<ActionResult<{ updated: true; newTrialEndsAt: Date }>> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const { trainerUserId, days } = extendTrialSchema.parse(input);

    const sub = await prisma.trainerSubscription.findUnique({
      where: { trainerUserId },
      select: { id: true, status: true, trialEndsAt: true },
    });

    if (!sub) {
      throw new NotFoundError(
        "SUBSCRIPTION_NOT_FOUND",
        "Suscripción no encontrada para este entrenador.",
      );
    }

    if (sub.status !== "TRIAL") {
      throw new ValidationError(
        "NOT_IN_TRIAL",
        "Solo se puede extender el período de prueba cuando el estado es TRIAL.",
      );
    }

    const baseDate = sub.trialEndsAt ?? new Date();
    const newTrialEndsAt = new Date(
      baseDate.getTime() + days * 24 * 60 * 60 * 1000,
    );

    await prisma.trainerSubscription.update({
      where: { trainerUserId },
      data: { trialEndsAt: newTrialEndsAt },
    });

    await writeAdminAuditLog(
      actor.id,
      "EXTEND_TRIAL",
      "TrainerSubscription",
      sub.id,
      { trainerUserId, days, newTrialEndsAt: newTrialEndsAt.toISOString() },
    );

    logInfo("Trial extended", {
      actorId: actor.id,
      trainerUserId,
      days,
    });

    return { updated: true, newTrialEndsAt };
  });
}

// =============================================================================
// forceCancelSubscription
// =============================================================================

const forceCancelSubscriptionSchema = z.object({
  subscriptionId: z.string().cuid(),
  reason: z.string().min(5, "La razón debe tener al menos 5 caracteres."),
});

export async function forceCancelSubscription(input: {
  subscriptionId: string;
  reason: string;
}): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const { subscriptionId, reason } = forceCancelSubscriptionSchema.parse(input);

    const sub = await prisma.trainerSubscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, status: true, trainerUserId: true },
    });

    if (!sub) {
      throw new NotFoundError(
        "SUBSCRIPTION_NOT_FOUND",
        "Suscripción no encontrada.",
      );
    }

    if (sub.status === "CANCELLED") {
      throw new ConflictError(
        "ALREADY_CANCELLED",
        "La suscripción ya está cancelada.",
      );
    }

    await prisma.trainerSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    await writeAdminAuditLog(
      actor.id,
      "FORCE_CANCEL_SUBSCRIPTION",
      "TrainerSubscription",
      subscriptionId,
      { reason, trainerUserId: sub.trainerUserId },
    );

    logInfo("Subscription force-cancelled", {
      actorId: actor.id,
      subscriptionId,
      trainerUserId: sub.trainerUserId,
    });

    return { updated: true };
  });
}

// =============================================================================
// startImpersonation
// =============================================================================

const startImpersonationSchema = z.object({
  userId: z.string().cuid(),
});

export async function startImpersonation(input: {
  userId: string;
}): Promise<ActionResult<{ redirectTo: string }>> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const { userId } = startImpersonationSchema.parse(input);

    if (!serverEnv.IMPERSONATION_SECRET) {
      throw new ForbiddenError(
        "IMPERSONATION_NOT_CONFIGURED",
        "La suplantación no está configurada en este entorno.",
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!target) {
      throw new NotFoundError("USER_NOT_FOUND", "Usuario no encontrado.");
    }

    if (target.role === "SUPER_ADMIN") {
      throw new ForbiddenError(
        "CANNOT_IMPERSONATE_SUPER_ADMIN",
        "No podés suplantar a otro Super Admin.",
      );
    }

    const token = signImpersonation({
      actorId: actor.id,
      targetId: target.id,
    });

    const cookieStore = await cookies();
    const isProduction = serverEnv.NODE_ENV === "production";

    cookieStore.set(IMPERSONATION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: IMPERSONATION_MAX_AGE_SEC,
    });

    const redirectTo =
      target.role === "TRAINER"
        ? "/trainer/inicio"
        : target.role === "CLIENT"
          ? "/client/inicio"
          : "/inicio";

    await writeAdminAuditLog(
      actor.id,
      "START_IMPERSONATION",
      "User",
      target.id,
      { targetRole: target.role },
    );

    logInfo("Impersonation started", {
      actorId: actor.id,
      targetUserId: target.id,
      targetRole: target.role,
    });

    return { redirectTo };
  });
}

// =============================================================================
// stopImpersonation
// =============================================================================

export async function stopImpersonation(): Promise<
  ActionResult<{ redirectTo: string }>
> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATION_COOKIE_NAME);

    await writeAdminAuditLog(
      actor.id,
      "STOP_IMPERSONATION",
      "User",
      actor.id,
      {},
    );

    logInfo("Impersonation stopped", { actorId: actor.id });

    return { redirectTo: "/admin" };
  });
}

// =============================================================================
// getCurrentImpersonation
// =============================================================================

export async function getCurrentImpersonation(): Promise<
  ActionResult<{
    isImpersonating: boolean;
    actor?: { id: string; email: string; name: string };
    target?: { id: string; email: string; name: string; role: UserRole };
  } | null>
> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const cookieStore = await cookies();
    const raw = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value;

    // Import verify lazily to keep the module tree clean
    const { verifyImpersonation } = await import("@/lib/impersonation");
    const payload = verifyImpersonation(raw);

    if (!payload || payload.actorId !== actor.id) {
      return { isImpersonating: false };
    }

    const target = await prisma.user.findUnique({
      where: { id: payload.targetId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!target) {
      // Cookie points to a deleted user — clear it
      cookieStore.delete(IMPERSONATION_COOKIE_NAME);
      return { isImpersonating: false };
    }

    return {
      isImpersonating: true,
      actor: { id: actor.id, email: actor.email, name: actor.name },
      target: {
        id: target.id,
        email: target.email,
        name: target.name,
        role: target.role,
      },
    };
  });
}

// =============================================================================
// LICENSE CONTROL — activate / deactivate / change plan / extend period
// =============================================================================
// These four actions give SUPER_ADMIN full lifecycle control over a trainer's
// subscription license. They are the canonical "activate / deactivate" surface
// pedida por operaciones; the older `extendTrial` and `forceCancelSubscription`
// remain for narrow use cases (trial-only extend, hard cancel from list view).

// -----------------------------------------------------------------------------
// activateSubscription
// -----------------------------------------------------------------------------
// Creates a new ACTIVE subscription if the trainer doesn't have one, or
// reactivates an existing subscription (regardless of prior status: TRIAL,
// PAST_DUE, READ_ONLY, CANCELLED). Sets status=ACTIVE, clears cancelledAt,
// sets currentPeriodStart=now and currentPeriodEnd=now + durationMonths.
// trialEndsAt is cleared (a manually-activated license is not in trial).
// -----------------------------------------------------------------------------

const activateSubscriptionSchema = z.object({
  trainerUserId: z.string().cuid(),
  planTier: z.enum(["SOLO", "PRO", "STUDIO"]),
  durationMonths: z.number().int().min(1).max(36),
  reason: z.string().min(5, "La razón debe tener al menos 5 caracteres."),
});

export async function activateSubscription(input: {
  trainerUserId: string;
  planTier: SubscriptionTier;
  durationMonths: number;
  reason: string;
}): Promise<
  ActionResult<{
    activated: true;
    subscriptionId: string;
    status: SubscriptionStatus;
    currentPeriodEnd: Date;
  }>
> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const { trainerUserId, planTier, durationMonths, reason } =
      activateSubscriptionSchema.parse(input);

    // Verify the user exists AND is a TRAINER. We don't let admins issue a
    // license to a CLIENT or another admin — only trainers can have one.
    const target = await prisma.user.findUnique({
      where: { id: trainerUserId },
      select: { id: true, role: true, email: true },
    });

    if (!target) {
      throw new NotFoundError("USER_NOT_FOUND", "Usuario no encontrado.");
    }

    if (target.role !== "TRAINER") {
      throw new ValidationError(
        "NOT_A_TRAINER",
        "Solo se pueden activar licencias para usuarios con rol TRAINER.",
      );
    }

    const now = new Date();
    const currentPeriodEnd = new Date(now);
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + durationMonths);

    // Upsert: a TrainerSubscription is unique per trainerUserId.
    const sub = await prisma.trainerSubscription.upsert({
      where: { trainerUserId },
      create: {
        trainerUserId,
        planTier,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd,
        trialEndsAt: null,
        cancelledAt: null,
      },
      update: {
        planTier,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd,
        trialEndsAt: null,
        cancelledAt: null,
      },
      select: { id: true, status: true, currentPeriodEnd: true },
    });

    await writeAdminAuditLog(
      actor.id,
      "ACTIVATE_SUBSCRIPTION",
      "TrainerSubscription",
      sub.id,
      {
        trainerUserId,
        planTier,
        durationMonths,
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        reason,
      },
    );

    logInfo("Subscription activated", {
      actorId: actor.id,
      trainerUserId,
      planTier,
      durationMonths,
    });

    return {
      activated: true,
      subscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  });
}

// -----------------------------------------------------------------------------
// deactivateSubscription
// -----------------------------------------------------------------------------
// Soft-disable a license. Two modes:
//   - READ_ONLY  → trainer can still log in and view data but cannot write
//                  (mutations are gated by requireActiveSubscription).
//   - CANCELLED  → hard cancel. Sets cancelledAt = now.
// Distinct from `forceCancelSubscription` which only supports CANCELLED.
// -----------------------------------------------------------------------------

const deactivateSubscriptionSchema = z.object({
  subscriptionId: z.string().cuid(),
  mode: z.enum(["READ_ONLY", "CANCELLED"]),
  reason: z.string().min(5, "La razón debe tener al menos 5 caracteres."),
});

export async function deactivateSubscription(input: {
  subscriptionId: string;
  mode: "READ_ONLY" | "CANCELLED";
  reason: string;
}): Promise<
  ActionResult<{ updated: true; newStatus: SubscriptionStatus }>
> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const { subscriptionId, mode, reason } =
      deactivateSubscriptionSchema.parse(input);

    const sub = await prisma.trainerSubscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, status: true, trainerUserId: true },
    });

    if (!sub) {
      throw new NotFoundError(
        "SUBSCRIPTION_NOT_FOUND",
        "Suscripción no encontrada.",
      );
    }

    if (sub.status === mode) {
      throw new ConflictError(
        "ALREADY_IN_TARGET_STATUS",
        `La suscripción ya está en estado ${mode}.`,
      );
    }

    await prisma.trainerSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: mode,
        // Only stamp cancelledAt when going to CANCELLED. READ_ONLY is recoverable.
        ...(mode === "CANCELLED" ? { cancelledAt: new Date() } : {}),
      },
    });

    await writeAdminAuditLog(
      actor.id,
      "DEACTIVATE_SUBSCRIPTION",
      "TrainerSubscription",
      subscriptionId,
      { mode, reason, trainerUserId: sub.trainerUserId },
    );

    logInfo("Subscription deactivated", {
      actorId: actor.id,
      subscriptionId,
      mode,
      trainerUserId: sub.trainerUserId,
    });

    return { updated: true, newStatus: mode };
  });
}

// -----------------------------------------------------------------------------
// changeSubscriptionPlan
// -----------------------------------------------------------------------------
// Change the planTier (SOLO / PRO / STUDIO) without resetting the period.
// Useful for upgrades / downgrades. Does not modify status.
// -----------------------------------------------------------------------------

const changeSubscriptionPlanSchema = z.object({
  subscriptionId: z.string().cuid(),
  newTier: z.enum(["SOLO", "PRO", "STUDIO"]),
  reason: z.string().min(5, "La razón debe tener al menos 5 caracteres."),
});

export async function changeSubscriptionPlan(input: {
  subscriptionId: string;
  newTier: SubscriptionTier;
  reason: string;
}): Promise<
  ActionResult<{
    updated: true;
    previousTier: SubscriptionTier;
    newTier: SubscriptionTier;
  }>
> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const { subscriptionId, newTier, reason } =
      changeSubscriptionPlanSchema.parse(input);

    const sub = await prisma.trainerSubscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, planTier: true, trainerUserId: true },
    });

    if (!sub) {
      throw new NotFoundError(
        "SUBSCRIPTION_NOT_FOUND",
        "Suscripción no encontrada.",
      );
    }

    if (sub.planTier === newTier) {
      throw new ConflictError(
        "ALREADY_ON_TIER",
        `La suscripción ya está en el plan ${newTier}.`,
      );
    }

    await prisma.trainerSubscription.update({
      where: { id: subscriptionId },
      data: { planTier: newTier },
    });

    await writeAdminAuditLog(
      actor.id,
      "CHANGE_SUBSCRIPTION_PLAN",
      "TrainerSubscription",
      subscriptionId,
      {
        previousTier: sub.planTier,
        newTier,
        reason,
        trainerUserId: sub.trainerUserId,
      },
    );

    logInfo("Subscription plan changed", {
      actorId: actor.id,
      subscriptionId,
      previousTier: sub.planTier,
      newTier,
    });

    return {
      updated: true,
      previousTier: sub.planTier,
      newTier,
    };
  });
}

// -----------------------------------------------------------------------------
// extendSubscriptionPeriod
// -----------------------------------------------------------------------------
// Add N days to currentPeriodEnd. Works on any subscription status (including
// CANCELLED — useful when granting a grace period after a cancellation).
// -----------------------------------------------------------------------------

const extendSubscriptionPeriodSchema = z.object({
  subscriptionId: z.string().cuid(),
  days: z.number().int().min(1).max(365),
});

export async function extendSubscriptionPeriod(input: {
  subscriptionId: string;
  days: number;
}): Promise<
  ActionResult<{ updated: true; newCurrentPeriodEnd: Date }>
> {
  return tryCatch(async () => {
    const actor = await requireSuperAdmin();

    const { subscriptionId, days } =
      extendSubscriptionPeriodSchema.parse(input);

    const sub = await prisma.trainerSubscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, currentPeriodEnd: true, trainerUserId: true },
    });

    if (!sub) {
      throw new NotFoundError(
        "SUBSCRIPTION_NOT_FOUND",
        "Suscripción no encontrada.",
      );
    }

    // Extend from the later of (now, currentPeriodEnd) — avoids back-dating
    // when the current period has already ended.
    const now = new Date();
    const base =
      sub.currentPeriodEnd.getTime() > now.getTime()
        ? sub.currentPeriodEnd
        : now;
    const newCurrentPeriodEnd = new Date(
      base.getTime() + days * 24 * 60 * 60 * 1000,
    );

    await prisma.trainerSubscription.update({
      where: { id: subscriptionId },
      data: { currentPeriodEnd: newCurrentPeriodEnd },
    });

    await writeAdminAuditLog(
      actor.id,
      "EXTEND_SUBSCRIPTION_PERIOD",
      "TrainerSubscription",
      subscriptionId,
      {
        days,
        newCurrentPeriodEnd: newCurrentPeriodEnd.toISOString(),
        trainerUserId: sub.trainerUserId,
      },
    );

    logInfo("Subscription period extended", {
      actorId: actor.id,
      subscriptionId,
      days,
    });

    return { updated: true, newCurrentPeriodEnd };
  });
}
