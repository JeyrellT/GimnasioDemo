/**
 * Sentry server + edge instrumentation.
 *
 * Loaded automatically by Next.js 15 when `src/instrumentation.ts` exists.
 * SENTRY_DSN is optional — if absent, init is skipped (graceful no-op).
 *
 * Setup required in Railway dashboard:
 *   SENTRY_DSN=https://...@sentry.io/...   (server)
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "production",
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === "production",
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "production",
      tracesSampleRate: 0.05,
      enabled: process.env.NODE_ENV === "production",
    });
  }
}

export async function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRequestError(...args);
}
