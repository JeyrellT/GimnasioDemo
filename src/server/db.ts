// =============================================================================
// VIZION — Real Prisma client singleton
// Owner: backend-api.
//
// Two exports:
//   prisma        — soft-delete-aware client (auto-filters deletedAt IS NULL)
//   prismaRaw     — unfiltered client for admin / LPDP queries
//
// The globalThis caching pattern prevents Next.js hot-reload from exhausting
// the Postgres connection pool by re-instantiating PrismaClient on every HMR.
//
// Soft-delete middleware:
//   Intercepts findMany, findFirst, findUnique (and their OrThrow variants) and
//   injects `where: { deletedAt: null }` automatically. This protects every
//   domain query from accidentally reading soft-deleted records without requiring
//   callers to remember the filter.
//
//   Caveat: `upsert`, `update`, `create`, `delete` are NOT intercepted — callers
//   remain responsible for correctly setting/clearing deletedAt.
// =============================================================================

import { PrismaClient } from "@prisma/client";

import { serverEnv } from "@/server/env";
import { logInfo, logWarn } from "@/lib/logger";

// -----------------------------------------------------------------------------
// Global caching types — prevents multiple instances during hot reload
// -----------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __prismaRaw: PrismaClient | undefined;
}

// -----------------------------------------------------------------------------
// Factory — creates a PrismaClient with connection logging in development
// -----------------------------------------------------------------------------

function createClient(label: string): PrismaClient {
  const client = new PrismaClient({
    datasourceUrl: serverEnv.DATABASE_URL,
    log:
      serverEnv.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "event", level: "warn" },
            { emit: "event", level: "error" },
          ]
        : [{ emit: "event", level: "error" }],
  });

  if (serverEnv.NODE_ENV === "development") {
    // Log slow queries (>500ms) and all warnings.
    // The `as any` is unavoidable — the Prisma event type is only available
    // after the specific log config has been set.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).$on("query", (e: { query: string; duration: number }) => {
      if (e.duration > 500) {
        logWarn(`[${label}] Slow query (${e.duration}ms)`, {
          query: e.query.slice(0, 200),
        });
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).$on("warn", (e: { message: string }) => {
      logWarn(`[${label}] Prisma warning`, { message: e.message });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).$on("error", (e: { message: string }) => {
    // Errors always logged regardless of NODE_ENV.
    logWarn(`[${label}] Prisma error`, { message: e.message });
  });

  logInfo(`[${label}] Prisma client created`, { env: serverEnv.NODE_ENV });

  return client;
}

// -----------------------------------------------------------------------------
// Soft-delete middleware
// -----------------------------------------------------------------------------

// Operations that should have deletedAt IS NULL injected automatically.
const SOFT_FILTERED_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
]);

/**
 * Prisma middleware that auto-injects `where: { deletedAt: null }` on read
 * operations, unless the caller explicitly passes `deletedAt` in their where
 * clause (which signals an intentional query on soft-deleted records).
 */
function softDeleteMiddleware(): Parameters<PrismaClient["$use"]>[0] {
  return async (params, next) => {
    if (params.action && SOFT_FILTERED_OPS.has(params.action)) {
      // If the caller already filters on deletedAt, respect their intent.
      if (
        params.args?.where !== undefined &&
        "deletedAt" in (params.args.where as Record<string, unknown>)
      ) {
        return next(params);
      }

      // Inject the soft-delete filter.
      params.args = params.args ?? {};
      params.args.where = {
        ...(params.args.where ?? {}),
        deletedAt: null,
      };
    }

    return next(params);
  };
}

// -----------------------------------------------------------------------------
// Singleton: prisma (soft-delete aware)
// -----------------------------------------------------------------------------

function getSoftClient(): PrismaClient {
  if (globalThis.__prisma) return globalThis.__prisma;

  const client = createClient("prisma");
  // $use is the legacy middleware API — still the correct API in Prisma 5/6 for
  // query-level middleware without the query extension overhead.
  client.$use(softDeleteMiddleware());

  globalThis.__prisma = client;
  return client;
}

// -----------------------------------------------------------------------------
// Singleton: prismaRaw (no soft-delete filter — admin / LPDP use only)
// -----------------------------------------------------------------------------

function getRawClient(): PrismaClient {
  if (globalThis.__prismaRaw) return globalThis.__prismaRaw;

  const client = createClient("prismaRaw");
  globalThis.__prismaRaw = client;
  return client;
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

/**
 * Soft-delete-aware Prisma client.
 * All findMany / findFirst / findUnique queries automatically exclude rows
 * where `deletedAt IS NOT NULL`.
 *
 * Use this for all regular domain queries.
 */
export const prisma: PrismaClient = getSoftClient();

/**
 * Unfiltered Prisma client — no soft-delete middleware applied.
 * Use ONLY for:
 *   - Admin queries that must see deleted records
 *   - LPDP data exports (must include deleted user data)
 *   - Hard-delete operations
 *
 * Every use of prismaRaw should be accompanied by a comment explaining why.
 */
export const prismaRaw: PrismaClient = getRawClient();

// Re-export Prisma namespace for type imports at the db layer.
export { Prisma } from "@prisma/client";

export default prisma;
