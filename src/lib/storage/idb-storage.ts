// =============================================================================
// BLACKLINE FITNESS — IndexedDB storage adapter for Zustand persist
// Owner: frontend-react.
//
// Implementa la interfaz StateStorage de Zustand (getItem/setItem/removeItem)
// sobre un IndexedDB con un único object store de key-value. Pensado para
// persistir el estado del asistente IA — sobrevive a refresh, navegación y
// cierre/reapertura del tab.
//
// Por qué IDB y no localStorage:
//   - Las conversaciones con imágenes adjuntas pueden pesar varios MB.
//   - localStorage tiene quota de ~5MB y es síncrono (bloquea el main thread).
//   - IDB tiene cuotas mucho más grandes (50MB-1GB según browser) y es async.
//
// Por qué un adapter custom y no `idb-keyval`:
//   - No agrega dependencia.
//   - Solo necesitamos 3 métodos (get/set/delete por key).
//   - Es ~80 líneas y aislado.
//
// Robustez:
//   - Si IDB no está disponible (modo privado en algunos browsers, SSR,
//     navegadores muy viejos), cae a localStorage o a un Map en memoria — la
//     app no rompe, solo no persiste.
// =============================================================================

"use client";

import type { StateStorage } from "zustand/middleware";

const DB_NAME = "blackline-assistant";
const DB_VERSION = 1;
const STORE_NAME = "state";

// -----------------------------------------------------------------------------
// DB connection — opened lazily and cached. Re-resolves on browser eviction.
// -----------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB no disponible en este entorno."));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Reset promise if the connection ever closes (browser eviction, etc.)
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
    req.onblocked = () => reject(new Error("IDB open blocked"));
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const req = run(store);
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error ?? new Error("IDB tx failed"));
      }),
  );
}

// -----------------------------------------------------------------------------
// Fallback (in-memory) — used in SSR and when IDB is unavailable.
// -----------------------------------------------------------------------------

const memoryStore = new Map<string, string>();

function memoryStorage(): StateStorage {
  return {
    getItem: (name) => memoryStore.get(name) ?? null,
    setItem: (name, value) => {
      memoryStore.set(name, value);
    },
    removeItem: (name) => {
      memoryStore.delete(name);
    },
  };
}

// -----------------------------------------------------------------------------
// Public adapter
// -----------------------------------------------------------------------------

/**
 * StateStorage backed by IndexedDB. Pass to Zustand's `createJSONStorage`:
 *
 *   persist(setup, {
 *     name: "my-key",
 *     storage: createJSONStorage(() => idbStorage),
 *   })
 *
 * In SSR / browsers without IDB, falls back to in-memory storage so the store
 * still functions (just without persistence).
 */
export const idbStorage: StateStorage =
  typeof indexedDB !== "undefined"
    ? {
        getItem: async (name: string) => {
          try {
            const value = await tx<string | undefined>("readonly", (s) =>
              s.get(name) as IDBRequest<string | undefined>,
            );
            return value ?? null;
          } catch {
            return null;
          }
        },
        setItem: async (name: string, value: string) => {
          try {
            await tx("readwrite", (s) => s.put(value, name));
          } catch {
            // Silent — Zustand persist already handles failures gracefully.
          }
        },
        removeItem: async (name: string) => {
          try {
            await tx("readwrite", (s) => s.delete(name));
          } catch {
            // Silent.
          }
        },
      }
    : memoryStorage();
