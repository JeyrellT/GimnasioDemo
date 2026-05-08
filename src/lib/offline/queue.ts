// =============================================================================
// VIZION — Offline operation queue
// Owner: data-app-builder.
//
// Thin wrapper over the Dexie tables that adds semantic queue operations:
// enqueue (insert as pending), mark state transitions, and batch getters for
// the sync engine.
//
// All functions are pure async; they do NOT trigger sync — that is sync.ts's
// responsibility. The queue is append-only from the user's perspective; only
// the sync engine transitions records out of pending/failed.
// =============================================================================

import { createId } from "@paralleldrive/cuid2";
import { db, KV_KEYS } from "./db";
import type {
  LocalSession,
  LocalSet,
  LocalMetric,
  LocalPhoto,
  SyncStatus,
} from "./db";

// -----------------------------------------------------------------------------
// Re-export types that callers (session-store, hooks, components) will use
// -----------------------------------------------------------------------------
export type { LocalSession, LocalSet, LocalMetric, LocalPhoto, SyncStatus };

// -----------------------------------------------------------------------------
// Insert helpers — generate id + timestamps if not provided by caller
// -----------------------------------------------------------------------------

/** Enqueue a new session for creation on the server. */
export async function enqueueSession(
  data: Omit<LocalSession, "id" | "syncStatus" | "syncError" | "syncAttempts" | "serverId" | "createdAt">,
): Promise<string> {
  const id = createId();
  const entry: LocalSession = {
    ...data,
    id,
    syncStatus: "pending",
    syncError: null,
    syncAttempts: 0,
    serverId: null,
    createdAt: new Date(),
  };
  await db.localSessions.add(entry);
  return id;
}

/** Enqueue a performed set. The localSessionId must reference an existing LocalSession. */
export async function enqueueSet(
  data: Omit<LocalSet, "id" | "syncStatus" | "syncError" | "syncAttempts" | "createdAt">,
): Promise<string> {
  const id = createId();
  const entry: LocalSet = {
    ...data,
    id,
    syncStatus: "pending",
    syncError: null,
    syncAttempts: 0,
    createdAt: new Date(),
  };
  await db.localSets.add(entry);
  return id;
}

/** Enqueue a body metric measurement. */
export async function enqueueMetric(
  data: Omit<LocalMetric, "id" | "syncStatus" | "syncError" | "syncAttempts" | "createdAt">,
): Promise<string> {
  const id = createId();
  const entry: LocalMetric = {
    ...data,
    id,
    syncStatus: "pending",
    syncError: null,
    syncAttempts: 0,
    createdAt: new Date(),
  };
  await db.localMetrics.add(entry);
  return id;
}

/** Enqueue a photo for upload. */
export async function enqueuePhotoUpload(
  data: Omit<LocalPhoto, "id" | "syncStatus" | "syncError" | "retryCount" | "storageKey" | "createdAt">,
): Promise<string> {
  const id = createId();
  const entry: LocalPhoto = {
    ...data,
    id,
    syncStatus: "pending",
    syncError: null,
    retryCount: 0,
    storageKey: null,
    createdAt: new Date(),
  };
  await db.photoQueue.add(entry);
  return id;
}

// -----------------------------------------------------------------------------
// Pending getters — returns pending + failed (eligible for next sync pass)
// -----------------------------------------------------------------------------

export function getPendingSessions(): Promise<LocalSession[]> {
  return db.localSessions
    .where("syncStatus")
    .anyOf(["pending", "failed"])
    .toArray();
}

export function getPendingSets(): Promise<LocalSet[]> {
  return db.localSets
    .where("syncStatus")
    .anyOf(["pending", "failed"])
    .toArray();
}

export function getPendingMetrics(): Promise<LocalMetric[]> {
  return db.localMetrics
    .where("syncStatus")
    .anyOf(["pending", "failed"])
    .toArray();
}

export function getPendingPhotos(): Promise<LocalPhoto[]> {
  return db.photoQueue
    .where("syncStatus")
    .anyOf(["pending", "failed"])
    .toArray();
}

// -----------------------------------------------------------------------------
// State transitions — called exclusively by sync.ts
// -----------------------------------------------------------------------------

/** Mark a record as syncing (in-flight). Prevents double-sync. */
export async function markSyncing(
  table: "localSessions" | "localSets" | "localMetrics" | "photoQueue",
  id: string,
): Promise<void> {
  await db[table].update(id, { syncStatus: "syncing" satisfies SyncStatus });
}

/**
 * Mark a record as successfully synced.
 * For localSessions, pass the server-assigned id so that dependents can join.
 * For photoQueue, pass the R2 storage key.
 */
