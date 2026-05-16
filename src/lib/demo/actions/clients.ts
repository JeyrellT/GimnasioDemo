// =============================================================================
// VIZION — Demo actions: clients
// Mirrors all signatures from src/app/actions/clients.ts
// =============================================================================

import { db } from "@/lib/offline/db";
import { ok, err, tryCatch } from "@/lib/result";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { DEMO_TRAINER_ID } from "../seed-data";
import * as store from "../store";
import type { ActionResult, ListClientsResult } from "@/types/api";
import type { ClientListItem } from "@/types/domain";
import type {
  ClientProfileDetail,
  ClientProfileDetailResult,
  BodyComposition,
  BodyZone,
  ZoneMetric,
  ActiveRoutine,
  RecentSession,
} from "@/types/api";
import type { DemoMetricRow, DemoSessionRow } from "@/lib/offline/db";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildBodyZone(metrics: DemoMetricRow[], field: keyof Pick<DemoMetricRow, "neckCm" | "chestCm" | "armCm" | "waistCm" | "hipCm" | "thighCm">): ZoneMetric | null {
  const withValue = metrics.filter((m) => m[field] != null);
  if (withValue.length === 0) return null;
  const latest = withValue[withValue.length - 1]!;
  const prev = withValue.length > 1 ? withValue[withValue.length - 2]! : null;
  const value = latest[field] as number;
  const delta = prev?.[field] != null ? value - (prev[field] as number) : 0;
  const sparkline = withValue.slice(-12).map((m) => m[field] as number);
  return {
    valueCm: value,
    deltaCm: Math.round(delta * 10) / 10,
    measuredAt: latest.recordedAt,
    trendSparkline: sparkline,
  };
}

function noZone(): null { return null; }
function noFreshness(): { lastMeasuredAt: null; daysSince: null } {
  return { lastMeasuredAt: null, daysSince: null };
}

function freshness(metrics: DemoMetricRow[], field: keyof Pick<DemoMetricRow, "neckCm" | "chestCm" | "armCm" | "waistCm" | "hipCm" | "thighCm">): { lastMeasuredAt: string | null; daysSince: number | null } {
  const withValue = [...metrics].reverse().find((m) => m[field] != null);
  if (!withValue) return noFreshness();
  const daysSince = Math.floor((Date.now() - new Date(withValue.recordedAt).getTime()) / 86400000);
  return { lastMeasuredAt: withValue.recordedAt, daysSince };
}

function buildZonesAndFreshness(metrics: DemoMetricRow[]): {
  zones: Record<BodyZone, ZoneMetric | null>;
  freshnesMap: BodyComposition["freshness"];
} {
  const zones: Record<BodyZone, ZoneMetric | null> = {
    neck: buildBodyZone(metrics, "neckCm"),
    shoulderLeft: noZone(),
    shoulderRight: noZone(),
    chest: buildBodyZone(metrics, "chestCm"),
    bicepLeft: buildBodyZone(metrics, "armCm"),
    bicepRight: buildBodyZone(metrics, "armCm"),
    forearmLeft: noZone(),
    forearmRight: noZone(),
    abdomen: noZone(),
    waist: buildBodyZone(metrics, "waistCm"),
    hip: buildBodyZone(metrics, "hipCm"),
    glute: noZone(),
    quadLeft: buildBodyZone(metrics, "thighCm"),
    quadRight: buildBodyZone(metrics, "thighCm"),
    hamstringLeft: noZone(),
    hamstringRight: noZone(),
    calfLeft: noZone(),
    calfRight: noZone(),
  };

  const freshnesMap: BodyComposition["freshness"] = {
    neck: freshness(metrics, "neckCm"),
    shoulderLeft: noFreshness(),
    shoulderRight: noFreshness(),
    chest: freshness(metrics, "chestCm"),
    bicepLeft: freshness(metrics, "armCm"),
    bicepRight: freshness(metrics, "armCm"),
    forearmLeft: noFreshness(),
    forearmRight: noFreshness(),
    abdomen: noFreshness(),
    waist: freshness(metrics, "waistCm"),
    hip: freshness(metrics, "hipCm"),
    glute: noFreshness(),
    quadLeft: freshness(metrics, "thighCm"),
    quadRight: freshness(metrics, "thighCm"),
    hamstringLeft: noFreshness(),
    hamstringRight: noFreshness(),
    calfLeft: noFreshness(),
    calfRight: noFreshness(),
  };

  return { zones, freshnesMap };
}

