// =============================================================================
// BLACKLINE FITNESS — Offline sync engine
// Owner: data-app-builder.
//
// Orchestrates the full sync cycle:
//   1. Sessions (startSession SA or completeSession SA depending on status)
//   2. Sets (requires session serverId to be available)
//   3. Metrics (recordBodyMetric SA)
//   4. Photos (presigned POST to R2, then confirm)
//
// Idempotence assumption: server actions are idempotent for the same local id.
// If a conflict error is returned by the server, the record is marked "failed"
// and left for manual intervention — we never silently drop data.
//
// Backoff sequence: 1s → 5s → 15s → 30s (index = syncAttempts, capped at 4).
// =============================================================================

"use client";

import { startSession, recordSet, completeSession } from "@/app/actions/sessions";
import { recordBodyMetric } from "@/app/actions/metrics";
import {
  getPendingSessions,
  getPendingSets,
  getPendingMetrics,
  getPendingPhotos,
  markSyncing,
  markSynced,
  markFailed,
  recordLastSync,
  kvGet,
  kvSet,
} from "./queue";
import { db, KV_KEYS } from "./db";
import type { LocalSession, LocalSet, LocalMetric, LocalPhoto } from "./db";

// -----------------------------------------------------------------------------
// Internal logger — client-safe; omits pino (server-only).
// In production builds, these calls compile to no-ops via tree-shaking if
// the build tools strip non-production branches. Left explicit for clarity.
// -----------------------------------------------------------------------------

const clientLog = {
  info: (msg: string, ctx?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.info(`[blackline-fitness:sync] ${msg}`, ctx ?? "");
    }
  },
  warn: (msg: string, ctx?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn(`[blackline-fitness:sync] ${msg}`, ctx ?? "");
    }
  },
};

// -----------------------------------------------------------------------------
// Backoff
// -----------------------------------------------------------------------------

const BACKOFF_MS = [1_000, 5_000, 15_000, 30_000] as const;