export async function markSynced(
  table: "localSessions",
  id: string,
  serverId: string,
): Promise<void>;
export async function markSynced(
  table: "photoQueue",
  id: string,
  storageKey: string,
): Promise<void>;
export async function markSynced(
  table: "localSets" | "localMetrics",
  id: string,
): Promise<void>;
export async function markSynced(
  table: "localSessions" | "localSets" | "localMetrics" | "photoQueue",
  id: string,
  extra?: string,
): Promise<void> {
  const patch: Partial<
    LocalSession & LocalSet & LocalMetric & LocalPhoto
  > = { syncStatus: "synced" satisfies SyncStatus };

  if (table === "localSessions" && extra !== undefined) {
    (patch as Partial<LocalSession>).serverId = extra;
  }
  if (table === "photoQueue" && extra !== undefined) {
    (patch as Partial<LocalPhoto>).storageKey = extra;
  }

  await db[table].update(id, patch);
}

/** Mark a record as failed. Increments attempts counter. */
export async function markFailed(
  table: "localSessions" | "localSets" | "localMetrics" | "photoQueue",
  id: string,
  errorMessage: string,
): Promise<void> {
  const record = await db[table].get(id);
  const currentAttempts = (record as { syncAttempts?: number; retryCount?: number } | undefined)?.syncAttempts
    ?? (record as { syncAttempts?: number; retryCount?: number } | undefined)?.retryCount
    ?? 0;

  if (table === "photoQueue") {
    await db.photoQueue.update(id, {
      syncStatus: "failed" satisfies SyncStatus,
      syncError: errorMessage,
      retryCount: currentAttempts + 1,
    });
  } else {
    await db[table].update(id, {
      syncStatus: "failed" satisfies SyncStatus,
      syncError: errorMessage,
      syncAttempts: currentAttempts + 1,
    });
  }
}

/**
 * Reset all failed records back to pending.
 * Used for manual retry (e.g. user taps "Reintentar sincronización").
 */
export async function resetFailedToPending(): Promise<void> {
  const patch: { syncStatus: SyncStatus; syncError: null } = { syncStatus: "pending", syncError: null };

  await Promise.all([
    db.localSessions
      .where("syncStatus")
      .equals("failed")
      .modify(patch),
    db.localSets
      .where("syncStatus")
      .equals("failed")
      .modify(patch),
    db.localMetrics
      .where("syncStatus")
      .equals("failed")
      .modify(patch),
    db.photoQueue
      .where("syncStatus")
      .equals("failed")
      .modify({ syncStatus: "pending" satisfies SyncStatus, syncError: null }),
  ]);
}

// -----------------------------------------------------------------------------
// Counts — used by hooks and the offline banner
// -----------------------------------------------------------------------------

export interface PendingCounts {
  sessions: number;
  sets: number;
  metrics: number;
  photos: number;
  total: number;
}

export async function pendingCount(): Promise<PendingCounts> {
  const [sessions, sets, metrics, photos] = await Promise.all([
    db.localSessions
      .where("syncStatus")
      .anyOf(["pending", "failed"])
      .count(),
    db.localSets
      .where("syncStatus")
      .anyOf(["pending", "failed"])
      .count(),
    db.localMetrics
      .where("syncStatus")
      .anyOf(["pending", "failed"])
      .count(),
    db.photoQueue
      .where("syncStatus")
      .anyOf(["pending", "failed"])
      .count(),
  ]);

  return {
    sessions,
    sets,
    metrics,
    photos,
    total: sessions + sets + metrics + photos,
  };
}

// -----------------------------------------------------------------------------
// Cache helpers — used by session-store and session setup screens
// -----------------------------------------------------------------------------

/** Upsert an assigned routine into the local cache. */
export async function cacheAssignedRoutine(
  data: import("./db").AssignedRoutineCache,
): Promise<void> {
  await db.assignedRoutineCache.put(data);
}

/** Upsert exercise data into the local cache. */
export async function cacheExercises(
  data: import("./db").ExerciseCache[],
): Promise<void> {
  await db.exerciseCache.bulkPut(data);
}

// -----------------------------------------------------------------------------
// KV helpers — typed wrappers over the kvStore table
// -----------------------------------------------------------------------------

export async function kvGet<T>(key: string): Promise<T | null> {
  const entry = await db.kvStore.get(key);
  if (entry === undefined) return null;
  return entry.value as T;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await db.kvStore.put({ key, value });
}

/** Convenience: record the timestamp of the last successful full sync pass. */
export async function recordLastSync(): Promise<void> {
  await kvSet(KV_KEYS.LAST_SYNC_AT, new Date().toISOString());
}

export async function getLastSyncAt(): Promise<Date | null> {
  const iso = await kvGet<string>(KV_KEYS.LAST_SYNC_AT);
  return iso !== null ? new Date(iso) : null;
}
