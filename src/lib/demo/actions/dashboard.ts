// =============================================================================
// BLACKLINE FITNESS — Demo actions: trainer dashboard
// Mirrors all signatures from src/app/actions/trainer-dashboard.ts
// =============================================================================

import { db } from "@/lib/offline/db";
import { tryCatch } from "@/lib/result";
import { DEMO_TRAINER_ID } from "../seed-data";
import * as store from "../store";
import type { ActionResult } from "@/types/api";
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

// ── helpers ───────────────────────────────────────────────────────────────────

function toDateStr(iso: string): string { return iso.slice(0, 10); }

function heatIntensity(count: number): CalendarHeatDay["intensity"] {
  if (count === 0) return "none";
  if (count === 1) return "low";
  if (count <= 3) return "medium";
  return "high";
}

// ── getDashboardKPIs ──────────────────────────────────────────────────────────

export async function getDashboardKPIs(
  _filters: DashboardFilters,
): Promise<ActionResult<DashboardKPIBand>> {
  return tryCatch(async () => {
    const links = await db.demoTrainerClients
      .where({ trainerUserId: DEMO_TRAINER_ID, status: "ACTIVE" })
      .toArray();

    const today = new Date("2026-05-15T00:00:00Z");
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);
    const now = today.toISOString();
    const weekStartIso = weekStart.toISOString();
    const prevWeekStartIso = prevWeekStart.toISOString();

    const allSessions = await db.demoSessions.toArray();
    const completedSessions = allSessions.filter((s) => s.status === "COMPLETED" && s.completedAt);

    const sessionsThisWeek = completedSessions.filter(
      (s) => s.completedAt! >= weekStartIso && s.completedAt! <= now,
    ).length;

    const sessionsLastWeek = completedSessions.filter(
      (s) => s.completedAt! >= prevWeekStartIso && s.completedAt! < weekStartIso,
    ).length;

    // Routines ending in next 14 days
    const assigned = await db.demoAssignedRoutines.where({ status: "ACTIVE" }).toArray();
    const fourteenDaysLater = new Date(today);
    fourteenDaysLater.setDate(today.getDate() + 14);
    const routinesEnding14d = assigned.filter((ar) => {
      if (!ar.endsOn) return false;
      const end = new Date(ar.endsOn);
      return end >= today && end <= fourteenDaysLater;
    }).length;

    // Compute adherence across clients with active routines
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    let totalAdherence = 0;
    let adherenceCount = 0;

    for (const link of links) {
      const clientAssigned = assigned.find((ar) => ar.clientUserId === link.clientUserId);
      if (!clientAssigned) continue;
      const routine = await store.getRoutine(clientAssigned.routineTemplateId);
      if (!routine) continue;

      const clientSessions = completedSessions.filter(
        (s) => s.clientUserId === link.clientUserId && s.completedAt! >= thirtyDaysAgoIso,
      ).length;
      const expected = routine.splitDays * (30 / 7);
      const pct = Math.min(Math.round((clientSessions / Math.max(expected, 1)) * 100), 100);
      totalAdherence += pct;
      adherenceCount++;
    }

    const avgAdherence = adherenceCount > 0 ? Math.round(totalAdherence / adherenceCount) : 0;

    // Alerts — PAR-Q reviews + no sessions > 14d
    let alertCount = 0;
    const clients = await db.demoClients.toArray();
    for (const c of clients) {
      if (c.parqStatus === "RED" || c.parqStatus === "REVIEW") alertCount++;
      const lastSession = completedSessions
        .filter((s) => s.clientUserId === c.id && s.completedAt)
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];
      if (!lastSession) { alertCount++; continue; }
      const daysSinceSession = Math.floor(
        (today.getTime() - new Date(lastSession.completedAt!).getTime()) / 86400000,
      );
      if (daysSinceSession > 14) alertCount++;
    }

    // Sparklines — last 7 weekly session counts
    const weeklySparkline: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const weekS = new Date(today);
      weekS.setDate(today.getDate() - i * 7 - 7);
      const weekE = new Date(today);
      weekE.setDate(today.getDate() - i * 7);
      weeklySparkline.push(
        completedSessions.filter((s) => s.completedAt! >= weekS.toISOString() && s.completedAt! <= weekE.toISOString()).length,
      );
    }

    const kpis: DashboardKPIBand = {
      activeClients: {
        label: "Clientes activos",
        value: links.length,
        unit: "",
        delta: 0,
        deltaLabel: null,
        sparklineData: Array.from({ length: 7 }, () => links.length),
        goalAlignment: "good",
      },
      groupAdherence: {
        label: "Adherencia grupal",
        value: avgAdherence,
        unit: "%",
        delta: null,
        deltaLabel: null,
        sparklineData: weeklySparkline,
        goalAlignment: avgAdherence >= 70 ? "good" : avgAdherence >= 50 ? "neutral" : "bad",
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
        goalAlignment: alertCount === 0 ? "good" : alertCount > 3 ? "bad" : "neutral",
      },
    };

    return kpis;
  });
}