function backoffMs(attempts: number): number {
  const idx = Math.min(attempts, BACKOFF_MS.length - 1);
  return BACKOFF_MS[idx as 0 | 1 | 2 | 3];
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------------------------------------------------------
// Sync result shape
// -----------------------------------------------------------------------------

export interface SyncResult {
  syncedSessions: number;
  syncedSets: number;
  syncedMetrics: number;
  syncedPhotos: number;
  failed: number;
}

// -----------------------------------------------------------------------------
// Individual record sync functions
// -----------------------------------------------------------------------------

async function syncOneSession(session: LocalSession): Promise<boolean> {
  await markSyncing("localSessions", session.id);

  const attempts = session.syncAttempts;
  if (attempts > 0) await sleep(backoffMs(attempts));

  try {
    if (session.status === "in_progress") {
      const result = await startSession({
        assignedRoutineId: session.assignedRoutineId ?? undefined,
        dayIndex: session.dayIndex ?? undefined,
        isFreeWorkout: session.isFreeWorkout,
        bodyweightKg: session.bodyweightKg ?? undefined,
      });

      if (!result.ok) {
        await markFailed("localSessions", session.id, result.error.message);
        return false;
      }

      await markSynced("localSessions", session.id, result.value.sessionId);
      return true;
    }

    if (session.status === "completed") {
      // We need the server id to complete on the server.
      // If serverId is null the session was never synced as in_progress
      // (edge case: user completed entirely offline). We must start it first.
      let serverId = session.serverId;

      if (serverId === null) {
        const startResult = await startSession({
          assignedRoutineId: session.assignedRoutineId ?? undefined,
          dayIndex: session.dayIndex ?? undefined,
          isFreeWorkout: session.isFreeWorkout,
          bodyweightKg: session.bodyweightKg ?? undefined,
        });

        if (!startResult.ok) {
          await markFailed("localSessions", session.id, startResult.error.message);
          return false;
        }

        serverId = startResult.value.sessionId;
        // Persist serverId now so sets can reference it even if complete fails below
        await db.localSessions.update(session.id, { serverId });
      }

      const completeResult = await completeSession({
        sessionId: serverId,
        totalDurationSec: session.totalDurationSec ?? undefined,
        subjectiveFatigue: session.subjectiveFatigue ?? undefined,
        notes: session.notes ?? undefined,
      });

      if (!completeResult.ok) {
        await markFailed("localSessions", session.id, completeResult.error.message);
        return false;
      }

      await markSynced("localSessions", session.id, serverId);
      return true;
    }

    // aborted — mark synced without hitting server (server session never created)
    await markSynced("localSessions", session.id, session.serverId ?? "aborted-local");
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido al sincronizar sesión.";
    await markFailed("localSessions", session.id, msg);
    return false;
  }
}

async function syncOneSet(
  set: LocalSet,
  serverIdByLocalId: Map<string, string>,
): Promise<boolean> {
  // Resolve the server session id
  const serverSessionId = serverIdByLocalId.get(set.localSessionId);

  if (serverSessionId === undefined) {
    // Parent session not yet synced — defer this set to next pass
    clientLog.warn("Set deferred: parent session not synced yet", {
      localSetId: set.id,
      localSessionId: set.localSessionId,
    });
    return false;
  }

  await markSyncing("localSets", set.id);

  const attempts = set.syncAttempts;
  if (attempts > 0) await sleep(backoffMs(attempts));

  try {
    const result = await recordSet({
      sessionId: serverSessionId,
      exerciseId: set.exerciseId,
      setNumber: set.setNumber,
      weightKg: set.weightKg ?? undefined,
      reps: set.reps ?? undefined,
      rpe: set.rpe ?? undefined,
      restTakenSec: set.restTakenSec ?? undefined,
      isWarmup: set.isWarmup,
      failed: set.failed,
      notes: set.notes ?? undefined,
    });

    if (!result.ok) {
      await markFailed("localSets", set.id, result.error.message);
      return false;
    }

    await markSynced("localSets", set.id);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido al sincronizar set.";
    await markFailed("localSets", set.id, msg);
    return false;
  }
}

async function syncOneMetric(metric: LocalMetric): Promise<boolean> {
  await markSyncing("localMetrics", metric.id);

  const attempts = metric.syncAttempts;
  if (attempts > 0) await sleep(backoffMs(attempts));

  try {
    const result = await recordBodyMetric({
      recordedAt: metric.recordedAt instanceof Date ? metric.recordedAt.toISOString() : String(metric.recordedAt),
      weightKg: metric.weightKg ?? undefined,
      bodyFatPct: metric.bodyFatPct ?? undefined,
      muscleMassKg: metric.muscleMassKg ?? undefined,
      waistCm: metric.waistCm ?? undefined,
      hipCm: metric.hipCm ?? undefined,
      neckCm: metric.neckCm ?? undefined,
      chestCm: metric.chestCm ?? undefined,
      armCm: metric.armCm ?? undefined,
      thighCm: metric.thighCm ?? undefined,
      source: metric.source,
      notes: metric.notes ?? undefined,
    });

    if (!result.ok) {
      await markFailed("localMetrics", metric.id, result.error.message);
      return false;
    }

    await markSynced("localMetrics", metric.id);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido al sincronizar métrica.";
    await markFailed("localMetrics", metric.id, msg);
    return false;
  }
}

async function syncOnePhoto(photo: LocalPhoto): Promise<boolean> {
  await db.photoQueue.update(photo.id, { syncStatus: "syncing" });

  const attempts = photo.retryCount;
  if (attempts > 0) await sleep(backoffMs(attempts));

  try {
    // Step 1: request presigned POST from our Route Handler
    const presignRes = await fetch("/api/upload/presigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket: photo.bucket,
        filename: `${photo.id}.jpg`,
        contentType: photo.blob.type || "image/jpeg",
        sizeBytes: photo.blob.size,
      }),
    });

    if (!presignRes.ok) {
      const body = (await presignRes.json().catch(() => ({}))) as {
        message?: string;
      };
      await markFailed(
        "photoQueue",
        photo.id,
        body.message ?? `HTTP ${presignRes.status} al pedir URL de subida`,
      );
      return false;
    }

    const presignData = (await presignRes.json()) as {
      ok: boolean;
      data?: { url: string; fields: Record<string, string>; key: string };
    };

    if (!presignData.ok || presignData.data === undefined) {
      await markFailed("photoQueue", photo.id, "Respuesta de presigned URL inválida.");
      return false;
    }

    const { url, fields, key } = presignData.data;

    // Step 2: multipart POST directly to R2
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      form.append(k, v);
    }
    form.append("file", photo.blob);

    const uploadRes = await fetch(url, { method: "POST", body: form });

    if (!uploadRes.ok && uploadRes.status !== 204) {
      await markFailed(
        "photoQueue",
        photo.id,
        `Upload a storage falló con HTTP ${uploadRes.status}`,
      );
      return false;
    }

    await markSynced("photoQueue", photo.id, key);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido al subir foto.";
    await markFailed("photoQueue", photo.id, msg);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Main sync orchestrator
