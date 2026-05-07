// =============================================================================
// FORJA — Feature flags wrapper
// Owner: backend-api.
//
// Reads from env.ts by default. Structured so that migrating to
// Vercel Edge Config (or LaunchDarkly, etc.) in the future is a single-file
// change with no API surface breakage for callers.
//
// Usage:
//   import { isFlagOn } from "@/lib/flags";
//   if (isFlagOn("PAYMENT")) { ... }
// =============================================================================

import { env } from "@/env";
import { ForbiddenError } from "@/lib/errors";

// -----------------------------------------------------------------------------
// Flag registry
// -----------------------------------------------------------------------------

export type FeatureFlag = "PAYMENT" | "BILLING" | "AI_ASSIST" | "POSTURE";

/**
 * Map from flag name to the env var that backs it.
 * When migrating to Edge Config, replace this map with a remote read.
 */
const FLAG_ENV_MAP: Record<FeatureFlag, boolean> = {
  PAYMENT: env.PAYMENT_PROVIDER_LIVE,
  BILLING: env.BILLING_LIVE,
  AI_ASSIST: env.AI_ASSIST_LIVE,
  POSTURE: env.MEDIAPIPE_POSTURE_BETA,
};

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Returns whether a feature flag is enabled.
 *
 * Currently backed by env vars parsed at startup.
 * Future: replace body with an Edge Config read (async-safe via React cache).
 */
export function isFlagOn(flag: FeatureFlag): boolean {
  return FLAG_ENV_MAP[flag] === true;
}

/**
 * Assert a flag is on, throwing ForbiddenError if not.
 * Useful in Route Handlers to gate entire endpoints:
 *   requireFlag("BILLING");
 *   requireFlag("PAYMENT", "procesar pagos");
 *
 * @param flag  The feature flag to check.
 * @param op    Optional human-readable operation name for the error message.
 *
 * Throws ForbiddenError (code FBN_FEATURE_DISABLED, HTTP 403) so Route Handler
 * boundaries can catch it with instanceof and return the correct HTTP status.
 * The user-facing message uses voseo CR.
 */
export function requireFlag(flag: FeatureFlag, op?: string): void {
  if (!isFlagOn(flag)) {
    throw new ForbiddenError(
      "FEATURE_DISABLED",
      "Esta función está desactivada por ahora.",
    );
  }
  void op; // op is accepted for call-site documentation but the user message is fixed.
}
