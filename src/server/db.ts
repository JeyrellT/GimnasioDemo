// =============================================================================
// BLACKLINE FITNESS — Real Prisma client singleton
// Owner: backend-api.
//
// Two exports:
//   prisma        — soft-delete-aware client (auto-filters deletedAt IS NULL)
//   prismaRaw     — unfiltered client for admin / LPDP / PrismaAdapter queries
//
// The globalThis caching pattern prevents Next.js hot-reload from exhausting
// the Postgres connection pool by re-instantiating PrismaClient on every HMR.
//
// Soft-delete extension (Prisma 6 Client Extensions API):
//   Intercepts findMany, findFirst, findUnique (and their OrThrow variants) and
//   injects `where: { deletedAt: null }` automatically. This protects every
//   domain query from accidentally reading soft-deleted records without requiring
//   callers to remember the filter.
//
//   Models WITHOUT a deletedAt column are skipped via NO_SOFT_DELETE (see
//   below). The set must stay in sync with the schema — adding a model that
//   lacks deletedAt without listing it here will throw "Unknown argument
//   deletedAt" on any findMany/findFirst/findUnique against that model.
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

type SoftDeleteClient = ReturnType<typeof buildSoftDeleteClient>;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: SoftDeleteClient | undefined;
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
    logWarn(`[${label}] Prisma error`, { message: e.message });
  });

  logInfo(`[${label}] Prisma client created`, { env: serverEnv.NODE_ENV });

  return client;
}

// -----------------------------------------------------------------------------
// Soft-delete extension (Prisma 6 Client Extensions API)
// -----------------------------------------------------------------------------

// Models WITHOUT a `deletedAt` column — skip soft-delete injection for these.
// Injecting `deletedAt: null` against a model that lacks the column makes
// Prisma reject the call with "Unknown argument deletedAt", so this list must
// stay in sync with the schema.
const NO_SOFT_DELETE = new Set([
  // NextAuth tables (managed by @auth/prisma-adapter)
  "Account",
  "Session",
  "VerificationToken",
  // Domain tables that don't soft-delete
  "AuditLog",
  "ClientRestPreference",
  "CustomGoal",
  "KnowledgeChunk",
  "OnboardingDraft",
  "PaymentEvent",
  "Referral",
  "UserAvatar",
]);

/**
 * Helper: injects `deletedAt: null` into the where clause if applicable.
 * Skips models without deletedAt and respects explicit deletedAt filters.
 */
function injectSoftFilter(
  model: string | undefined,
  args: Record<string, unknown>,
): void {
  if (!model || NO_SOFT_DELETE.has(model)) return;

  const where = (args.where ?? {}) as Record<string, unknown>;

  // If the caller already filters on deletedAt, respect their intent.
  if ("deletedAt" in where) return;

  args.where = { ...where, deletedAt: null };
}

/**
 * Builds an extended Prisma client with automatic soft-delete filtering
 * on all read operations (findMany, findFirst, findUnique + OrThrow variants).
 */
function buildSoftDeleteClient(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          injectSoftFilter(model, args as Record<string, unknown>);
          return query(args);
        },
        async findFirst({ model, args, query }) {
          injectSoftFilter(model, args as Record<string, unknown>);
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          injectSoftFilter(model, args as Record<string, unknown>);
          return query(args);
        },
        async findUnique({ model, args, query }) {
          injectSoftFilter(model, args as Record<string, unknown>);
          return query(args);
        },
        async findUniqueOrThrow({ model, args, query }) {
          injectSoftFilter(model, args as Record<string, unknown>);
          return query(args);
        },
      },
    },
  });
}

// -----------------------------------------------------------------------------
// Singleton: prisma (soft-delete aware)
// -----------------------------------------------------------------------------

function getSoftClient(): SoftDeleteClient {
  if (globalThis.__prisma) return globalThis.__prisma;

  const base = createClient("prisma");
  const client = buildSoftDeleteClient(base);

  globalThis.__prisma = client;
  return client;
}

// -----------------------------------------------------------------------------
// Singleton: prismaRaw (no soft-delete filter — admin / LPDP / auth adapter)
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
 * Soft-delete-aware Prisma client (extended via Prisma 6 Client Extensions).
 * All findMany / findFirst / findUnique queries automatically exclude rows
 * where `deletedAt IS NOT NULL`.
 *
 * Use this for all regular domain queries.
 */
export const prisma = getSoftClient();

/**
 * Unfiltered Prisma client — no soft-delete extension applied.
 * Use ONLY for:
 *   - PrismaAdapter (NextAuth — auth tables don't have deletedAt)
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
