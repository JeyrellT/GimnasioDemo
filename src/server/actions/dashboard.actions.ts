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
import type {
  DashboardFilters,
  DashboardKPIBand,
  DashboardCalendar,
  DashboardCalendarEvent,
  CalendarHeatDay,
  DashboardAggregates,
  DashboardRosterItem,
  DashboardAlert,
  ClientAdherenceData,
  VolumeByMuscleData,
} from "@/types/dashboard";

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

// =============================================================================
// Shared helpers
// =============================================================================

function heatIntensity(count: number): CalendarHeatDay["intensity"] {
  if (count === 0) return "none";
  if (count === 1) return "low";
  if (count <= 3) return "medium";
  return "high";
}

/** Deterministic alert id: avoids duplicates across re-renders. */
function alertId(clientId: string, trigger: string): string {
  return `alert-${trigger}-${clientId}`;
}

// =============================================================================
// getDashboardKPIs
// =============================================================================

export async function getDashboardKPIs(
  _filters: DashboardFilters,
): Promise<ActionResult<DashboardKPIBand>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const prevWeekStart = new Date(startOfWeek);
    prevWeekStart.setDate(startOfWeek.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const fourteenDaysLater = new Date(now);
    fourteenDaysLater.setDate(now.getDate() + 14);

    // Active clients
    const activeLinks = await prisma.trainerClient.findMany({
      where: { trainerId: trainer.id, status: "ACTIVE" },
      select: { clientId: true },
    });
    const activeClientIds = activeLinks.map((l) => l.clientId);
    const activeClientsCount = activeClientIds.length;

    // Sessions this week and last week (across all active clients)
    const [sessionsThisWeek, sessionsLastWeek] = await Promise.all([
      prisma.workoutSession.count({
        where: {
          status: "COMPLETED",
          startedAt: { gte: startOfWeek },
          clientUserId: { in: activeClientIds },
        },
      }),
      prisma.workoutSession.count({
        where: {
          status: "COMPLETED",
          startedAt: { gte: prevWeekStart, lt: startOfWeek },
          clientUserId: { in: activeClientIds },
        },
      }),
    ]);

    // Routines ending in next 14 days
    const routinesEnding14d = await prisma.assignedRoutine.count({
      where: {
        status: "ACTIVE",
        clientUserId: { in: activeClientIds },
        endsOn: { gte: now, lte: fourteenDaysLater },
      },
    });

    // Group adherence: sessions last 30 days vs expected from routine.splitDays
    const assignedRoutines = await prisma.assignedRoutine.findMany({
      where: {
        status: "ACTIVE",
        clientUserId: { in: activeClientIds },
      },
      select: {
        clientUserId: true,
        routineTemplate: { select: { splitDays: true } },
      },
    });

    let totalAdherence = 0;
    let adherenceCount = 0;

    if (assignedRoutines.length > 0) {
      const clientsWithRoutine = assignedRoutines.map((ar) => ar.clientUserId);
      const sessions30d = await prisma.workoutSession.groupBy({
        by: ["clientUserId"],
        where: {
          status: "COMPLETED",
          startedAt: { gte: thirtyDaysAgo },
          clientUserId: { in: clientsWithRoutine },
        },
        _count: { id: true },
      });
      const sessionCountByClient = new Map(
        sessions30d.map((s) => [s.clientUserId, s._count.id]),
      );

      for (const ar of assignedRoutines) {
        const completed = sessionCountByClient.get(ar.clientUserId) ?? 0;
        const expected = ar.routineTemplate.splitDays * (30 / 7);
        const pct = Math.min(
          Math.round((completed / Math.max(expected, 1)) * 100),
          100,
        );
        totalAdherence += pct;
        adherenceCount++;
      }
    }

    const avgAdherence =
      adherenceCount > 0 ? Math.round(totalAdherence / adherenceCount) : 0;

    // Alert count: PAR-Q RED/REVIEW + no session in 14 days
    const clientProfiles = await prisma.clientProfile.findMany({
      where: { userId: { in: activeClientIds } },
      select: { userId: true, parqStatus: true },
    });

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const lastSessionByClient = await prisma.workoutSession.groupBy({
      by: ["clientUserId"],
      where: {
        status: "COMPLETED",
        clientUserId: { in: activeClientIds },
      },
      _max: { startedAt: true },
    });
    const lastSessionMap = new Map(
      lastSessionByClient.map((s) => [s.clientUserId, s._max.startedAt]),
    );

    let alertCount = 0;
    for (const profile of clientProfiles) {
      if (profile.parqStatus === "RED" || profile.parqStatus === "REVIEW") {
        alertCount++;
      }
      const last = lastSessionMap.get(profile.userId);
      if (!last || last < fourteenDaysAgo) {
        alertCount++;
      }
    }

    // 7-week sparkline for sessions
    const weeklySparkline: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const weekS = new Date(now);
      weekS.setDate(now.getDate() - i * 7 - 7);
      weekS.setHours(0, 0, 0, 0);
      const weekE = new Date(now);
      weekE.setDate(now.getDate() - i * 7);
      weekE.setHours(23, 59, 59, 999);
      // eslint-disable-next-line no-await-in-loop
      const count = await prisma.workoutSession.count({
        where: {
          status: "COMPLETED",
          startedAt: { gte: weekS, lte: weekE },
          clientUserId: { in: activeClientIds },
        },
      });
      weeklySparkline.push(count);
    }

    const kpis: DashboardKPIBand = {
      activeClients: {
        label: "Clientes activos",
        value: activeClientsCount,
        unit: "",
        delta: 0,
        deltaLabel: null,
        sparklineData: Array.from({ length: 7 }, () => activeClientsCount),
        goalAlignment: "good",
      },
      groupAdherence: {
        label: "Adherencia grupal",
        value: avgAdherence,
        unit: "%",
        delta: null,
        deltaLabel: null,
        sparklineData: weeklySparkline,
        goalAlignment:
          avgAdherence >= 70
            ? "good"
            : avgAdherence >= 50
              ? "neutral"
              : "bad",
      },
      sessionsThisWeek: {
        label: "Sesiones esta semana",
        value: sessionsThisWeek,
        unit: "",
        delta: sessionsThisWeek - sessionsLastWeek,
        deltaLabel: "vs semana pasada",
        sparklineData: weeklySparkline,
        goalAlignment: sessionsThisWeek >= sessionsLastWeek ? "good" : "neutral",
      },
      routinesEnding14d: {
        label: "Rutinas por vencer",
        value: routinesEnding14d,
        unit: "",
        delta: null,
        deltaLabel: null,
        sparklineData: [],
        goalAlignment: routinesEnding14d > 0 ? "neutral" : "good",
      },
      openAlerts: {
        label: "Alertas abiertas",
        value: alertCount,
        unit: "",
        delta: null,
        deltaLabel: null,
        sparklineData: [],
        goalAlignment:
          alertCount === 0 ? "good" : alertCount > 3 ? "bad" : "neutral",
      },
    };

    return kpis;
  });
}

