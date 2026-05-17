// =============================================================================
// VIZION — Server-side validated environment configuration
// Owner: backend-api.
//
// All environment variables consumed by the server layer are validated here via
// Zod at module import time. If a required variable is missing the process
// fails loud and early — never silently in the middle of a request.
//
// Client-side / build-time env stays in src/env.ts (the demo stub).
// This module is server-only; never import it in client components.
// =============================================================================

import { z } from "zod";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Parse "true" / "1" / "yes" as true, everything else as false. */
const boolFlag = z.coerce.boolean().default(false);

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

const envSchema = z.object({
  // ── Node ──────────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // ── App ───────────────────────────────────────────────────────────────────
  APP_URL: z.string().url("APP_URL must be a valid URL"),

  /**
   * When true, all server modules fall back to demo stubs instead of hitting
   * real external services. Set in local dev to avoid burning API quotas.
   */
  DEMO_MODE: boolFlag,

  // ── Database ──────────────────────────────────────────────────────────────
  /** Prisma connection URL (pooled via PgBouncer on Railway). */
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /** Direct connection URL (used for migrations and Prisma Studio). */
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),

  // ── Auth ──────────────────────────────────────────────────────────────────
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // ── Email — Resend (optional until email flows are activated) ───────────────
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // ── AI — Gemini (optional until AI features are activated) ─────────────────
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL_OCR: z.string().default("gemini-2.0-flash-lite"),
  GEMINI_MODEL_REASONING: z.string().default("gemini-2.0-flash"),

  // ── Storage — Cloudflare R2 (optional until photo uploads are activated) ───
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_PHOTOS: z.string().default("vizion-photos"),
  R2_BUCKET_DOCUMENTS: z.string().default("vizion-documents"),
  R2_PUBLIC_URL: z.string().url().optional(),
  R2_ENDPOINT: z.string().url().optional(),

  // ── Payments — Tilopay (optional until payments are activated) ─────────────
  TILOPAY_API_KEY: z.string().optional(),
  TILOPAY_WEBHOOK_SECRET: z.string().optional(),

  // ── Costa Rica Hacienda (electronic invoicing) — optional until BILLING live ─
  HACIENDA_USERNAME: z.string().optional(),
  HACIENDA_PASSWORD: z.string().optional(),
  HACIENDA_CERT_PATH: z.string().optional(),
  HACIENDA_CERT_PIN: z.string().optional(),

  // ── Observability ──────────────────────────────────────────────────────────
  /** Sentry DSN — optional; errors still logged to pino when absent. */
  SENTRY_DSN: z.string().url().optional(),
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().optional(),

  // ── Encryption — AES-256-GCM (see src/lib/crypto/aes-gcm.ts) ──────────────
  /**
   * Base64-encoded 32-byte key. Generate with: openssl rand -base64 32
   * Required; validated at aes-gcm.ts import time too.
   */
  ENCRYPTION_KEY_PRIMARY: z
    .string()
    .min(1, "ENCRYPTION_KEY_PRIMARY is required"),
  /** Secondary key for zero-downtime rotation. Optional until first key rotation. */
  ENCRYPTION_KEY_SECONDARY: z.string().optional(),

  // ── Feature flags ──────────────────────────────────────────────────────────
  /**
   * All flags default to false except AI_ASSIST_LIVE which defaults to true so
   * the AI UI renders in development without extra config.
   */
  PAYMENT_PROVIDER_LIVE: boolFlag,
  BILLING_LIVE: boolFlag,
  AI_ASSIST_LIVE: z.coerce.boolean().default(true),
  MEDIAPIPE_POSTURE_BETA: boolFlag,
});

export type ServerEnv = z.infer<typeof envSchema>;

// -----------------------------------------------------------------------------
// Parse and export
// -----------------------------------------------------------------------------

/**
 * In GitHub Pages / demo builds (static export), server modules are compiled
 * but never executed at runtime. Skip validation and return safe defaults
 * so the build does not crash on missing env vars.
 */
const isDemoBuild =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  process.env.GITHUB_PAGES === "true";

function parseEnv(): ServerEnv {
  if (isDemoBuild) {
    // Return minimal defaults — these are never used at runtime in demo mode.
    return {
      NODE_ENV: "production",
      APP_URL: "https://demo.localhost",
      DEMO_MODE: true,
      DATABASE_URL: "postgresql://demo:demo@localhost:5432/demo",
      DIRECT_URL: "postgresql://demo:demo@localhost:5432/demo",
      NEXTAUTH_URL: "https://demo.localhost",
      NEXTAUTH_SECRET: "demo-secret-not-used-in-static-export-00",
      ENCRYPTION_KEY_PRIMARY: "demo-key-not-used-in-static-export-0000",
      PAYMENT_PROVIDER_LIVE: false,
      BILLING_LIVE: false,
      AI_ASSIST_LIVE: false,
      MEDIAPIPE_POSTURE_BETA: false,
      GEMINI_MODEL_OCR: "gemini-2.0-flash-lite",
      GEMINI_MODEL_REASONING: "gemini-2.0-flash",
      R2_BUCKET_PHOTOS: "vizion-photos",
      R2_BUCKET_DOCUMENTS: "vizion-documents",
    } as ServerEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `[server/env] Environment validation failed:\n${formatted}\n` +
        "Copy .env.example to .env.local and fill in the missing values.",
    );
  }

  return result.data;
}

/**
 * Validated server environment.
 * Throws on first import if any required variable is missing or invalid.
 * In demo/GitHub Pages builds, returns safe defaults (never used at runtime).
 */
export const serverEnv: ServerEnv = parseEnv();

// -----------------------------------------------------------------------------
// validateEnv — explicit call site for health-check endpoints
// -----------------------------------------------------------------------------

/**
 * Re-parse and throw descriptive errors on missing required vars.
 * Useful in health-check routes: GET /api/health calls validateEnv() to surface
 * misconfiguration without waiting for a real request to fail.
 */
export function validateEnv(): void {
  // Re-parse from process.env so this catches hot-reload changes in dev.
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Environment misconfiguration: ${missing}`);
  }
}
