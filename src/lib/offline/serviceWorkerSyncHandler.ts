// =============================================================================
// VIZION — Service Worker sync event handler
// Owner: data-app-builder.
//
// This file is IMPORTED by the Service Worker (src/app/sw.ts, owned by
// frontend-react). It MUST NOT import Server Actions (those run in Node.js /
// Next.js edge runtime — not in the SW). Instead it posts a message to any
// open client tabs so they execute the sync cycle from their own context where
// Server Actions are available.
//
// Architecture:
//   SW receives BackgroundSync "vizion-sync" event
//     → SW posts "VIZION_SYNC_REQUEST" to all open clients (tabs)
//     → Tab receives the message and calls syncAll() from sync.ts
//     → syncAll() calls Server Actions directly
//
// For tabs that are NOT open (user closed the browser):
//   Serwist + Background Sync will retry the tag registration the next time
//   the user opens the app, which will trigger sync on first load anyway.
//
// iOS Safari note: Background Sync is not supported; registerSyncListener()
// is safe to call (addEventListener no-ops on unsupported events). The primary
// sync path on iOS is triggerSyncOnReconnect() in sync.ts.
//
// WIRING needed by frontend-react in src/app/sw.ts:
//
//   import { registerSyncListener } from "@/lib/offline/serviceWorkerSyncHandler";
//   registerSyncListener(self as unknown as ServiceWorkerGlobalScope);
//
// WIRING needed in a client component (e.g. root layout):
//
//   useEffect(() => {
//     navigator.serviceWorker?.addEventListener("message", (e) => {
//       if (e.data?.type === SYNC_MESSAGE_TYPE) void syncAll();
//     });
//   }, []);
//
// =============================================================================

export const SYNC_TAG = "vizion-sync";

/** Message type broadcast by the SW to open tabs. */
export const SYNC_MESSAGE_TYPE = "VIZION_SYNC_REQUEST" as const;

/**
 * Handle a Background Sync event from within the SW context.
 * Posts a message to all open Vizion clients requesting a sync pass.
 * Falls back gracefully if the Clients API is unavailable.
 */
export async function handleSyncEvent(): Promise<void> {
  // `self` in SW context has a `clients` property via the Clients API
  const swSelf = self as unknown as ServiceWorkerGlobalScope & {
    clients: { matchAll(opts?: { type?: string; includeUncontrolled?: boolean }): Promise<readonly Client[]> };
  };

  try {
    const clients = await swSelf.clients.matchAll({ type: "window", includeUncontrolled: true });

    if (clients.length > 0) {
      // Notify open tabs — they will run the actual sync
      for (const client of clients) {
        // postMessage signature on Client is available in all modern browsers
        (client as Client & { postMessage(msg: unknown): void }).postMessage({
          type: SYNC_MESSAGE_TYPE,
        });
      }
    }
    // If no clients are open, the SW has nothing to do.
    // Sync will happen when the user opens the app next time (visibilitychange).
  } catch {
    // Non-fatal — swallow errors in SW context to prevent sync tag from being
    // permanently removed by the browser (it retries on non-rejected promises).
  }
}

/**
 * Type-safe wrapper to attach the sync listener to a SW global scope.
 * Call this once inside src/app/sw.ts.
 *
 * @param swScope - the Service Worker global (`self` inside sw.ts)
 */
export function registerSyncListener(
  swScope: ServiceWorkerGlobalScope,
): void {
  swScope.addEventListener("sync", (event: Event) => {
    // SyncEvent is not in the default TS SW lib — safe cast
    const syncEvent = event as Event & {
      tag: string;
      waitUntil: (p: Promise<unknown>) => void;
    };
    if (syncEvent.tag === SYNC_TAG) {
      syncEvent.waitUntil(handleSyncEvent());
    }
  });
}