// =============================================================================
// getDashboardCalendarEvents
// =============================================================================

export async function getDashboardCalendarEvents(): Promise<
  ActionResult<DashboardCalendar>
> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const past7 = new Date(today);
    past7.setDate(today.getDate() - 7);
    const future7 = new Date(today);
    future7.setDate(today.getDate() + 7);
    future7.setHours(23, 59, 59, 999);

    const activeLinks = await prisma.trainerClient.findMany({
      where: { trainerId: trainer.id, status: "ACTIVE" },
      select: { clientId: true },
    });
    const activeClientIds = activeLinks.map((l) => l.clientId);

    // Fetch completed sessions in past 7 days and routine endings in next 7 days
    const [recentSessions, endingRoutines] = await Promise.all([
      prisma.workoutSession.findMany({
        where: {
          status: "COMPLETED",
          clientUserId: { in: activeClientIds },
          completedAt: { gte: past7, lte: today },
        },
        select: {
          id: true,
          completedAt: true,
          clientUserId: true,
          clientUser: { select: { name: true } },
        },
        orderBy: { completedAt: "asc" },
      }),
      prisma.assignedRoutine.findMany({
        where: {
          status: "ACTIVE",
          clientUserId: { in: activeClientIds },
          endsOn: { gte: today, lte: future7 },
        },
        select: {
          id: true,
          endsOn: true,
          clientUserId: true,
          clientUser: { select: { name: true } },
          routineTemplate: { select: { name: true } },
        },
      }),
    ]);

    const sessionEvents: DashboardCalendarEvent[] = recentSessions
      .filter((s) => s.completedAt !== null)
      .map((s): DashboardCalendarEvent => {
        const dateStr = s.completedAt!.toISOString().slice(0, 10);
        return {
          id: s.id,
          type: "session_completed",
          clientId: s.clientUserId,
          clientName: s.clientUser.name,
          date: dateStr,
          title: `${s.clientUser.name} completó sesión`,
          time: s.completedAt!.toISOString().slice(11, 16),
        };
      });

    const routineEvents: DashboardCalendarEvent[] = endingRoutines
      .filter((ar) => ar.endsOn !== null)
      .map((ar): DashboardCalendarEvent => ({
        id: ar.id,
        type: "routine_ending",
        clientId: ar.clientUserId,
        clientName: ar.clientUser.name,
        date: ar.endsOn!.toISOString().slice(0, 10),
        title: `${ar.clientUser.name}: "${ar.routineTemplate.name}" vence`,
      }));

    const allEvents: DashboardCalendarEvent[] = [
      ...sessionEvents,
      ...routineEvents,
    ];
    allEvents.sort((a, b) => a.date.localeCompare(b.date));

    // Heatmap: 14 days starting from today
    const eventsByDate = new Map<string, number>();
    for (const e of allEvents) {
      eventsByDate.set(e.date, (eventsByDate.get(e.date) ?? 0) + 1);
    }

    const heatmap: CalendarHeatDay[] = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = eventsByDate.get(dateStr) ?? 0;
      return { date: dateStr, eventCount: count, intensity: heatIntensity(count) };
    });

    return { heatmap, events: allEvents };
  });
}