// ── getDashboardCalendarEvents ────────────────────────────────────────────────

export async function getDashboardCalendarEvents(): Promise<ActionResult<DashboardCalendar>> {
  return tryCatch(async () => {
    const today = new Date("2026-05-15T00:00:00Z");
    const past7 = new Date(today);
    past7.setDate(today.getDate() - 7);
    const future7 = new Date(today);
    future7.setDate(today.getDate() + 7);

    const clients = await db.demoClients.toArray();
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));

    const completedSessions = await db.demoSessions
      .where({ status: "COMPLETED" })
      .toArray();

    const recentSessions = completedSessions.filter(
      (s) => s.completedAt && s.completedAt >= past7.toISOString() && s.completedAt <= today.toISOString(),
    );

    const assigned = await db.demoAssignedRoutines.where({ status: "ACTIVE" }).toArray();
    const endingRoutines = assigned.filter((ar) => {
      if (!ar.endsOn) return false;
      const end = new Date(ar.endsOn);
      return end >= today && end <= future7;
    });

    const sessionEvents: DashboardCalendarEvent[] = recentSessions.map((s): DashboardCalendarEvent => ({
      id: s.id,
      type: "session_completed",
      clientId: s.clientUserId,
      clientName: clientMap.get(s.clientUserId) ?? s.clientUserId,
      date: toDateStr(s.completedAt!),
      title: `${clientMap.get(s.clientUserId) ?? s.clientUserId} completó sesión`,
      time: s.completedAt!.slice(11, 16),
    }));

    const routineEvents: DashboardCalendarEvent[] = await Promise.all(
      endingRoutines.map(async (ar): Promise<DashboardCalendarEvent> => {
        const routine = await store.getRoutine(ar.routineTemplateId);
        return {
          id: ar.id,
          type: "routine_ending",
          clientId: ar.clientUserId,
          clientName: clientMap.get(ar.clientUserId) ?? ar.clientUserId,
          date: toDateStr(ar.endsOn!),
          title: `${clientMap.get(ar.clientUserId) ?? ar.clientUserId}: "${routine?.name ?? "rutina"}" vence`,
        };
      }),
    );

    const resolvedEvents: DashboardCalendarEvent[] = [...sessionEvents, ...routineEvents];

    resolvedEvents.sort((a, b) => a.date.localeCompare(b.date));

    const eventsByDate = new Map<string, number>();
    for (const e of resolvedEvents) {
      eventsByDate.set(e.date, (eventsByDate.get(e.date) ?? 0) + 1);
    }

    const heatmap: CalendarHeatDay[] = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = toDateStr(d.toISOString());
      const count = eventsByDate.get(dateStr) ?? 0;
      return { date: dateStr, eventCount: count, intensity: heatIntensity(count) };
    });

    return { heatmap, events: resolvedEvents };
  });
}

// ── getDashboardRoster ────────────────────────────────────────────────────────

export async function getDashboardRoster(
  _filters: DashboardFilters,
): Promise<ActionResult<DashboardRosterItem[]>> {
  return tryCatch(async () => {
    const links = await db.demoTrainerClients
      .where({ trainerUserId: DEMO_TRAINER_ID, status: "ACTIVE" })
      .toArray();

    const today = new Date("2026-05-15T00:00:00Z").toISOString();
    const sevenDaysAgo = new Date("2026-05-08T00:00:00Z").toISOString();
    const fourteenDaysAgo = new Date("2026-05-01T00:00:00Z").toISOString();

    const rosterRaw = await Promise.all(
      links.map(async (link) => {
        const client = await db.demoClients.get(link.clientUserId);
        if (!client) return null;

        const sessions = await store.listSessionsForClient(link.clientUserId);
        const completedSessions = sessions.filter((s) => s.status === "COMPLETED" && s.completedAt);

        const lastSession = completedSessions
          .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];

        const sessions7d = completedSessions.filter(
          (s) => s.completedAt! >= sevenDaysAgo && s.completedAt! <= today,
        ).length;

        const assigned = await store.getActiveAssignedRoutine(link.clientUserId);
        const routine = assigned ? await store.getRoutine(assigned.routineTemplateId) : null;
        const adherencePct7d = routine && routine.splitDays > 0
          ? Math.min(Math.round((sessions7d / routine.splitDays) * 100), 100)
          : null;

        // Alert count
        let alertCount = 0;
        if (client.parqStatus === "RED" || client.parqStatus === "REVIEW") alertCount++;
        if (!lastSession || lastSession.completedAt! < fourteenDaysAgo) alertCount++;
        if (assigned?.endsOn && new Date(assigned.endsOn) <= new Date("2026-05-14T00:00:00Z")) alertCount++;

        return {
          clientId: client.id,
          name: client.name,
          email: client.email,
          avatarUrl: client.avatarUrl,
          adherencePct7d,
          lastSessionAt: lastSession?.completedAt ?? null,
          parqStatus: client.parqStatus as DashboardRosterItem["parqStatus"],
          goal: client.goal as DashboardRosterItem["goal"],
          alertCount,
          activeRoutineName: routine?.name ?? null,
        };
      }),
    );

    return rosterRaw.filter((r): r is DashboardRosterItem => r !== null);
  });
}