function computeStreak(sessions: DemoSessionRow[]): number {
  const completed = sessions
    .filter((s) => s.status === "COMPLETED" && s.completedAt)
    .map((s) => s.completedAt!.slice(0, 10));

  const daySet = new Set(completed);
  let streak = 0;
  const today = new Date("2026-05-15");
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

// ── listMyClients ─────────────────────────────────────────────────────────────

export async function listMyClients(
  _raw?: unknown,
): Promise<ActionResult<ListClientsResult>> {
  return tryCatch(async () => {
    const links = await db.demoTrainerClients
      .where({ trainerUserId: DEMO_TRAINER_ID, status: "ACTIVE" })
      .toArray();

    const clientIds = links.map((l) => l.clientUserId);
    const clientRows = await db.demoClients.where("id").anyOf(clientIds).toArray();

    const now = new Date("2026-05-15T00:00:00Z").toISOString();
    const sevenDaysAgo = new Date("2026-04-30T00:00:00Z").toISOString();

    const clients: ClientListItem[] = await Promise.all(
      clientRows.map(async (c) => {
        const link = links.find((l) => l.clientUserId === c.id)!;
        const sessions = await store.listSessionsForClient(c.id);
        const lastSession = sessions
          .filter((s) => s.status === "COMPLETED" && s.completedAt)
          .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];

        const sessions7d = sessions.filter(
          (s) => s.status === "COMPLETED" && s.completedAt && s.completedAt >= sevenDaysAgo && s.completedAt <= now,
        ).length;

        const assigned = await store.getActiveAssignedRoutine(c.id);
        const routine = assigned ? await store.getRoutine(assigned.routineTemplateId) : null;
        const expected7d = routine ? routine.splitDays : 0;
        const adherencePct7d = expected7d > 0 ? Math.min(Math.round((sessions7d / expected7d) * 100), 100) : 0;

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          avatarUrl: c.avatarUrl,
          parqStatus: c.parqStatus as ClientListItem["parqStatus"],
          goal: c.goal as ClientListItem["goal"],
          monthlyPriceCRC: link.monthlyPriceCRC,
          lastSessionAt: lastSession?.completedAt ? new Date(lastSession.completedAt) : null,
          adherencePct7d,
          nextChargeDate: null,
          trainerClientId: link.id,
          status: link.status as ClientListItem["status"],
        };
      }),
    );

    return { clients, total: clients.length };
  });
}

// ── getClientDetail ───────────────────────────────────────────────────────────

export async function getClientDetail(
  clientId: string,
): Promise<ActionResult<unknown>> {
  return tryCatch(async () => {
    const client = await store.getClient(clientId);
    if (!client) {
      throw new NotFoundError("CLIENT_NOT_FOUND", "Cliente no encontrado.");
    }
    return client;
  });
}

// ── getClientProfileDetail ────────────────────────────────────────────────────