// -----------------------------------------------------------------------------

let _isSyncing = false;

export async function syncAll(): Promise<SyncResult> {
  // Guard against concurrent sync runs
  if (_isSyncing) {
    clientLog.info("Sync already in progress, skipping");
    return { syncedSessions: 0, syncedSets: 0, syncedMetrics: 0, syncedPhotos: 0, failed: 0 };
  }

  _isSyncing = true;
  await kvSet(KV_KEYS.SYNC_IN_PROGRESS, true);

  const result: SyncResult = {
    syncedSessions: 0,
    syncedSets: 0,
    syncedMetrics: 0,
    syncedPhotos: 0,
    failed: 0,
  };

  try {
    // ── Pass 1: Sessions ────────────────────────────────────────────────────
    const pendingSessions = await getPendingSessions();
    clientLog.info("Syncing sessions", { count: pendingSessions.length });

    for (const session of pendingSessions) {
      const ok = await syncOneSession(session);
      if (ok) result.syncedSessions++;
      else result.failed++;
    }

    // Build a localId → serverId map for set sync (includes already-synced sessions)
    const allSessions = await db.localSessions
      .where("syncStatus")
      .anyOf(["synced", "syncing"])
      .toArray();

    const serverIdByLocalId = new Map<string, string>(
      allSessions
        .filter((s) => s.serverId !== null)
        .map((s) => [s.id, s.serverId as string]),
    );

    // ── Pass 2: Sets ────────────────────────────────────────────────────────
    const pendingSets = await getPendingSets();
    clientLog.info("Syncing sets", { count: pendingSets.length });

    for (const set of pendingSets) {
      const ok = await syncOneSet(set, serverIdByLocalId);
      if (ok) result.syncedSets++;
      else result.failed++;
    }

    // ── Pass 3: Metrics ─────────────────────────────────────────────────────
    const pendingMetrics = await getPendingMetrics();
    clientLog.info("Syncing metrics", { count: pendingMetrics.length });

    for (const metric of pendingMetrics) {
      const ok = await syncOneMetric(metric);
      if (ok) result.syncedMetrics++;
      else result.failed++;
    }

    // ── Pass 4: Photos ──────────────────────────────────────────────────────
    const pendingPhotos = await getPendingPhotos();
    clientLog.info("Syncing photos", { count: pendingPhotos.length });

    for (const photo of pendingPhotos) {
      const ok = await syncOnePhoto(photo);
      if (ok) result.syncedPhotos++;
      else result.failed++;
    }

    // Record successful sync timestamp
    await recordLastSync();
    clientLog.info("Sync complete", result as unknown as Record<string, unknown>);
  } finally {
    _isSyncing = false;
    await kvSet(KV_KEYS.SYNC_IN_PROGRESS, false);
  }

  return result;
}

// -----------------------------------------------------------------------------
// isSyncing — observable for hooks
// -----------------------------------------------------------------------------

export function isSyncing(): boolean {
  return _isSyncing;
}

// -----------------------------------------------------------------------------
// Event-driven sync triggers
// -----------------------------------------------------------------------------

/**
 * Register online/visibilitychange listeners that trigger syncAll when the
 * browser regains connectivity.
 *
 * Call once from a top-level client component (e.g. the root layout effect).
 * Returns an unsubscribe function for cleanup.
 */
export function triggerSyncOnReconnect(): () => void {
  function handleOnline() {
    clientLog.info("Network online — triggering sync");
    void syncAll();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      clientLog.info("Tab became visible — checking pending queue");
      void syncAll();
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  };
}

/**
 * Register a Background Sync tag with the active Service Worker.
 * The SW will call syncAll (via serviceWorkerSyncHandler) when the browser
 * decides it has network access.
 *
 * This is a best-effort registration — iOS Safari does not support Background
 * Sync but the call is safe to make anyway; it silently no-ops.
 */
export async function registerBackgroundSync(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    // Background Sync API is not yet in stable TS lib — safe cast
    const syncManager = (registration as unknown as { sync?: { register(tag: string): Promise<void> } }).sync;
    if (syncManager) {
      await syncManager.register("blackline-fitness-sync");
      clientLog.info("Background sync tag registered");
    }
  } catch {
    // Non-fatal: background sync may be blocked by browser policy or iOS
    clientLog.warn("Background sync registration failed (non-fatal)");
  }
}
