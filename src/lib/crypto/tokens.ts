// =============================================================================
// BLACKLINE FITNESS — Cryptographic token utilities
// Owner: backend-api (spec from cybersecurity-auditor).
//
// Design decisions:
//   - All randomness: node:crypto (CSPRNG). Math.random is never used.
//   - generateSecureRandomString: rejection sampling to eliminate modular bias.
//     Naive `byte % alphabetLen` has bias when 256 % len != 0. We discard
//     bytes >= floor(256/len)*len and re-sample. Expected iterations: <2 per
//     character for alphabets where len < 128.
//   - timingSafeEqual: length-checked before calling to avoid the throw-on-
//     mismatch behaviour; wrapped in try/catch as belt-and-suspenders.
//   - signDownloadToken / verifyDownloadToken: JOSE compact JWS (HS256) using
//     jose library already in the dependency tree via next-auth.
//     Audience is narrowed to "blackline-fitness-lpdp-download" so a token issued for
//     downloads can never be used as an auth token or vice-versa.
// =============================================================================

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

import { logger } from "@/lib/logger";

// -----------------------------------------------------------------------------
// Alphabet for human-readable secure strings (no 0/O/I/l/1 ambiguity)
// Characters removed vs full set: uppercase I, L, O; lowercase l, o; digits 0, 1.
// Actual length: 23 upper + 24 lower + 8 digits = 55 characters.
// -----------------------------------------------------------------------------

const UNAMBIGUOUS_ALPHABET =
  "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

// Verify at module load so a typo in the alphabet is caught immediately.
const ALPHABET_LEN = UNAMBIGUOUS_ALPHABET.length; // 55

// The rejection-sampling ceiling: discard bytes >= ALPHABET_CEIL to avoid
// modular bias. floor(256/55)*55 = 4*55 = 220.
// Any byte in [220..255] is discarded (36 values ≈ 14% rejection rate).
const ALPHABET_CEIL = Math.floor(256 / ALPHABET_LEN) * ALPHABET_LEN; // 220

// Over-sample factor: fetch this many raw bytes per desired character to reduce
// the probability of needing a second randomBytes() call.
const BYTES_PER_CHAR_POOL = 2;

// JWT constants
const JWT_ISSUER = "blackline-fitness";
const JWT_AUDIENCE = "blackline-fitness-lpdp-download";
const JWT_ALGORITHM = "HS256";

// -----------------------------------------------------------------------------
// Public API — random generation
// -----------------------------------------------------------------------------

/**
 * Generate a cryptographically secure opaque token as base64url (no padding).
 * Default 32 bytes → 43 base64url characters.
 * Suitable for use as session tokens, verification codes, etc.
 */
export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/**
 * Generate a 32-byte invitation token (43 base64url characters).
 *
 * IMPORTANT: store the SHA-256 hash of the returned token in the DB
 * (via hashToken()), not the raw value. The raw value goes in the email URL.
 * This prevents DB compromise from leaking valid invitation tokens.
 */
export function generateInvitationToken(): string {
  return generateOpaqueToken(32);
}

/**
 * Generate a human-readable secure random string from an unambiguous alphabet.
 * Uses rejection sampling to avoid modular bias.
 *
 * @param length  Desired character length. Must be > 0.
 */
export function generateSecureRandomString(length: number): string {
  if (length <= 0) throw new RangeError("generateSecureRandomString: length must be > 0");

  const result: string[] = [];

  while (result.length < length) {
    // Over-sample to reduce round-trips: fetch enough bytes to fill `length`
    // characters plus a buffer for the expected ~14% rejection rate.
    const needed = length - result.length;
    const pool = randomBytes(needed * BYTES_PER_CHAR_POOL);

    for (let i = 0; i < pool.length && result.length < length; i++) {
      const byte = pool[i]!;
      // Discard bytes >= ALPHABET_CEIL to avoid modular bias.
      if (byte >= ALPHABET_CEIL) continue;
      // Safe: byte % ALPHABET_LEN is always < ALPHABET_LEN, index always in range.
      result.push(UNAMBIGUOUS_ALPHABET[byte % ALPHABET_LEN]!);
    }
    // If pool was exhausted before filling (unlikely ~0.05% per iteration), the
    // while loop re-samples.
  }

  return result.join("");
}

// -----------------------------------------------------------------------------
// Public API — hashing and verification
// -----------------------------------------------------------------------------

/**
 * SHA-256 hex hash of a token string.
 * Store this hash in the DB, never the raw token.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Constant-time comparison of a raw token against a stored SHA-256 hex hash.
 *
 * Hashes the incoming token first so both operands are the same length,
 * then uses timingSafeEqual to prevent timing-side-channel attacks.
 * Returns false (instead of throwing) if lengths differ or if timingSafeEqual
 * throws for any reason.
 */
export function verifyTokenHash(token: string, hashHex: string): boolean {
  const tokenHash = hashToken(token);
  const tokenHashBuf = Buffer.from(tokenHash, "hex");
  const storedHashBuf = Buffer.from(hashHex, "hex");

  // timingSafeEqual throws if buffers have different lengths — guard first.
  if (tokenHashBuf.length !== storedHashBuf.length) return false;

  try {
    return timingSafeEqual(tokenHashBuf, storedHashBuf);
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Public API — JOSE JWS download tokens
// -----------------------------------------------------------------------------

export interface DownloadTokenPayload {
  userId: string;
  requestId: string;
  /** Unix epoch seconds — used for both setExpirationTime and the custom claim. */
  expiresAt: number;
}

/**
 * Sign a compact JWS (HS256) download token using NEXTAUTH_SECRET.
 *
 * Claims set:
 *   iss  "blackline-fitness"
 *   aud  "blackline-fitness-lpdp-download"
 *   iat  current Unix time (setIssuedAt)
 *   exp  expiresAt (Unix seconds)
 *   userId, requestId (custom claims)
 *
 * Audience narrowing ensures a download token cannot be reused as an auth token.
 */
export async function signDownloadToken(payload: DownloadTokenPayload): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

  return new SignJWT({
    userId: payload.userId,
    requestId: payload.requestId,
    expiresAt: payload.expiresAt,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .sign(secret);
}

/**
 * Verify a download token signed by signDownloadToken().
 *
 * Both issuer AND audience are verified by jose — a token signed for a
 * different purpose will be rejected even with the same secret.
 *
 * Returns { userId, requestId } on success; null on any failure.
 * Logs { ok: false, reason } on failure — never logs the token itself.
 */
export async function verifyDownloadToken(
  token: string,
): Promise<{ userId: string; requestId: string } | null> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: [JWT_ALGORITHM],
    });

    const { userId, requestId } = payload as Record<string, unknown>;

    if (typeof userId !== "string" || typeof requestId !== "string") {
      logger.warn({ ok: false, reason: "malformed" }, "crypto.token.verify.failed");
      return null;
    }

    return { userId, requestId };
  } catch (err) {
    const reason = classifyJwtError(err);
    // Never log the token — only log the failure reason.
    logger.warn({ ok: false, reason }, "crypto.token.verify.failed");
    return null;
  }
}

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

type JwtFailureReason = "expired" | "bad_signature" | "wrong_audience" | "malformed";

function classifyJwtError(err: unknown): JwtFailureReason {
  if (!(err instanceof Error)) return "malformed";

  const name = err.name;
  if (name === "JWTExpired") return "expired";
  if (name === "JWSSignatureVerificationFailed") return "bad_signature";
  if (name === "JWTClaimValidationFailed" && err.message.includes("audience")) {
    return "wrong_audience";
  }
  return "malformed";
}
