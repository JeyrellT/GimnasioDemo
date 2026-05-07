// =============================================================================
// FORJA — Demo actions: sessions
// =============================================================================

import { db } from "@/lib/offline/db";
import { ok, tryCatch } from "@/lib/result";
import { NotFoundError, ConflictError } from "@/lib/errors";
import * as store from "../store";
import type { ActionResult, StartSessionResult, RecordSetResult, TodaySessionResult } from "@/types/api";
import type { DemoSessionRow, DemoSessionSet } from "@/lib/offline/db";
import type { RoutineSnapshot } from "@/types/domain";

// Demo "current client" — for now hardcoded to Ana (the active user)
const DEMO_CLIENT_ID = "client-ana";

export async function getMyTodaySession(): Promise<ActionResult<TodaySessionResult>> {
  return tryCatch(async () => {
    const active = await store.getActiveSession(DEMO_CLIENT_ID);

    if (active) {
      const assigned = active.assignedRoutineId
        ? await store.getActiveAssignedRoutine(DEMO_CLIENT_ID)
        : null;

      const snapshot = assigned?.snapshotJson as RoutineSnapshot | undefined;
      const day = snapshot && active.dayIndex !== null
        ? snapshot.days?.find((d: RoutineSnapshot["days"][0]) => d.dayIndex === active.dayIndex) ?? null
        : null;

      return {
        hasActiveSession: true,
        sessionId: active.id,
        assignedRoutineId: active.assignedRoutineId,
        routineDayName: day?.name ?? null,
        exercises: day?.exercises ?? null,
      };
    }

    const assigned = await store.getActiveAssignedRoutine(DEMO_CLIENT_ID);
    if (!assigned) {
      return { hasActiveSession: false, sessionId: null, assignedRoutineId: null, routineDayName: null, exercises: null };
    }

    const snapshot = assigned.snapshotJson as RoutineSnapshot;
    const daysSinceStart = Math.floor(
      (Date.now() - new Date(assigned.startsOn).getTime()) / 86400000,
    );
    const splitDays = snapshot.splitDays ?? 3;
    const dayIndex = daysSinceStart % splitDays;
    const day = snapshot.days?.find((d: RoutineSnapshot["days"][0]) => d.dayIndex === dayIndex) ?? snapshot.days?.[0] ?? null;

    return {
      hasActiveSession: false,
      sessionId: null,
      assignedRoutineId: assigned.id,
      routineDayName: day?.name ?? null,
      exercises: day?.exercises ?? null,
    };
  });
}

export async function startSession(raw: unknown): Promise<ActionResult<StartSessionResult>> {
  return tryCatch(async () => {
    const input = raw as {
      assignedRoutineId?: string;
      dayIndex?: number;
      isFreeWorkout?: boolean;
      bodyweightKg?: number;
    };

    const existing = await store.getActiveSession(DEMO_CLIENT_ID);
    if (existing) {
      throw new ConflictError("SESSION_IN_PROGRESS", "Ya tenés una sesión en curso. Completála o abortala antes de empezar una nueva.");
    }

    const id = `session-demo-${Date.now()}`;
    const now = new Date().toISOString();

    let daySnapshot: RoutineSnapshot["days"][number] | null = null;
    if (!input.isFreeWorkout && input.assignedRoutineId && input.dayIndex !== undefined) {
      const assigned = await db.demoAssignedRoutines.get(input.assignedRoutineId);
      if (assigned) {
        const snapshot = assigned.snapshotJson as RoutineSnapshot;
        daySnapshot = snapshot.days?.find((d) => d.dayIndex === input.dayIndex) ?? null;
      }
    }

    const session: DemoSessionRow = {
      id,
      clientUserId: DEMO_CLIENT_ID,
      assignedRoutineId: input.assignedRoutineId ?? null,
      dayIndex: input.dayIndex ?? null,
      status: "IN_PROGRESS",
      startedAt: now,
      completedAt: null,
      totalDurationSec: null,
      bodyweightKg: input.bodyweightKg ?? null,
      subjectiveFatigue: null,
      notes: null,
      isFreeWorkout: input.isFreeWorkout ?? false,
      setsJson: [],
    };

    await db.demoSessions.put(session);

    return {
      sessionId: id,
      daySnapshot,
      isFreeWorkout: session.isFreeWorkout,
    };
  });
}

