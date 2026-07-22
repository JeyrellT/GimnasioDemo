// =============================================================================
// BLACKLINE FITNESS — Global constants
// Owner: backend-api.
//
// Immutable values used across the server layer.
// Keep business logic OUT of this file — only literals and derived constants.
// =============================================================================

import type { SubscriptionTier } from "@prisma/client";

// ── App identity ─────────────────────────────────────────────────────────────

export const APP_NAME = "Blackline Fitness" as const;
export const DEFAULT_LOCALE = "es-CR" as const;
export const DEFAULT_TZ = "America/Costa_Rica" as const;
export const DEFAULT_CURRENCY = "CRC" as const;

// ── Tax ──────────────────────────────────────────────────────────────────────

/** IVA rate in Costa Rica (13%). */
export const IVA_PCT = 0.13 as const;

// ── Subscription tiers — max active clients per plan ────────────────────────

export const MAX_CLIENTS_BY_TIER: Record<SubscriptionTier, number> = {
  SOLO: 5,
  PRO: 25,
  STUDIO: 60,
};

/** Monthly prices in CRC with IVA included (as shown in public pricing page). */
export const PLAN_PRICE_CRC: Record<SubscriptionTier, number> = {
  SOLO: 8_900,
  PRO: 22_900,
  STUDIO: 44_900,
};

// ── Trial / invitations / tokens ─────────────────────────────────────────────

export const TRIAL_DAYS = 30 as const;
export const READ_ONLY_GRACE_DAYS = 14 as const;
export const INVITATION_EXPIRY_DAYS = 7 as const;
export const MAGIC_LINK_EXPIRY_MIN = 15 as const;
/** Password reset link validity window (minutes). */
export const PASSWORD_RESET_EXPIRY_MIN = 30 as const;

// ── Storage ──────────────────────────────────────────────────────────────────

/** Signed URL TTL for reading files (photos, documents). */
export const PRESIGNED_URL_TTL_SEC = 300 as const; // 5 minutes

/** Signed URL TTL for LPDP data exports. */
export const LPDP_EXPORT_URL_TTL_SEC = 604800; // 7 days (7 * 24 * 60 * 60)

/** Maximum photo upload size (10 MB). */
export const MAX_PHOTO_SIZE_BYTES = 10485760; // 10 * 1024 * 1024

/** Maximum document upload size (25 MB). */
export const MAX_DOCUMENT_SIZE_BYTES = 26214400; // 25 * 1024 * 1024

/** Target JPEG quality for progress photos (see PRODUCT_DECISIONS §4). */
export const PHOTO_JPEG_QUALITY = 80 as const;

/** Maximum dimension (px) before server-side resize. */
export const PHOTO_MAX_DIMENSION_PX = 1_920 as const;

// ── Routines ─────────────────────────────────────────────────────────────────

export const ROUTINE_MAX_DAYS_PER_WEEK = 6 as const;
export const ROUTINE_DEFAULT_DURATION_WEEKS = 8 as const;
export const ROUTINE_MAX_SETS_PER_EXERCISE = 10 as const;
export const ROUTINE_MAX_EXERCISES_PER_DAY = 20 as const;

// ── Sessions ─────────────────────────────────────────────────────────────────

/** Subjective fatigue scale (1–10). */
export const FATIGUE_SCALE_MIN = 1 as const;
export const FATIGUE_SCALE_MAX = 10 as const;

/** RPE scale (6–10, Borg). */
export const RPE_MIN = 1 as const;
export const RPE_MAX = 10 as const;

// ── LPDP / Ley 8968 ─────────────────────────────────────────────────────────

/** Grace period before hard-delete after account deletion request. */
export const LPDP_DELETE_GRACE_DAYS = 30 as const;

/** Consent versions — bump when legal text changes. */
export const CONSENT_VERSIONS = {
  TERMS_AND_PRIVACY: "1.0",
  HEALTH_DATA: "1.0",
  AI_PROCESSING: "1.0",
  MARKETING: "1.0",
} as const;

// ── Hacienda 4.4 ─────────────────────────────────────────────────────────────

/** Hacienda standard activity code for professional services / fitness. */
export const CABYS_CODE_FITNESS_SERVICES = "9000000000000" as const;

/** Hacienda country ISO 3166-1 numeric for Costa Rica. */
export const PAIS_ISO_COSTA_RICA = "506" as const;

/** Default sucursal and terminal for single-location trainers. */
export const HACIENDA_DEFAULT_SUCURSAL = "001" as const;
export const HACIENDA_DEFAULT_TERMINAL = "00001" as const;

/** Payment condition code: Contado. */
export const HACIENDA_CONDICION_CONTADO = "01" as const;

/** Payment method code: Transferencia. */
export const HACIENDA_MEDIO_PAGO_TRANSFERENCIA = "02" as const;

// ── Emails ───────────────────────────────────────────────────────────────────

export const EMAIL_SUPPORT = "soporte@blacklinefitness.app" as const;
export const EMAIL_DPO = "dpo@blacklinefitness.app" as const;
export const EMAIL_NO_REPLY = "noreply@blacklinefitness.app" as const;
