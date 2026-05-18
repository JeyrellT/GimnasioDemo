// =============================================================================
// BLACKLINE FITNESS — Demo store: typed read API over Dexie demo tables
// =============================================================================

import { db } from "@/lib/offline/db";
import type {
  DemoClientRow,
  DemoTrainerClientRow,
  DemoExerciseRow,
  DemoRoutineRow,
  DemoAssignedRoutineRow,
  DemoSessionRow,
  DemoMetricRow,
  DemoLocationRow,
  DemoLocationVisitRow,
  DemoExpenseRow,
  DemoSaleRow,
} from "@/lib/offline/db";

// ── Clients ───────────────────────────────────────────────────────────────────

export async function listClients(): Promise<DemoClientRow[]> {
  return db.demoClients.toArray();
}

export async function getClient(id: string): Promise<DemoClientRow | undefined> {
  return db.demoClients.get(id);
}

export async function getTrainerClientLinks(trainerUserId: string): Promise<DemoTrainerClientRow[]> {
  return db.demoTrainerClients.where({ trainerUserId }).toArray();
}

export async function getTrainerClientLink(clientUserId: string): Promise<DemoTrainerClientRow | undefined> {
  return db.demoTrainerClients.where({ clientUserId }).first();
}

// ── Exercises ─────────────────────────────────────────────────────────────────

export async function listExercises(): Promise<DemoExerciseRow[]> {
  return db.demoExercises.toArray();
}

export async function getExercise(id: string): Promise<DemoExerciseRow | undefined> {
  return db.demoExercises.get(id);
}

export async function searchExercises(query: string, primaryMuscle?: string, equipment?: string): Promise<DemoExerciseRow[]> {
  let col = db.demoExercises.toCollection();

  const results = await col.toArray();

  return results.filter((ex) => {
    if (primaryMuscle && ex.primaryMuscle !== primaryMuscle) return false;
    if (equipment && ex.equipment !== equipment) return false;
    if (query && query.length >= 2) {
      const q = query.toLowerCase();
      return (
        ex.nameEs.toLowerCase().includes(q) ||
        ex.nameEn.toLowerCase().includes(q) ||
        ex.slug.includes(q)
      );
    }
    return true;
  });
}

// ── Routines ──────────────────────────────────────────────────────────────────

export async function listRoutines(trainerId: string): Promise<DemoRoutineRow[]> {
  return db.demoRoutines.where({ trainerId }).toArray();
}

export async function getRoutine(id: string): Promise<DemoRoutineRow | undefined> {
  return db.demoRoutines.get(id);
}

export async function listAssignedRoutines(clientUserId: string): Promise<DemoAssignedRoutineRow[]> {
  return db.demoAssignedRoutines.where({ clientUserId }).toArray();
}

export async function getActiveAssignedRoutine(clientUserId: string): Promise<DemoAssignedRoutineRow | undefined> {
  return db.demoAssignedRoutines.where({ clientUserId, status: "ACTIVE" }).first();
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function listSessionsForClient(clientUserId: string): Promise<DemoSessionRow[]> {
  return db.demoSessions.where({ clientUserId }).toArray();
}

export async function getSession(id: string): Promise<DemoSessionRow | undefined> {
  return db.demoSessions.get(id);
}

export async function getActiveSession(clientUserId: string): Promise<DemoSessionRow | undefined> {
  return db.demoSessions.where({ clientUserId, status: "IN_PROGRESS" }).first();
}

export async function getCompletedSessionsInRange(clientUserId: string, fromIso: string, toIso: string): Promise<DemoSessionRow[]> {
  const all = await db.demoSessions.where({ clientUserId, status: "COMPLETED" }).toArray();
  return all.filter((s) => {
    if (!s.completedAt) return false;
    return s.completedAt >= fromIso && s.completedAt <= toIso;
  });
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export async function listMetricsForClient(clientUserId: string): Promise<DemoMetricRow[]> {
  const all = await db.demoMetrics.where({ clientUserId }).toArray();
  return all.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

export async function getLatestMetric(clientUserId: string): Promise<DemoMetricRow | undefined> {
  const all = await listMetricsForClient(clientUserId);
  return all[all.length - 1];
}

// ── Finance ───────────────────────────────────────────────────────────────────

export async function listLocations(trainerUserId: string): Promise<DemoLocationRow[]> {
  return db.demoLocations.where({ trainerUserId }).toArray();
}

export async function getLocation(id: string): Promise<DemoLocationRow | undefined> {
  return db.demoLocations.get(id);
}

export async function listLocationVisits(trainerUserId: string, fromIso?: string, toIso?: string): Promise<DemoLocationVisitRow[]> {
  const all = await db.demoLocationVisits.where({ trainerUserId }).toArray();
  if (!fromIso && !toIso) return all;
  return all.filter((v) => {
    if (fromIso && v.visitedAt < fromIso) return false;
    if (toIso && v.visitedAt > toIso) return false;
    return true;
  });
}

export async function listExpenses(trainerUserId: string, fromIso?: string, toIso?: string): Promise<DemoExpenseRow[]> {
  const all = await db.demoExpenses.where({ trainerUserId }).toArray();
  if (!fromIso && !toIso) return all;
  return all.filter((e) => {
    if (fromIso && e.occurredAt < fromIso) return false;
    if (toIso && e.occurredAt > toIso) return false;
    return true;
  });
}

export async function listSales(trainerUserId: string, fromIso?: string, toIso?: string): Promise<DemoSaleRow[]> {
  const all = await db.demoSales.where({ trainerUserId }).toArray();
  if (!fromIso && !toIso) return all;
  return all.filter((s) => {
    if (fromIso && s.occurredAt < fromIso) return false;
    if (toIso && s.occurredAt > toIso) return false;
    return true;
  });
}
