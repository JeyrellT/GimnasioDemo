// =============================================================================
// VIZION — AES-256-GCM symmetric encryption
// Owner: backend-api (spec from cybersecurity-auditor).
//
// Wire format:  version(1B)=0x01 || iv(12B) || ciphertext(N) || tag(16B)
//               → base64-encoded string
//
// Design decisions:
//   - 12-byte IV: GCM NIST recommendation; 96-bit IV avoids the hash-based
//     derivation path, making random IV safe for 2^32 messages per key
//     (birthday bound). Beyond that, rotate the key.
//   - 16-byte auth tag: maximum GCM tag length, maximizes forgery resistance.
//   - AAD: bound to the ciphertext at decrypt time; prevents copy-paste attacks
//     across contexts (e.g., cedula:userId=X can't be decrypted as cedula:userId=Y).
//     Default is empty string — NEVER undefined — to defend against omission attacks
//     where a caller forgets the AAD and accidentally creates context-unbound ciphertexts.
//   - createSecretKey(): wraps the raw Buffer in a KeyObject so the 32 raw bytes
//     do NOT live in the JS heap as a plain Buffer after module init.
//   - Key rotation: encrypt always uses primary. Decrypt tries primary first,
//     then secondary (if present). This allows zero-downtime key rotation:
//     deploy new primary → run rotateEncrypted job → remove old secondary.
//   - Version byte 0x01: enables future algorithm migration without dual-boot
//     ambiguity. Any other version is rejected loudly at the start of decrypt,
//     before any key material is used.
// =============================================================================

import { createCipheriv, createDecipheriv, createSecretKey, randomBytes } from "node:crypto";
import type { KeyObject } from "node:crypto";

