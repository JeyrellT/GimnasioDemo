// =============================================================================
// VIZION — Anonymization helpers (defense in depth before sending to Gemini)
// Owner: ai-orchestrator.
//
// Authoritative EXIF stripping is performed by backend-api in
// `@/lib/storage/strip-exif.ts` BEFORE the buffer reaches us. This module is a
// final safety net: we sniff for residual APP1 (EXIF) markers in JPEG and warn
// loudly if any survived, but we do NOT block the request. Blocking would
// create a foot-gun where a slightly non-standard image fails OCR for the
// wrong reason.
//
// Future hooks (not in MVP):
//   - 'cedula': opt-in face blurring on the photo regions of the card.
//   - 'scale':  smart-crop to the LCD/LED display when the client passes a
//     bounding box hint.
// =============================================================================

import { createId } from "@paralleldrive/cuid2";

import { ValidationError, type AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export type AnonymizeKind = "cedula" | "scale";

export interface AnonymizeArgs {
  buffer: Buffer;
  mimeType: string;
  type: AnonymizeKind;
  /** Correlation id for log lines (no PII). Generated if not supplied. */
  requestId?: string;
}

export interface AnonymizeResultMeta {
  buffer: Buffer;
  requestId: string;
  exifResidualDetected: boolean;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB hard cap for OCR uploads.

// JPEG SOI marker
const JPEG_SOI_0 = 0xff;
const JPEG_SOI_1 = 0xd8;
// JPEG APP1 marker (where EXIF lives)
const JPEG_APP1_0 = 0xff;
const JPEG_APP1_1 = 0xe1;
// EXIF identifier inside APP1: "Exif\0\0"
const EXIF_IDENTIFIER = Buffer.from([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);

// -----------------------------------------------------------------------------
// generateRequestId — short opaque id, no PII
// -----------------------------------------------------------------------------

export function generateRequestId(): string {
  return createId();
}

// -----------------------------------------------------------------------------
// hasExifResidual — quick sniff for surviving APP1/EXIF segment in JPEG
// -----------------------------------------------------------------------------

function hasExifResidual(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer[0] !== JPEG_SOI_0 || buffer[1] !== JPEG_SOI_1) {
    // Not a JPEG — PNG and WebP have different metadata containers; we don't
    // sniff those here because backend-api strip-exif handles them.
    return false;
  }

  // Walk JPEG markers. Each segment after SOI starts with 0xFF + marker byte.
  // We stop at SOS (0xFFDA) because pixel data follows.
  let i = 2;
  while (i < buffer.length - 4) {
    if (buffer[i] !== 0xff) {
      // Resync — JPEG markers must start with 0xFF; bail out conservatively.
      return false;
    }
    const marker = buffer[i + 1];
    if (marker === undefined) return false;

    // SOS — start of scan, stop walking.
    if (marker === 0xda) return false;

    // APP1 candidate.
    if (buffer[i] === JPEG_APP1_0 && marker === JPEG_APP1_1) {
      const segLen = buffer.readUInt16BE(i + 2);
      const idStart = i + 4;
      const idEnd = idStart + EXIF_IDENTIFIER.length;
      if (idEnd <= buffer.length) {
        const slice = buffer.subarray(idStart, idEnd);
        if (slice.equals(EXIF_IDENTIFIER)) {
          return true;
        }
      }
      // Not EXIF — could be XMP. Skip segment.
      i += 2 + segLen;
      continue;
    }

    // Skip unknown segment using its length field (big-endian uint16 after marker).
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      // Standalone markers without length — advance 2 bytes.
      i += 2;
      continue;
    }
    const segLen = buffer.readUInt16BE(i + 2);
    if (segLen < 2) return false;
    i += 2 + segLen;
  }
  return false;
}

// -----------------------------------------------------------------------------
// validateBuffer — mime + size guards run before any anonymization step
// -----------------------------------------------------------------------------

function validateBuffer({
  buffer,
  mimeType,
}: {
  buffer: Buffer;
  mimeType: string;
}): Result<true, AppError> {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return err(
      new ValidationError(
        "OCR_MIME_UNSUPPORTED",
        "Formato de imagen no soportado. Usá JPEG, PNG o WebP.",
      ),
    );
  }
  if (buffer.length === 0) {
    return err(
      new ValidationError("OCR_EMPTY_BUFFER", "La imagen está vacía."),
    );
  }
  if (buffer.length > MAX_BYTES) {
    return err(
      new ValidationError(
        "OCR_TOO_LARGE",
        "La imagen supera 5 MB. Reducí el tamaño antes de subirla.",
      ),
    );
  }
  return ok(true as const);
}

// -----------------------------------------------------------------------------
// anonymizeImagePreUpload — main entry point
// -----------------------------------------------------------------------------

export async function anonymizeImagePreUpload(
  args: AnonymizeArgs,
): Promise<Result<AnonymizeResultMeta, AppError>> {
  const { buffer, mimeType, type } = args;
  const requestId = args.requestId ?? generateRequestId();

  const guard = validateBuffer({ buffer, mimeType });
  if (!guard.ok) return err(guard.error);

  const exifResidualDetected =
    mimeType === "image/jpeg" ? hasExifResidual(buffer) : false;

  if (exifResidualDetected) {
    // Defense in depth: strip-exif upstream should have removed this. We log
    // loudly but pass through — blocking here would create false negatives on
    // edge encoders that retain a tiny APP1 with no real metadata.
    logger.warn(
      { requestId, type, mimeType, sizeBytes: buffer.length },
      "ai.anonymize.exif_residual_detected",
    );
  }

  // MVP: no pixel-level transforms. Hooks reserved for V1.1.
  // TODO(ai-orchestrator): face blurring on cedula photos (opt-in).
  // TODO(ai-orchestrator): smart crop to display region for scale OCR.

  return ok({
    buffer,
    requestId,
    exifResidualDetected,
  });
}

// -----------------------------------------------------------------------------
// redactForLogs — strip identifying fields before passing extraction to logger
// -----------------------------------------------------------------------------

interface RedactableExtraction {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: unknown;
}

const PII_KEYS = new Set<string>([
  "numeroCedula",
  "primerApellido",
  "segundoApellido",
  "nombre",
  "fechaNacimiento",
  "fechaVencimiento",
]);

/**
 * Returns a shallow copy of an extraction object suitable for logging:
 * any PII field is replaced by a presence boolean. Non-PII fields
 * (confidence, isValidId, warnings count, etc.) are preserved.
 */
export function redactForLogs(
  extraction: RedactableExtraction,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extraction)) {
    if (PII_KEYS.has(key)) {
      out[`${key}_present`] = value !== null && value !== undefined;
      continue;
    }
    if (key === "warnings" && Array.isArray(value)) {
      out.warningCount = value.length;
      continue;
    }
    out[key] = value;
  }
  return out;
}