export async function getClientProfileDetail(
  clientId: string,
): Promise<ClientProfileDetailResult> {
  return tryCatch(async () => {
    const client = await store.getClient(clientId);
    if (!client) {
      throw new NotFoundError("CLIENT_NOT_FOUND", "Cliente no encontrado.");
    }

    const link = await store.getTrainerClientLink(clientId);
    const metrics = await store.listMetricsForClient(clientId);
    const latestMetric = metrics[metrics.length - 1] ?? null;
    const sessions = await store.listSessionsForClient(clientId);
    const completedSessions = sessions.filter((s) => s.status === "COMPLETED");

    const twelveWeeksAgo = new Date("2026-05-15");
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const history = metrics.filter((m) => new Date(m.recordedAt) >= twelveWeeksAgo);

    const assigned = await store.getActiveAssignedRoutine(clientId);
    const routine = assigned ? await store.getRoutine(assigned.routineTemplateId) : null;

    let activeRoutine: ActiveRoutine | null = null;
    if (assigned && routine) {
      const totalDays = routine.splitDays * routine.durationWeeks;
      const completedCount = completedSessions.filter((s) => s.assignedRoutineId === assigned.id).length;
      activeRoutine = {
        id: assigned.id,
        name: routine.name,
        totalDays,
        currentDayIndex: completedCount % routine.splitDays,
        completionPct: Math.min(completedCount / Math.max(totalDays, 1), 1),
        startsOn: assigned.startsOn,
        endsOn: assigned.endsOn,
      };
    }

    const recentSessions: RecentSession[] = completedSessions
      .filter((s) => s.completedAt)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        date: s.completedAt ?? s.startedAt,
        durationSec: s.totalDurationSec,
        exercisesCount: new Set(s.setsJson.map((set) => set.exerciseId)).size,
        prDetected: s.setsJson.some((set) => set.isPr),
      }));

    const heightCm = client.heightCm;
    const latestWeight = latestMetric?.weightKg ?? null;
    const bmi =
      latestWeight && heightCm && heightCm > 0
        ? Math.round((latestWeight / Math.pow(heightCm / 100, 2)) * 10) / 10
        : null;

    const { zones, freshnesMap } = buildZonesAndFreshness(history);

    const bodyComposition: BodyComposition = {
      weightKg: latestWeight,
      bodyFatPct: latestMetric?.bodyFatPct ?? null,
      muscleMassKg: latestMetric?.muscleMassKg ?? null,
      visceralFat: null,
      basalMetabolicRate: null,
      bmi,
      circumferences: {
        neckCm: latestMetric?.neckCm ?? null,
        shoulderLeftCm: null,
        shoulderRightCm: null,
        chestCm: latestMetric?.chestCm ?? null,
        leftBicepCm: latestMetric?.armCm ?? null,
        rightBicepCm: latestMetric?.armCm ?? null,
        leftForearmCm: null,
        rightForearmCm: null,
        abdomenCm: null,
        waistCm: latestMetric?.waistCm ?? null,
        hipCm: latestMetric?.hipCm ?? null,
        leftGluteCm: null,
        rightGluteCm: null,
        leftThighCm: latestMetric?.thighCm ?? null,
        rightThighCm: latestMetric?.thighCm ?? null,
        leftHamstringCm: null,
        rightHamstringCm: null,
        leftCalfCm: null,
        rightCalfCm: null,
      },
      freshness: freshnesMap,
    };

    const anchor28 = metrics.find((m) => {
      const d = new Date("2026-05-15");
      d.setDate(d.getDate() - 28);
      return new Date(m.recordedAt) <= d;
    });
    const weightDelta28d = latestMetric?.weightKg != null && anchor28?.weightKg != null
      ? latestMetric.weightKg - anchor28.weightKg : null;
    const bodyFatDelta28d = latestMetric?.bodyFatPct != null && anchor28?.bodyFatPct != null
      ? latestMetric.bodyFatPct - anchor28.bodyFatPct : null;

    const startedAt = link?.startedAt ?? client.createdAt;
    const daysSinceStart = Math.floor(
      (new Date("2026-05-15").getTime() - new Date(startedAt).getTime()) / 86400000,
    );

    let adherence7d: number | null = null;
    let adherence30d: number | null = null;
    if (activeRoutine && routine) {
      const now7 = new Date("2026-05-15T23:59:59Z").toISOString();
      const ago7 = new Date("2026-04-30T00:00:00Z").toISOString();
      const ago30 = new Date("2026-04-07T00:00:00Z").toISOString();
      const s7 = completedSessions.filter((s) => s.completedAt && s.completedAt >= ago7 && s.completedAt <= now7).length;
      const s30 = completedSessions.filter((s) => s.completedAt && s.completedAt >= ago30 && s.completedAt <= now7).length;
      adherence7d = Math.min(s7 / Math.max(routine.splitDays, 1), 1);
      adherence30d = Math.min(s30 / Math.max(routine.splitDays * (30 / 7), 1), 1);
    }

    let alertsCount = 0;
    if (client.parqStatus === "RED" || client.parqStatus === "REVIEW") alertsCount++;
    if (weightDelta28d !== null) {
      if (client.goal === "FAT_LOSS" && weightDelta28d > 1.5) alertsCount++;
      if (client.goal === "MUSCLE_GAIN" && weightDelta28d < -1.5) alertsCount++;
    }

    const detail: ClientProfileDetail = {
      user: {
        id: client.id,
        name: client.name,
        email: client.email,
        dateOfBirth: client.dateOfBirth,
        gender: client.gender as ClientProfileDetail["user"]["gender"],
        avatarUrl: client.avatarUrl,
        createdAt: client.createdAt,
      },
      profile: {
        parqStatus: client.parqStatus as "GREEN" | "REVIEW" | "RED" | "NOT_COMPLETED",
        goal: client.goal as "FAT_LOSS" | "MUSCLE_GAIN" | "MAINTENANCE" | "PERFORMANCE" | "GENERAL_HEALTH" | null,
        locationCity: client.locationCity,
        weightKg: client.weightKg,
        heightCm: client.heightCm,
      },
      latestMetric: latestMetric as unknown as ClientProfileDetail["latestMetric"],
      metricsHistory: history as unknown as ClientProfileDetail["metricsHistory"],
      bodyComposition,
      zones,
      activeRoutine,
      recentSessions,
      stats: {
        daysSinceStart,
        totalSessions: completedSessions.length,
        currentStreak: computeStreak(sessions),
        alertsCount: Math.min(alertsCount, 9),
        weightDelta28d,
        bodyFatDelta28d,
      },
      adherence7d,
      adherence30d,
      trainerNotes: link?.notesPrivate ?? null,
    };

    return detail;
  });
}

