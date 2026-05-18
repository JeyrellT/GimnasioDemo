// =============================================================================
// VIZION — Environment guard (public re-export)
// Owner: backend-api.
//
// Re-exports the validated server environment from src/server/env.ts.
// Importing this module causes the process to fail at startup — not at
// request time — if any required environment variable is missing or invalid.
//
// This module is also imported from next.config.ts (via validateEnv()) so
// that `next build` and `next start` fail immediately on misconfiguration.
//
// Do NOT import in client components; use NEXT_PUBLIC_* env vars there.
// =============================================================================

export { serverEnv, validateEnv } from "@/server/env";
export type { ServerEnv } from "@/server/env";