// =============================================================================
// getDashboardRoster
// =============================================================================

export async function getDashboardRoster(
  _filters: DashboardFilters,
): Promise<ActionResult<DashboardRosterItem[]>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);

    const activeLinks = await prisma.trainerClient.findMany({
      where: { trainerId: trainer.id, status: "ACTIVE" },
      select: {
        clientId: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            clientProfile: { select: { parqStatus: true, goal: true } },
          },
        },
      },
    });

    if (activeLinks.length === 0) return [];

    const activeClientIds = activeLinks.map((l) => l.clientId);

    // Fetch active routines and last session per client in parallel
    const [activeRoutines, lastSessionRows, sessions7dRows] = await Promise.all([
      prisma.assignedRoutine.findMany({
        where: {
          status: "ACTIVE",
          clientUserId: { in: activeClientIds },
        },
        select: {
          clientUserId: true,
          endsOn: true,
          routineTemplate: { select: { name: true, splitDays: true } },
        },
      }),
      prisma.workoutSession.groupBy({
        by: ["clientUserId"],
        where: {
          status: "COMPLETED",
          clientUserId: { in: activeClientIds },
        },
        _max: { completedAt: true },
      }),
      prisma.workoutSession.groupBy({
        by: ["clientUserId"],
        where: {
          status: "COMPLETED",
          startedAt: { gte: sevenDaysAgo },
          clientUserId: { in: activeClientIds },
        },
        _count: { id: true },
      }),
    ]);

    const routineByClient = new Map(
      activeRoutines.map((ar) => [ar.clientUserId, ar]),
    );
    const lastSessionByClient = new Map(
      lastSessionRows.map((r) => [r.clientUserId, r._max.completedAt]),
    );
    const sessions7dByClient = new Map(
      sessions7dRows.map((r) => [r.clientUserId, r._count.id]),
    );

    const roster: DashboardRosterItem[] = activeLinks.map((link) => {
      const client = link.client;
      const profile = client.clientProfile;
      const ar = routineByClient.get(client.id);
      const lastSessionAt = lastSessionByClient.get(client.id) ?? null;
      const sessions7d = sessions7dByClient.get(client.id) ?? 0;

      const adherencePct7d =
        ar && ar.routineTemplate.splitDays > 0
          ? Math.min(
              Math.round((sessions7d / ar.routineTemplate.splitDays) * 100),
              100,
            )
          : null;

      // Alert count
      let alertCount = 0;
      const parqStatus = profile?.parqStatus ?? "NOT_COMPLETED";
      if (parqStatus === "RED" || parqStatus === "REVIEW") alertCount++;
      if (!lastSessionAt || lastSessionAt < fourteenDaysAgo) alertCount++;
      if (ar?.endsOn && ar.endsOn <= sevenDaysLater) alertCount++;

      return {
        clientId: client.id,
        name: client.name,
        email: client.email,
        avatarUrl: client.avatarUrl,
        adherencePct7d,
        lastSessionAt: lastSessionAt?.toISOString() ?? null,
        parqStatus: parqStatus as DashboardRosterItem["parqStatus"],
        goal: (profile?.goal ?? null) as DashboardRosterItem["goal"],
        alertCount,
        activeRoutineName: ar?.routineTemplate.name ?? null,
      };
    });

    return roster;
  });
}