// ── Mutations — demo mode stubs ───────────────────────────────────────────────

const DEMO_ERR = () => err(new ValidationError("DEMO_MODE", "Esta acción no está disponible en modo demo."));

export async function createInvitation(_raw: unknown) { return DEMO_ERR(); }
export async function acceptInvitation(_token: string) { return DEMO_ERR(); }
export async function validateInvitationToken(_input: unknown) { return DEMO_ERR(); }

export async function updateClientPrice(raw: unknown): Promise<ActionResult<{ clientId: string; monthlyPriceCRC: number }>> {
  return tryCatch(async () => {
    const input = raw as { clientId: string; monthlyPriceCRC: number };
    await db.demoTrainerClients.where({ clientUserId: input.clientId, trainerUserId: DEMO_TRAINER_ID }).modify({ monthlyPriceCRC: input.monthlyPriceCRC });
    return { clientId: input.clientId, monthlyPriceCRC: input.monthlyPriceCRC };
  });
}

export async function updateTrainerNotes(raw: unknown): Promise<ActionResult<{ clientId: string }>> {
  return tryCatch(async () => {
    const input = raw as { clientId: string; notes: string };
    await db.demoTrainerClients.where({ clientUserId: input.clientId, trainerUserId: DEMO_TRAINER_ID }).modify({ notesPrivate: input.notes });
    return { clientId: input.clientId };
  });
}

export async function updateTrainerClientNotes(raw: { clientId: string; notes: string }): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    await db.demoTrainerClients.where({ clientUserId: raw.clientId, trainerUserId: DEMO_TRAINER_ID }).modify({ notesPrivate: raw.notes });
  });
}

export async function pauseClient(_clientId: string): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    await db.demoTrainerClients.where({ clientUserId: _clientId, trainerUserId: DEMO_TRAINER_ID }).modify({ status: "PAUSED" });
  });
}

export async function resumeClient(_clientId: string): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    await db.demoTrainerClients.where({ clientUserId: _clientId, trainerUserId: DEMO_TRAINER_ID }).modify({ status: "ACTIVE" });
  });
}

export async function endRelationship(_clientId: string): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    await db.demoTrainerClients.where({ clientUserId: _clientId, trainerUserId: DEMO_TRAINER_ID }).modify({ status: "ENDED" });
  });
}

export async function getLpdpRequests(): Promise<ActionResult<never[]>> { return ok([]); }
export async function saveClientGoal(_raw: unknown): Promise<ActionResult<undefined>> { return ok(undefined); }
export async function updateTrainerProfile(_raw: unknown): Promise<ActionResult<undefined>> { return DEMO_ERR(); }
export async function recordTrainerNoteUpdate(_raw: unknown): Promise<ActionResult<undefined>> { return ok(undefined); }