import { InternalError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const VERSION = 0x01;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const ALGORITHM = "aes-256-gcm" as const;
const HEADER_BYTES = 1 + IV_BYTES; // version(1) + iv(12)

// -----------------------------------------------------------------------------
// Key loading — validated at module import time so a bad key fails fast.
// -----------------------------------------------------------------------------

function loadKey(b64: string | undefined, label: string): KeyObject | null {
  if (!b64) return null;

  const raw = Buffer.from(b64, "base64");

  if (raw.length !== KEY_BYTES) {
    throw new InternalError(
      "CRYPTO_KEY_INVALID",
      `${label} must decode to exactly ${KEY_BYTES} bytes (got ${raw.length}). Generate with: openssl rand -base64 32`,
    );
  }

  // Wrap in KeyObject — the raw bytes are managed by OpenSSL's key store and
  // do not appear as a plain Buffer in heap snapshots.
  return createSecretKey(raw);
}

// Validate at import time — throws InternalError if PRIMARY is absent or wrong length.
const PRIMARY_KEY = loadKey(process.env.ENCRYPTION_KEY_PRIMARY, "ENCRYPTION_KEY_PRIMARY");
if (!PRIMARY_KEY) {
  throw new InternalError(
    "CRYPTO_KEY_MISSING",
    "ENCRYPTION_KEY_PRIMARY is required. Set it in your environment.",
  );
}

// Secondary is optional — null when not configured (normal state before first rotation).
// Explicitly coerce empty string to undefined so loadKey sees null and skips it.
const SECONDARY_KEY = loadKey(
  process.env.ENCRYPTION_KEY_SECONDARY || undefined,
  "ENCRYPTION_KEY_SECONDARY",
);

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

function encryptWithKey(key: KeyObject, plainBuffer: Buffer, aadBuffer: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  // AAD MUST be set before the first update() call.
  cipher.setAAD(aadBuffer);

  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  // getAuthTag() must be called AFTER final(). Always returns TAG_BYTES bytes.
  const tag = cipher.getAuthTag();

  // Assemble wire format: version || iv || ciphertext || tag
  return Buffer.concat([
    Buffer.from([VERSION]),
    iv,
    encrypted,
    tag,
  ]);
}

function decryptWithKey(key: KeyObject, wire: Buffer, aadBuffer: Buffer): Buffer {
  // Check version FIRST — before touching any key material — to give a clear
  // error on version mismatch instead of a tag-verification failure.
  const version = wire[0];
  if (version !== VERSION) {
    throw new InternalError(
      "CRYPTO_VERSION_UNSUPPORTED",
      `Ciphertext version 0x${version?.toString(16).padStart(2, "0")} is not supported. Expected 0x01.`,
    );
  }

  const minLen = HEADER_BYTES + TAG_BYTES; // 1 + 12 + 16 = 29 bytes minimum
  if (wire.length < minLen) {
    throw new InternalError(
      "CRYPTO_MALFORMED",
      `Ciphertext too short: ${wire.length} bytes (minimum ${minLen}).`,
    );
  }

  const iv = wire.subarray(1, 1 + IV_BYTES);
  const tag = wire.subarray(wire.length - TAG_BYTES);
  const ciphertext = wire.subarray(HEADER_BYTES, wire.length - TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // AAD MUST be set before the first update() call.
  decipher.setAAD(aadBuffer);

  // decipher.final() throws if tag verification fails — that's the integrity check.
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Encrypt a UTF-8 string.
 *
 * AAD defaults to empty string — NOT undefined — to prevent omission attacks
 * where a caller accidentally creates context-unbound ciphertexts.
 * Pass an explicit context string (e.g. "cedula:userId=X") to bind the
 * ciphertext to a specific subject.
 */
export function encrypt(plaintext: string, aad = ""): string {
  const aadBuffer = Buffer.from(aad, "utf8");
  const wire = encryptWithKey(PRIMARY_KEY!, Buffer.from(plaintext, "utf8"), aadBuffer);

  logger.debug({ op: "encrypt", keyVersion: "primary", ok: true }, "crypto.aes");

  return wire.toString("base64");
}

/**
 * Decrypt a base64-encoded ciphertext produced by encrypt().
 * Tries primary key first, then secondary (if configured).
 *
 * Throws AppError on any of:
 *   - CRYPTO_VERSION_UNSUPPORTED: unknown version byte
 *   - CRYPTO_MALFORMED: ciphertext too short
 *   - CRYPTO_DECRYPT_FAILED: tag verification failed with all available keys
 */
export function decrypt(ciphertextB64: string, aad = ""): string {
  return decryptBuffer(ciphertextB64, aad).toString("utf8");
}

/**
 * Encrypt a raw Buffer. Useful for binary payloads (e.g., PDF bytes).
 */
export function encryptBuffer(buf: Buffer, aad = ""): string {
  const aadBuffer = Buffer.from(aad, "utf8");
  const wire = encryptWithKey(PRIMARY_KEY!, buf, aadBuffer);

  logger.debug({ op: "encrypt", keyVersion: "primary", ok: true }, "crypto.aes");

  return wire.toString("base64");
}

/**
 * Decrypt to a raw Buffer.
 * Tries primary key first, then secondary if primary tag-verification fails.
 * Logs only {op, keyVersion, ok} — never logs key material or plaintext.
 */
export function decryptBuffer(b64: string, aad = ""): Buffer {
  const wire = Buffer.from(b64, "base64");
  const aadBuffer = Buffer.from(aad, "utf8");

  // Attempt primary key first.
  try {
    const result = decryptWithKey(PRIMARY_KEY!, wire, aadBuffer);
    logger.debug({ op: "decrypt", keyVersion: "primary", ok: true }, "crypto.aes");
    return result;
  } catch (primaryErr) {
    // Re-throw version/malformed errors immediately — secondary key cannot fix these.
    if (primaryErr instanceof InternalError && (
      primaryErr.code === "INT_CRYPTO_VERSION_UNSUPPORTED" ||
      primaryErr.code === "INT_CRYPTO_MALFORMED"
    )) {
      logger.warn({ op: "decrypt", keyVersion: "primary", ok: false }, "crypto.aes");
      throw primaryErr;
    }

    // Only try secondary if it exists.
    if (!SECONDARY_KEY) {
      logger.warn({ op: "decrypt", keyVersion: "primary", ok: false }, "crypto.aes");
      throw new InternalError(
        "CRYPTO_DECRYPT_FAILED",
        "Decryption failed. No secondary key configured for fallback.",
        primaryErr,
      );
    }
  }

  // Attempt secondary key (fallback for key rotation scenarios).
  try {
    const result = decryptWithKey(SECONDARY_KEY, wire, aadBuffer);
    logger.info({ op: "decrypt", keyVersion: "secondary", ok: true }, "crypto.aes");
    return result;
  } catch (secondaryErr) {
    logger.warn({ op: "decrypt", keyVersion: "secondary", ok: false }, "crypto.aes");
    throw new InternalError(
      "CRYPTO_DECRYPT_FAILED",
      "Decryption failed with both primary and secondary keys.",
      secondaryErr,
    );
  }
}

/**
 * Re-encrypt a ciphertext under the current primary key.
 * Decrypts with whichever key works, then re-encrypts with primary.
 * Used during key rotation jobs to migrate old ciphertexts.
 *
 * The aad must match the one originally used to encrypt.
 */
export function rotateEncrypted(b64: string, aad = ""): string {
  const plainBuffer = decryptBuffer(b64, aad);
  const aadBuffer = Buffer.from(aad, "utf8");
  const wire = encryptWithKey(PRIMARY_KEY!, plainBuffer, aadBuffer);

  logger.debug({ op: "encrypt", keyVersion: "primary", ok: true }, "crypto.aes.rotate");

  return wire.toString("base64");
}

/**
 * Check whether a base64 string looks like a ciphertext produced by this module
 * (version byte 0x01, minimum length). Does NOT verify the tag — use decrypt() for that.
 *
 * Useful as a fast guard before attempting decryption, e.g. in migration scripts.
 */
export function isEncrypted(value: string): boolean {
  try {
    const buf = Buffer.from(value, "base64");
    return buf.length > HEADER_BYTES + TAG_BYTES && buf[0] === VERSION;
  } catch {
    return false;
  }
}
