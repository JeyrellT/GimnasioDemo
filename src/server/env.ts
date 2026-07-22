// =============================================================================
// BLACKLINE FITNESS — Server-side validated environment configuration
// Owner: backend-api.
//
// All environment variables consumed by the server layer are validated here via
// Zod at module import time. If a required variable is missing the process
// fails loud and early — never silently in the middle of a request.
//
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

	// ── Admin bootstrap ───────────────────────────────────────────────────────
	// Email of the user to be promoted to SUPER_ADMIN by the seed script
	// (prisma/seed/super-admin.ts). Optional — only required at seed time.
	SUPER_ADMIN_EMAIL: z.string().email().optional(),
	// Secret used to sign the impersonation cookie. Must differ from
	// NEXTAUTH_SECRET so leaking one doesn't compromise the other. Min 32 chars.
	IMPERSONATION_SECRET: z
		.string()
		.min(32, "IMPERSONATION_SECRET must be at least 32 characters")
		.optional(),

	// ── Email — Gmail SMTP via nodemailer ─────────────────────────────────────
	// Active transport. Requires 2FA + App Password on the GMAIL_USER account.
	// Generate at: https://myaccount.google.com/apppasswords
	GMAIL_USER: z.string().email().optional(),
	GMAIL_APP_PASSWORD: z.string().min(1).optional(),
	GMAIL_FROM_NAME: z.string().default("Blackline Fitness"),
	CLIENT_INVITATION_FROM_EMAIL: z.string().email().default("jeug777@gmail.com"),

	// ── Email — Resend (legacy, kept for backward compat) ─────────────────────
	RESEND_API_KEY: z.string().optional(),
	RESEND_FROM_EMAIL: z.string().email().optional(),

	// ── AI — Gemini (optional until AI features are activated) ─────────────────
	GEMINI_API_KEY: z.string().optional(),
	GEMINI_MODEL_OCR: z.string().default("gemini-2.5-flash"),
	GEMINI_MODEL_REASONING: z.string().default("gemini-2.5-flash"),

	// ── Storage — Cloudflare R2 (optional until photo uploads are activated) ───
	R2_ACCOUNT_ID: z.string().optional(),
	R2_ACCESS_KEY_ID: z.string().optional(),
	R2_SECRET_ACCESS_KEY: z.string().optional(),
	R2_BUCKET_PHOTOS: z.string().default("blackline-fitness-photos"),
	R2_BUCKET_DOCUMENTS: z.string().default("blackline-fitness-documents"),
	R2_PUBLIC_URL: z.string().url().optional(),
	R2_ENDPOINT: z.string().url().optional(),

	// ── Payments — Tilopay (legacy stub; replaced by ONVO) ────────────────────
	TILOPAY_API_KEY: z.string().optional(),
	TILOPAY_WEBHOOK_SECRET: z.string().optional(),

	// ── Payments — ONVO Pay (active card gateway) ─────────────────────────────
	// ONE host for test AND live; the KEY decides the mode (onvo_test_* / onvo_live_*).
	// The whole gateway is inert until ONVO_SECRET_KEY + ONVO_PUBLIC_KEY are set.
	ONVO_BASE_URL: z.string().url().default("https://api.onvopay.com/v1"),
	ONVO_PUBLIC_KEY: z.string().optional(), // publishable — safe to expose to the frontend
	ONVO_SECRET_KEY: z.string().optional(), // BACKEND ONLY — never expose or log
	ONVO_WEBHOOK_SECRET: z.string().optional(), // from the ONVO webhook endpoint (webhook_secret_…)

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

function parseEnv(): ServerEnv {
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