// ── getDashboardAggregates ────────────────────────────────────────────────────

export async function getDashboardAggregates(
  filters: DashboardFilters,
): Promise<ActionResult<DashboardAggregates>> {
  return tryCatch(async () => {
    const links = await db.demoTrainerClients
      .where({ trainerUserId: DEMO_TRAINER_ID, status: "ACTIVE" })
      .toArray();

    const fromIso = filters.fromDate.toISOString();
    const toIso = filters.toDate.toISOString();

    // Adherence chart
    const adherenceChartData: ClientAdherenceData[] = await Promise.all(
      links.map(async (link) => {
        const client = await db.demoClients.get(link.clientUserId);
        const sessions = await store.listSessionsForClient(link.clientUserId);
        const completed = sessions.filter(
          (s) => s.status === "COMPLETED" && s.completedAt && s.completedAt >= fromIso && s.completedAt <= toIso,
        ).length;

        const assigned = await store.getActiveAssignedRoutine(link.clientUserId);
        const routine = assigned ? await store.getRoutine(assigned.routineTemplateId) : null;
        const windowDays = Math.max(1, Math.floor((filters.toDate.getTime() - filters.fromDate.getTime()) / 86400000));
        const windowWeeks = windowDays / 7;
        const expected = Math.max(1, Math.floor((routine?.splitDays ?? 3) * windowWeeks));
        const adherencePct = Math.min(Math.round((completed / expected) * 100), 100);

        return {
          clientId: link.clientUserId,
          clientName: client?.name ?? link.clientUserId,
          adherencePct,
          sessionsCompleted: completed,
          sessionsExpected: expected,
        };
      }),
    );

    adherenceChartData.sort((a, b) => b.adherencePct - a.adherencePct);

    // Weight trend — from demo metrics
    const allMetrics = await db.demoMetrics.toArray();
    const metricsInWindow = allMetrics.filter((m) => m.recordedAt >= fromIso && m.recordedAt <= toIso && m.weightKg != null);

    const weekMap = new Map<string, number[]>();
    for (const m of metricsInWindow) {
      const d = new Date(m.recordedAt);
      d.setUTCDate(d.getUTCDate() - d.getUTCDay());
      const key = d.toISOString().slice(0, 10);
      const arr = weekMap.get(key) ?? [];
      arr.push(m.weightKg!);
      weekMap.set(key, arr);
    }

    const weightTrendData = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, weights]) => {
        const sorted = [...weights].sort((a, b) => a - b);
        const avg = weights.reduce((s, v) => s + v, 0) / weights.length;
        const p25 = sorted[Math.floor(sorted.length * 0.25)] ?? avg;
        const p75 = sorted[Math.floor(sorted.length * 0.75)] ?? avg;
        return {
          weekStart,
          avgKg: Math.round(avg * 10) / 10,
          p25Kg: Math.round(p25 * 10) / 10,
          p75Kg: Math.round(p75 * 10) / 10,
          clientCount: new Set(metricsInWindow.filter((m) => {
            const d = new Date(m.recordedAt);
            d.setUTCDate(d.getUTCDate() - d.getUTCDay());
            return d.toISOString().slice(0, 10) === weekStart;
          }).map((m) => m.clientUserId)).size,
        };
      });

    // Volume by muscle — from demo sessions
    const allSessions = await db.demoSessions.toArray();
    const sessionsInWindow = allSessions.filter(
      (s) => s.status === "COMPLETED" && s.completedAt && s.completedAt >= fromIso && s.completedAt <= toIso,
    );

    const muscleMap = new Map<string, { totalSets: number; totalVolumeKg: number; exerciseSet: Set<string> }>();
    const exercises = await db.demoExercises.toArray();
    const exMap = new Map(exercises.map((ex) => [ex.id, ex]));

    for (const session of sessionsInWindow) {
      for (const set of session.setsJson) {
        const ex = exMap.get(set.exerciseId);
        if (!ex) continue;
        const muscle = ex.primaryMuscle;
        let bucket = muscleMap.get(muscle);
        if (!bucket) {
          bucket = { totalSets: 0, totalVolumeKg: 0, exerciseSet: new Set() };
          muscleMap.set(muscle, bucket);
        }
        bucket.totalSets++;
        bucket.exerciseSet.add(set.exerciseId);
        if (set.weightKg != null && set.reps != null) {
          bucket.totalVolumeKg += set.weightKg * set.reps;
        }
      }
    }

    const volumeByMuscleData: VolumeByMuscleData[] = Array.from(muscleMap.entries()).map(
      ([muscle, bucket]) => ({
        muscle: muscle as VolumeByMuscleData["muscle"],
        totalSets: bucket.totalSets,
        totalVolumeKg: Math.round(bucket.totalVolumeKg * 10) / 10,
        exerciseCount: bucket.exerciseSet.size,
      }),
    );

    return {
      adherenceChart: { data: adherenceChartData.slice(0, 10) },
      weightTrend: { data: weightTrendData, metric: "weight" },
      volumeByMuscle: { data: volumeByMuscleData },
    };
  });
}