// =============================================================================
// getDashboardAggregates
// =============================================================================

export async function getDashboardAggregates(
  filters: DashboardFilters,
): Promise<ActionResult<DashboardAggregates>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const activeLinks = await prisma.trainerClient.findMany({
      where: { trainerId: trainer.id, status: "ACTIVE" },
      select: { clientId: true },
    });

    if (activeLinks.length === 0) {
      return {
        adherenceChart: { data: [] },
        weightTrend: { data: [], metric: "weight" },
        volumeByMuscle: { data: [] },
      };
    }

    const activeClientIds = activeLinks.map((l) => l.clientId);
    const { fromDate, toDate } = filters;

    const windowDays = Math.max(
      1,
      Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000),
    );
    const windowWeeks = windowDays / 7;

    // --- Adherence chart ---
    const [sessionCountRows, assignedRoutines, clientNames] = await Promise.all([
      prisma.workoutSession.groupBy({
        by: ["clientUserId"],
        where: {
          status: "COMPLETED",
          startedAt: { gte: fromDate, lte: toDate },
          clientUserId: { in: activeClientIds },
        },
        _count: { id: true },
      }),
      prisma.assignedRoutine.findMany({
        where: {
          status: "ACTIVE",
          clientUserId: { in: activeClientIds },
        },
        select: {
          clientUserId: true,
          routineTemplate: { select: { splitDays: true } },
        },
      }),
      prisma.user.findMany({
        where: { id: { in: activeClientIds } },
        select: { id: true, name: true },
      }),
    ]);

    const sessionCountByClient = new Map(
      sessionCountRows.map((r) => [r.clientUserId, r._count.id]),
    );
    const routineByClient = new Map(
      assignedRoutines.map((ar) => [ar.clientUserId, ar]),
    );
    const nameByClient = new Map(clientNames.map((u) => [u.id, u.name]));

    const adherenceChartData: ClientAdherenceData[] = activeClientIds.map(
      (clientId) => {
        const completed = sessionCountByClient.get(clientId) ?? 0;
        const ar = routineByClient.get(clientId);
        const splitDays = ar?.routineTemplate.splitDays ?? 3;
        const expected = Math.max(1, Math.floor(splitDays * windowWeeks));
        const adherencePct = Math.min(
          Math.round((completed / expected) * 100),
          100,
        );
        return {
          clientId,
          clientName: nameByClient.get(clientId) ?? clientId,
          adherencePct,
          sessionsCompleted: completed,
          sessionsExpected: expected,
        };
      },
    );
    adherenceChartData.sort((a, b) => b.adherencePct - a.adherencePct);

    // --- Weight trend (weekly avg / p25 / p75) ---
    const bodyMetrics = await prisma.bodyMetric.findMany({
      where: {
        clientUserId: { in: activeClientIds },
        recordedAt: { gte: fromDate, lte: toDate },
        weightKg: { not: null },
        deletedAt: null,
      },
      select: { clientUserId: true, recordedAt: true, weightKg: true },
    });

    const weekMap = new Map<string, { weights: number[]; clientIds: Set<string> }>();
    for (const m of bodyMetrics) {
      const d = new Date(m.recordedAt);
      d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // Sunday of that week
      const key = d.toISOString().slice(0, 10);
      const bucket = weekMap.get(key) ?? { weights: [], clientIds: new Set() };
      bucket.weights.push(Number(m.weightKg));
      bucket.clientIds.add(m.clientUserId);
      weekMap.set(key, bucket);
    }

    const weightTrendData = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, { weights, clientIds }]) => {
        const sorted = [...weights].sort((a, b) => a - b);
        const avg = weights.reduce((s, v) => s + v, 0) / weights.length;
        const p25 = sorted[Math.floor(sorted.length * 0.25)] ?? avg;
        const p75 = sorted[Math.floor(sorted.length * 0.75)] ?? avg;
        return {
          weekStart,
          avgKg: Math.round(avg * 10) / 10,
          p25Kg: Math.round(p25 * 10) / 10,
          p75Kg: Math.round(p75 * 10) / 10,
          clientCount: clientIds.size,
        };
      });

    // --- Volume by muscle ---
    const performedSets = await prisma.performedSet.findMany({
      where: {
        session: {
          status: "COMPLETED",
          startedAt: { gte: fromDate, lte: toDate },
          clientUserId: { in: activeClientIds },
          deletedAt: null,
        },
        deletedAt: null,
      },
      select: {
        exerciseId: true,
        weightKg: true,
        reps: true,
        exercise: { select: { primaryMuscle: true } },
      },
    });

    type MuscleBucket = {
      totalSets: number;
      totalVolumeKg: number;
      exerciseIds: Set<string>;
    };
    const muscleMap = new Map<string, MuscleBucket>();

    for (const set of performedSets) {
      const muscle = set.exercise.primaryMuscle;
      const bucket = muscleMap.get(muscle) ?? {
        totalSets: 0,
        totalVolumeKg: 0,
        exerciseIds: new Set(),
      };
      bucket.totalSets++;
      bucket.exerciseIds.add(set.exerciseId);
      if (set.weightKg !== null && set.reps !== null) {
        bucket.totalVolumeKg += Number(set.weightKg) * set.reps;
      }
      muscleMap.set(muscle, bucket);
    }

    const volumeByMuscleData: VolumeByMuscleData[] = Array.from(
      muscleMap.entries(),
    ).map(([muscle, bucket]) => ({
      muscle: muscle as VolumeByMuscleData["muscle"],
      totalSets: bucket.totalSets,
      totalVolumeKg: Math.round(bucket.totalVolumeKg * 10) / 10,
      exerciseCount: bucket.exerciseIds.size,
    }));

    return {
      adherenceChart: { data: adherenceChartData.slice(0, 10) },
      weightTrend: { data: weightTrendData, metric: "weight" },
      volumeByMuscle: { data: volumeByMuscleData },
    };
  });
}

