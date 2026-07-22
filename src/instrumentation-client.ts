/**
 * Sentry browser-side instrumentation.
 *
 * Required env: NEXT_PUBLIC_SENTRY_DSN (set in Railway). Same DSN value as
 * server-side SENTRY_DSN; the NEXT_PUBLIC_ prefix exposes it to the client bundle.
 * Without it, this file is a no-op (zero bytes shipped).
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.05,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    enabled: process.env.NODE_ENV === "production",
  });
}

// Note: onRouterTransitionStart is a Sentry 9+ API. On 8.x we omit it and rely
// on automatic instrumentation. Upgrade to @sentry/nextjs@9+ to enable.