// ── getDashboardAlerts ────────────────────────────────────────────────────────

export async function getDashboardAlerts(): Promise<ActionResult<DashboardAlert[]>> {
  return tryCatch(async () => {
    const today = new Date("2026-05-15T00:00:00Z");
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 14);
    const fourteenDaysAgoIso = fourteenDaysAgo.toISOString();
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    const links = await db.demoTrainerClients
      .where({ trainerUserId: DEMO_TRAINER_ID, status: "ACTIVE" })
      .toArray();

    const alerts: DashboardAlert[] = [];

    for (const link of links) {
      const client = await db.demoClients.get(link.clientUserId);
      if (!client) continue;

      // PAR-Q alerts
      if (client.parqStatus === "RED") {
        alerts.push({
          id: `alert-parq-${client.id}`,
          clientId: client.id,
          clientName: client.name,
          severity: "critical",
          trigger: "parq_red",
          message: `${client.name} tiene PAR-Q en rojo. Requerí liberación médica antes de continuar.`,
          actionUrl: `/trainer/clientes/${client.id}`,
        });
      } else if (client.parqStatus === "REVIEW") {
        alerts.push({
          id: `alert-parq-review-${client.id}`,
          clientId: client.id,
          clientName: client.name,
          severity: "warning",
          trigger: "parq_review",
          message: `${client.name} tiene PAR-Q en revisión. Consultá con un médico.`,
          actionUrl: `/trainer/clientes/${client.id}`,
        });
      }

      // No session in 14 days
      const sessions = await store.listSessionsForClient(client.id);
      const lastSession = sessions
        .filter((s) => s.status === "COMPLETED" && s.completedAt)
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];

      if (!lastSession || lastSession.completedAt! < fourteenDaysAgoIso) {
        alerts.push({
          id: `alert-no-session-${client.id}`,
          clientId: client.id,
          clientName: client.name,
          severity: "warning",
          trigger: "no_session_14d",
          message: `${client.name} no ha entrenado en más de 14 días. Contactalo.`,
          actionUrl: `/trainer/clientes/${client.id}`,
        });
      }

      // Routine ending in 7 days
      const assigned = await store.getActiveAssignedRoutine(client.id);
      if (assigned?.endsOn && new Date(assigned.endsOn) <= sevenDaysLater) {
        alerts.push({
          id: `alert-routine-end-${client.id}`,
          clientId: client.id,
          clientName: client.name,
          severity: "info",
          trigger: "routine_ending_7d",
          message: `La rutina de ${client.name} vence el ${assigned.endsOn.slice(0, 10)}. Asigná una nueva.`,
          actionUrl: `/trainer/clientes/${client.id}`,
        });
      }

      // No measurement in 30 days
      const metrics = await store.listMetricsForClient(client.id);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const recentMetric = metrics.find((m) => new Date(m.recordedAt) >= thirtyDaysAgo);
      if (!recentMetric) {
        alerts.push({
          id: `alert-no-measure-${client.id}`,
          clientId: client.id,
          clientName: client.name,
          severity: "info",
          trigger: "no_measurement_30d",
          message: `${client.name} no tiene medidas corporales en los últimos 30 días.`,
          actionUrl: `/trainer/clientes/${client.id}`,
        });
      }
    }

    const severityOrder: Record<DashboardAlert["severity"], number> = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

    return alerts;
  });
}