// =============================================================================
// getDashboardAlerts
// =============================================================================

export async function getDashboardAlerts(): Promise<
  ActionResult<DashboardAlert[]>
> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const now = new Date();
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);
    sevenDaysLater.setHours(23, 59, 59, 999);

    const activeLinks = await prisma.trainerClient.findMany({
      where: { trainerId: trainer.id, status: "ACTIVE" },
      select: {
        clientId: true,
        client: {
          select: {
            id: true,
            name: true,
            clientProfile: { select: { parqStatus: true } },
          },
        },
      },
    });

    if (activeLinks.length === 0) return [];

    const activeClientIds = activeLinks.map((l) => l.clientId);

    // Fetch last session, active routines, and last metric per client in parallel
    const [lastSessionRows, activeRoutines, lastMetricRows] = await Promise.all([
      prisma.workoutSession.groupBy({
        by: ["clientUserId"],
        where: {
          status: "COMPLETED",
          clientUserId: { in: activeClientIds },
        },
        _max: { completedAt: true },
      }),
      prisma.assignedRoutine.findMany({
        where: {
          status: "ACTIVE",
          clientUserId: { in: activeClientIds },
        },
        select: {
          clientUserId: true,
          endsOn: true,
        },
      }),
      prisma.bodyMetric.groupBy({
        by: ["clientUserId"],
        where: {
          clientUserId: { in: activeClientIds },
          deletedAt: null,
        },
        _max: { recordedAt: true },
      }),
    ]);

    const lastSessionMap = new Map(
      lastSessionRows.map((r) => [r.clientUserId, r._max.completedAt]),
    );
    const activeRoutineMap = new Map(
      activeRoutines.map((ar) => [ar.clientUserId, ar]),
    );
    const lastMetricMap = new Map(
      lastMetricRows.map((r) => [r.clientUserId, r._max.recordedAt]),
    );

    const alerts: DashboardAlert[] = [];

    for (const link of activeLinks) {
      const client = link.client;
      const parqStatus = client.clientProfile?.parqStatus ?? "NOT_COMPLETED";
      const clientUrl = `/trainer/clientes/${client.id}`;

      // PAR-Q RED
      if (parqStatus === "RED") {
        alerts.push({
          id: alertId(client.id, "parq_red"),
          clientId: client.id,
          clientName: client.name,
          severity: "critical",
          trigger: "parq_red",
          message: `${client.name} tiene PAR-Q en rojo. Requerí liberación médica antes de continuar.`,
          actionUrl: clientUrl,
        });
      }

      // PAR-Q REVIEW
      if (parqStatus === "REVIEW") {
        alerts.push({
          id: alertId(client.id, "parq_review"),
          clientId: client.id,
          clientName: client.name,
          severity: "warning",
          trigger: "parq_review",
          message: `${client.name} tiene PAR-Q en revisión. Consultá con un médico.`,
          actionUrl: clientUrl,
        });
      }

      // No session in 14 days
      const lastSession = lastSessionMap.get(client.id);
      if (!lastSession || lastSession < fourteenDaysAgo) {
        alerts.push({
          id: alertId(client.id, "no_session_14d"),
          clientId: client.id,
          clientName: client.name,
          severity: "warning",
          trigger: "no_session_14d",
          message: `${client.name} no ha entrenado en más de 14 días. Contactalo.`,
          actionUrl: clientUrl,
        });
      }

      // Routine ending in 7 days
      const ar = activeRoutineMap.get(client.id);
      if (ar?.endsOn && ar.endsOn <= sevenDaysLater) {
        alerts.push({
          id: alertId(client.id, "routine_ending_7d"),
          clientId: client.id,
          clientName: client.name,
          severity: "info",
          trigger: "routine_ending_7d",
          message: `La rutina de ${client.name} vence el ${ar.endsOn.toISOString().slice(0, 10)}. Asigná una nueva.`,
          actionUrl: clientUrl,
        });
      }

      // No measurement in 30 days
      const lastMetric = lastMetricMap.get(client.id);
      if (!lastMetric || lastMetric < thirtyDaysAgo) {
        alerts.push({
          id: alertId(client.id, "no_measurement_30d"),
          clientId: client.id,
          clientName: client.name,
          severity: "info",
          trigger: "no_measurement_30d",
          message: `${client.name} no tiene medidas corporales en los últimos 30 días.`,
          actionUrl: clientUrl,
        });
      }
    }

    const severityOrder: Record<DashboardAlert["severity"], number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    alerts.sort(
      (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
    );

    return alerts;
  });
}