export async function recordSet(raw: unknown): Promise<ActionResult<RecordSetResult>> {
  return tryCatch(async () => {
    const input = raw as {
      sessionId: string;
      exerciseId: string;
      setNumber: number;
      weightKg?: number;
      reps?: number;
      rpe?: number;
      restTakenSec?: number;
      isWarmup?: boolean;
      failed?: boolean;
      notes?: string;
    };

    const session = await db.demoSessions.get(input.sessionId);
    if (!session || session.status !== "IN_PROGRESS") {
      throw new NotFoundError("SESSION_NOT_FOUND", "Sesión no encontrada o ya finalizada.");
    }

    // Simple PR detection: compare weight vs previous sessions
    let isPr = false;
    if (input.weightKg && input.reps && !input.isWarmup) {
      const allSessions = await db.demoSessions.where({ clientUserId: DEMO_CLIENT_ID }).toArray();
      const prevMax = allSessions
        .filter((s) => s.id !== input.sessionId && s.status === "COMPLETED")
        .flatMap((s) => s.setsJson)
        .filter((set) => set.exerciseId === input.exerciseId && !set.isWarmup && set.weightKg != null)
        .reduce((max, set) => Math.max(max, set.weightKg ?? 0), 0);
      isPr = input.weightKg > prevMax;
    }

    const setId = `set-demo-${Date.now()}`;
    const newSet: DemoSessionSet = {
      id: setId,
      exerciseId: input.exerciseId,
      setNumber: input.setNumber,
      weightKg: input.weightKg ?? null,
      reps: input.reps ?? null,
      rpe: input.rpe ?? null,
      isWarmup: input.isWarmup ?? false,
      isPr,
    };

    await db.demoSessions.update(input.sessionId, {
      setsJson: [...session.setsJson, newSet],
    });

    return { setId, isPr, ...(isPr ? { prType: "weight" as const } : {}) };
  });
}

export async function completeSession(raw: unknown): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    const input = raw as {
      sessionId: string;
      totalDurationSec: number;
      subjectiveFatigue?: number;
      notes?: string;
    };

    const session = await db.demoSessions.get(input.sessionId);
    if (!session || session.status !== "IN_PROGRESS") {
      throw new NotFoundError("SESSION_NOT_FOUND", "Sesión no encontrada o ya finalizada.");
    }

    await db.demoSessions.update(input.sessionId, {
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
      totalDurationSec: input.totalDurationSec,
      subjectiveFatigue: input.subjectiveFatigue ?? null,
      notes: input.notes ?? null,
    });
  });
}

export async function abortSession(raw: unknown): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    const input = raw as { sessionId: string };
    await db.demoSessions.update(input.sessionId, { status: "ABORTED" });
  });
}

export async function getMySessionHistory(raw?: unknown): Promise<ActionResult<DemoSessionRow[]>> {
  return tryCatch(async () => {
    const input = (raw ?? {}) as { since?: string; limit?: number; offset?: number };
    const sessions = await store.listSessionsForClient(DEMO_CLIENT_ID);
    let filtered = sessions;
    if (input.since) {
      filtered = filtered.filter((s) => s.startedAt >= input.since!);
    }
    filtered.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 20;
    return filtered.slice(offset, offset + limit);
  });
}

export async function getActiveSession(sessionId: string): Promise<ActionResult<DemoSessionRow>> {
  return tryCatch(async () => {
    const session = await db.demoSessions.get(sessionId);
    if (!session) throw new NotFoundError("SESSION_NOT_FOUND", "Sesión no encontrada.");
    return session;
  });
}
