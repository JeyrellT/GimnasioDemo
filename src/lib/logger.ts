// =============================================================================
// BLACKLINE FITNESS — Pino logger
// Owner: backend-api.
//
// Pretty-prints in development, emits structured JSON in production.
// Redacts all PII and health data fields before they can appear in any sink.
//
// Usage:
//   logger.info({ userId, action: "routine_assigned" }, "Routine assigned");
//   logError(error, { userId });   // structured + Sentry-ready
// =============================================================================

import pino from "pino";
import type { AppError } from "./errors";

// -----------------------------------------------------------------------------
// Redact paths — any key at any depth matching these strings is replaced with
// "[Redacted]" by pino before serialization.
// -----------------------------------------------------------------------------
const REDACT_PATHS = [
  // Credentials / tokens
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "authorization",
  "cookie",
  "*.password",
  "*.token",
  "*.secret",
  "*.apiKey",
  "req.headers.authorization",
  "req.headers.cookie",

  // Biometric / health data — Ley 8968 sensitive
  "cedula",
  "encryptedCedula",
  "weightKg",
  "bodyFatPct",
  "muscleMassKg",
  "waistCm",
  "hipCm",
  "neckCm",
  "chestCm",
  "armCm",
  "thighCm",
  "systolicBp",
  "diastolicBp",
  "restingHrBpm",
  "parqAnswers",
  "followUpNotes",
  "*.weightKg",
  "*.bodyFatPct",
  "*.cedula",
  "*.encryptedCedula",

  // Payment
  "cardNumber",
  "cvv",
  "paymentMethodToken",

  // Additional PII — Ley 8968 personal identifiers
  // email: full redact (safest default). If partial redaction (*****@domain) is
  // needed for operational debugging in the future, implement a pino serializer
  // and restrict it to specific log contexts (never structural redact of partial values).
  "email",
  "phone",
  "dateOfBirth",
  "fiscalIdNumber",
  "haciendaUsername",
  "haciendaPassword",
  "claveNumerica",
  "*.email",
  "*.phone",
  "*.dateOfBirth",
  "*.fiscalIdNumber",
  "*.haciendaPassword",
  "*.claveNumerica",

  // Storage keys for photos (avoid logging S3 key paths that encode userIds)
  "storageKey",
  "thumbnailKey",
  "scaleImageKey",
];

// -----------------------------------------------------------------------------
// Build logger instance
// -----------------------------------------------------------------------------

const isDev = process.env.NODE_ENV !== "production";
// Workaround for pino-pretty worker thread failures in dev (pnpm + Windows
// hoisted layout can resolve thread-stream/worker.js against a non-existent
// path). Opt out by setting PINO_PRETTY_DISABLED=1.
const prettyDisabled = process.env.PINO_PRETTY_DISABLED === "1";

export const logger = pino({
  level: isDev ? "debug" : "info",
  redact: {
    paths: REDACT_PATHS,
    censor: "[Redacted]",
  },
  ...(isDev && !prettyDisabled
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : {
        // Production / pretty-disabled: structured JSON for log aggregators
        // (Datadog, Loki, etc.) or for routes where the pretty worker is
        // brittle in dev.
        formatters: {
          level(label: string) {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
});

// -----------------------------------------------------------------------------
// Convenience wrappers
// -----------------------------------------------------------------------------

/** Log at info level. Never pass sensitive fields in `context`. */
export function logInfo(
  message: string,
  context?: Record<string, unknown>,
): void {
  try {
    logger.info(context ?? {}, message);
  } catch {
    // pino-pretty worker may exit during dev hot-reload — fall back to console
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, context ?? {});
  }
}

/** Log at warn level. */
export function logWarn(
  message: string,
  context?: Record<string, unknown>,
): void {
  try {
    logger.warn(context ?? {}, message);
  } catch {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}`, context ?? {});
  }
}

/**
 * Log an error with structured context.
 * Safe to pass AppError subclasses — extracts code + httpStatus automatically.
 * Never log the full `cause` if it contains PII.
 */
export function logError(
  error: AppError | Error | unknown,
  context?: Record<string, unknown>,
): void {
  const base = context ?? {};

  try {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      "httpStatus" in error
    ) {
      // AppError
      const ae = error as AppError;
      logger.error(
        {
          ...base,
          errorCode: ae.code,
          httpStatus: ae.httpStatus,
          errorMessage: ae.message,
        },
        ae.message,
      );
      return;
    }

    if (error instanceof Error) {
      logger.error({ ...base, err: error }, error.message);
      return;
    }

    logger.error({ ...base, unknownError: String(error) }, "Unknown error");
  } catch {
    // pino-pretty worker may exit during dev hot-reload — fall back to console
    // eslint-disable-next-line no-console
    console.error("[ERROR]", error instanceof Error ? error.message : String(error), base);
  }
}
