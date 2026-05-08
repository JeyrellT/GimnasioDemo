// =============================================================================
// VIZION — Offline module barrel + React hooks
// Owner: data-app-builder.
//
// Public surface for the rest of the app. Import from "@/lib/offline" — never
// import from submodules directly.
//
// This barrel does NOT declare "use client" at the top level so that the
// non-React exports (db, queue, sync utilities) remain usable from any context.
// The hooks below internally use React APIs and must be called only from Client
// Components — Next.js enforces this automatically via the hooks' own
// useState/useEffect calls (which throw in server context).
//
// Consumers that only need the db singleton or queue functions:
//   import { db, enqueueSet } from "@/lib/offline";
//
// Consumers that need hooks:
//   import { useSyncStatus, useEnqueueSet } from "@/lib/offline";
//   // (must be inside a "use client" file)
// =============================================================================

// Re-export database singleton and types
export { db, KV_KEYS } from "./db";
export type {
  LocalSession,
  LocalSet,
  LocalMetric,
  LocalPhoto,
  SyncStatus,
  AssignedRoutineCache,
  ExerciseCache,
  KvEntry,
  VizionDB,
} from "./db";

// Re-export queue operations
export {
  enqueueSession,
  enqueueSet,
  enqueueMetric,
  enqueuePhotoUpload,
  getPendingSessions,
  getPendingSets,
  getPendingMetrics,
  getPendingPhotos,
  markSyncing,
  markSynced,
  markFailed,
  resetFailedToPending,
  pendingCount,
  cacheAssignedRoutine,
  cacheExercises,
  kvGet,
  kvSet,
  recordLastSync,
  getLastSyncAt,
} from "./queue";
export type { PendingCounts } from "./queue";

// Re-export sync engine
export {
  syncAll,
  isSyncing,
  triggerSyncOnReconnect,
  registerBackgroundSync,
} from "./sync";
export type { SyncResult } from "./sync";

// =============================================================================
// React hooks
// =============================================================================

import { useLiveQuery } from "dexie-react-hooks";
import { useState, useEffect, useCallback } from "react";
import { db as _db } from "./db";
import {
  pendingCount as _pendingCount,
  enqueueSet as _enqueueSet,
  getLastSyncAt as _getLastSyncAt,
} from "./queue";
import { isSyncing as _isSyncing, syncAll as _syncAll } from "./sync";
import type { PendingCounts } from "./queue";
import type { LocalSet, AssignedRoutineCache } from "./db";

// -----------------------------------------------------------------------------
// usePendingCount — live count of unsynced items across all tables
// -----------------------------------------------------------------------------

/**
 * Returns the total number of pending/failed records that need syncing.
 * Updates live as the Dexie tables change.
 */
export function usePendingCount(): number {
  const counts = useLiveQuery<PendingCounts | undefined>(
    () => _pendingCount(),
    [],
  );
  return counts?.total ?? 0;
}

// -----------------------------------------------------------------------------
// useSyncStatus — composite online + sync state for the OfflineBanner
// -----------------------------------------------------------------------------

/**
 * Shape returned by useSyncStatus.
 * Named OfflineSyncState to avoid collision with the SyncStatus string-union
 * type re-exported from db.ts ("pending" | "syncing" | "synced" | "failed").
 */
export interface OfflineSyncState {
  online: boolean;
  lastSyncAt: Date | null;
  pending: number;
  isSyncing: boolean;
}

/**
 * Aggregates network status, pending count, sync-in-flight state, and
 * last successful sync timestamp into a single observable object.
 *
 * The `isSyncing` field polls the module-level flag on a 500 ms interval
 * so the banner can show a spinner without introducing complex subscriptions.
 */
export function useSyncStatus(): OfflineSyncState {
  const [online, setOnline] = useState<boolean>(
    typeof window !== "undefined" ? navigator.onLine : true,
  );
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);

  const pending = usePendingCount();

  // Track online/offline
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Load lastSyncAt from KV store and poll isSyncing
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const ts = await _getLastSyncAt();
      if (!cancelled) setLastSyncAt(ts);
    }

    void init();

    const interval = setInterval(() => {
      if (!cancelled) setSyncing(_isSyncing());
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Update lastSyncAt after each completed sync by watching pending count drop
  useEffect(() => {
    if (!syncing && pending === 0) {
      void _getLastSyncAt().then(setLastSyncAt);
    }
  }, [syncing, pending]);

  return { online, lastSyncAt, pending, isSyncing: syncing };
}

// -----------------------------------------------------------------------------
// useEnqueueSet — stable callback for recording a set offline
// -----------------------------------------------------------------------------

/**
 * Returns a memoized function that enqueues a set into Dexie.
 * The returned function mirrors the signature of `enqueueSet` from queue.ts
 * but is wrapped for direct use in React event handlers.
 */
export function useEnqueueSet(): (
  data: Omit<LocalSet, "id" | "syncStatus" | "syncError" | "syncAttempts" | "createdAt">,
) => Promise<string> {
  return useCallback(_enqueueSet, []);
}

// -----------------------------------------------------------------------------
// useAssignedRoutineFromCache — live query for offline routine data
// -----------------------------------------------------------------------------

/**
 * Returns the cached assigned routine for the given id, or undefined while
 * loading / not in cache. Updates live if the cache is refreshed.
 */
export function useAssignedRoutineFromCache(
  assignedRoutineId: string | null | undefined,
): AssignedRoutineCache | undefined {
  return useLiveQuery<AssignedRoutineCache | undefined>(
    () => {
      if (!assignedRoutineId) return Promise.resolve(undefined);
      return _db.assignedRoutineCache.get(assignedRoutineId);
    },
    [assignedRoutineId],
  );
}

// -----------------------------------------------------------------------------
// useManualSync — exposes syncAll with loading state for UI "Sync now" button
// -----------------------------------------------------------------------------

export interface ManualSyncState {
  trigger: () => void;
  isSyncing: boolean;
}

export function useManualSync(): ManualSyncState {
  const [loading, setLoading] = useState(false);

  const trigger = useCallback(() => {
    if (loading) return;
    setLoading(true);
    void _syncAll().finally(() => setLoading(false));
  }, [loading]);

  return { trigger, isSyncing: loading };
}
