"use server";
// =============================================================================
// VIZION — Dashboard & Notifications server actions
// Owner: backend-api.
//
// Trainer dashboard aggregates active clients, sessions, pending charges and
// revenue. Notifications are paginated and support read/all-read mutations.
// =============================================================================

import { prisma } from "@/server/db";
import { requireTrainer, requireUser } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { logInfo, logError } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import type { NotificationItem } from "@/types/domain";

// =============================================================================
// Helper types
// =============================================================================

export interface TrainerDashboardData {
  activeClientsCount: number;
  sessionsThisWeek: number;
  pendingChargesCount: number;
  pendingChargesAmountCRC: number;
  revenueThisMonthCRC: number;
  recentActivity: RecentActivityItem[];
}

export interface RecentActivityItem {
  type:
    | "session_completed"
    | "metric_recorded"
    | "charge_created"
    | "charge_paid"
    | "client_joined";
  clientId: string;
  clientName: string;
  occurredAt: Date;
  metadata: Record<string, unknown>;
}

// =============================================================================
// getTrainerDashboard
// =============================================================================

export async function getTrainerDashboard(): Promise<
  ActionResult<TrainerDashboardData>
> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Run all aggregate queries in parallel
    const [
      activeClientsCount,
      sessionsThisWeek,
      pendingCharges,
      paidChargesThisMonth,
      recentSessions,
      recentMetrics,
      recentCharges,
      recentJoins,
    ] = await Promise.all([
      // 1. Active client count
      prisma.trainerClient.count({
        where: { trainerId: trainer.id, status: "ACTIVE" },
      }),

      // 2. Sessions completed this week across all trainer's clients
      prisma.workoutSession.count({
        where: {
          status: "COMPLETED",
          startedAt: { gte: startOfWeek },
          clientUser: {
            asClient: {
              some: { trainerId: trainer.id, status: "ACTIVE" },
            },
          },
        },
      }),

      // 3. Pending charges
      prisma.clientCharge.findMany({
        where: { trainerUserId: trainer.id, status: "PENDING" },
        select: { id: true, amountCRC: true },
      }),

      // 4. Revenue this month (PAID charges)
      prisma.clientCharge.findMany({
        where: {
          trainerUserId: trainer.id,
          status: "PAID",
          paidAt: { gte: startOfMonth, lt: startOfNextMonth },
        },
        select: { amountCRC: true },
      }),

      // 5. Recent completed sessions (for activity feed)
      prisma.workoutSession.findMany({
        where: {
          status: "COMPLETED",
          clientUser: {
            asClient: {
              some: { trainerId: trainer.id, status: "ACTIVE" },
            },
          },
        },
        orderBy: { completedAt: "desc" },
        take: 5,
        select: {
          id: true,
          completedAt: true,
          clientUser: { select: { id: true, name: true } },
        },
      }),

      // 6. Recent body metrics
      prisma.bodyMetric.findMany({
        where: {
          clientUser: {
            asClient: {
              some: { trainerId: trainer.id, status: "ACTIVE" },
            },
          },
        },
        orderBy: { recordedAt: "desc" },
        take: 5,
        select: {
          id: true,
          recordedAt: true,
          clientUser: { select: { id: true, name: true } },
        },
      }),

      // 7. Recent charges
      prisma.clientCharge.findMany({
        where: { trainerUserId: trainer.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          amountCRC: true,
          createdAt: true,
          paidAt: true,
          client: { select: { id: true, name: true } },
        },
      }),

      // 8. Recent client joins (new ACTIVE links)
      prisma.trainerClient.findMany({
        where: { trainerId: trainer.id, status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
        take: 3,
        select: {
          startedAt: true,
          client: { select: { id: true, name: true } },
        },
      }),
    ]);

    const pendingChargesAmountCRC = pendingCharges.reduce(
      (acc, c) => acc + Number(c.amountCRC),
      0,
    );

    const revenueThisMonthCRC = paidChargesThisMonth.reduce(
      (acc, c) => acc + Number(c.amountCRC),
      0,
    );

    // Build a unified activity feed, sorted by date desc, capped at 5
    const activityItems: RecentActivityItem[] = [];

    for (const s of recentSessions) {
      if (s.completedAt) {
        activityItems.push({
          type: "session_completed",
          clientId: s.clientUser.id,
          clientName: s.clientUser.name,
          occurredAt: s.completedAt,
          metadata: { sessionId: s.id },
        });
      }
    }

    for (const m of recentMetrics) {
      activityItems.push({
        type: "metric_recorded",
        clientId: m.clientUser.id,
        clientName: m.clientUser.name,
        occurredAt: m.recordedAt,
        metadata: { metricId: m.id },
      });
    }

    for (const c of recentCharges) {
      activityItems.push({
        type: c.status === "PAID" ? "charge_paid" : "charge_created",
        clientId: c.client.id,
        clientName: c.client.name,
        occurredAt: c.status === "PAID" && c.paidAt ? c.paidAt : c.createdAt,
        metadata: {
          chargeId: c.id,
          amountCRC: Number(c.amountCRC),
          status: c.status,
        },
      });
    }

    for (const j of recentJoins) {
      activityItems.push({
        type: "client_joined",
        clientId: j.client.id,
        clientName: j.client.name,
        occurredAt: j.startedAt,
        metadata: {},
      });
    }

    // Sort descending and take the top 5
    activityItems.sort(
      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
    );
    const recentActivity = activityItems.slice(0, 5);

    return {
      activeClientsCount,
      sessionsThisWeek,
      pendingChargesCount: pendingCharges.length,
      pendingChargesAmountCRC,
      revenueThisMonthCRC,
      recentActivity,
    };
  });
}

// =============================================================================
// getNotifications
// =============================================================================

const NOTIFICATIONS_PAGE_SIZE = 20;

export async function getNotifications(page = 1): Promise<
  ActionResult<{ items: NotificationItem[]; unreadCount: number }>
> {
  return tryCatch(async () => {
    const user = await requireUser();

    const skip = (page - 1) * NOTIFICATIONS_PAGE_SIZE;

    const [items, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where: { userUserId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: NOTIFICATIONS_PAGE_SIZE,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          data: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: { userUserId: user.id, readAt: null },
      }),
    ]);

    return { items, unreadCount };
  });
}

// =============================================================================
// markNotificationRead
// =============================================================================

export async function markNotificationRead(
  notificationId: string,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireUser();

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userUserId: true, readAt: true },
    });

    if (!notification) {
      throw new NotFoundError(
        "NOTIFICATION_NOT_FOUND",
        "Notificación no encontrada.",
      );
    }

    if (notification.userUserId !== user.id) {
      throw new ForbiddenError(
        "NOTIFICATION_NOT_OWNED",
        "No tenés acceso a esta notificación.",
      );
    }

    // Idempotent: no-op if already read
    if (notification.readAt) {
      return { updated: true };
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return { updated: true };
  });
}

// =============================================================================
// markAllNotificationsRead
// =============================================================================

export async function markAllNotificationsRead(): Promise<
  ActionResult<{ updated: true }>
> {
  return tryCatch(async () => {
    const user = await requireUser();

    await prisma.notification.updateMany({
      where: {
        userUserId: user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    logInfo("All notifications marked read", { userId: user.id });

    return { updated: true };
  });
}
