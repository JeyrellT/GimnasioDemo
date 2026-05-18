// =============================================================================
// BLACKLINE FITNESS — HMAC-signed impersonation cookie helpers
// Owner: backend-api.
//
// SERVER-ONLY — imports node:crypto. Never import from client components or
// Edge middleware. The cookie is verified on every request via guards.ts.
// =============================================================================

import { createHmac, timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/server/env";

// -----------------------------------------------------------------------------
// Constants (exported so guards.ts can set/clear the cookie by name)
// -----------------------------------------------------------------------------

export const IMPERSONATION_COOKIE_NAME = "__forja_impersonate";
export const IMPERSONATION_MAX_AGE_SEC = 30 * 60; // 30 minutes

// -----------------------------------------------------------------------------
// Payload shape
// -----------------------------------------------------------------------------

interface ImpersonationPayload {
  actorId: string;
  targetId: string;
  issuedAt: number; // Date.now() ms
}

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

function getSecret(): string | undefined {
  return serverEnv.IMPERSONATION_SECRET;
}

function encodePayload(payload: ImpersonationPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function hmac(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Sign an impersonation token.
 * Format: `<base64url(payload)>.<base64url(hmac-sha256(payload, secret))>`
 *
 * Throws if IMPERSONATION_SECRET is not configured — callers must only call
 * this from SUPER_ADMIN-gated server actions where the secret is required.
 */
export function signImpersonation(params: {
  actorId: string;
  targetId: string;
}): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error(
      "[impersonation] IMPERSONATION_SECRET is not configured. " +
        "Set it in .env.local (min 32 chars) to use impersonation.",
    );
  }

  const payload: ImpersonationPayload = {
    actorId: params.actorId,
    targetId: params.targetId,
    issuedAt: Date.now(),
  };

  const payloadB64 = encodePayload(payload);
  const sig = hmac(payloadB64, secret);

  return `${payloadB64}.${sig}`;
}

/**
 * Verify an impersonation cookie value.
 *
 * Returns the decoded payload if:
 *   - IMPERSONATION_SECRET is set
 *   - The HMAC signature is valid (constant-time comparison)
 *   - The token is not older than IMPERSONATION_MAX_AGE_SEC
 *
 * Returns null on ANY failure (missing secret, malformed, tampered, expired).
 * Never throws.
 */
export function verifyImpersonation(
  cookieValue: string | undefined,
): ImpersonationPayload | null {
  if (!cookieValue) return null;

  const secret = getSecret();
  if (!secret) return null;

  // Split into payload + signature
  const dotIdx = cookieValue.lastIndexOf(".");
  if (dotIdx === -1) return null;

  const payloadB64 = cookieValue.slice(0, dotIdx);
  const receivedSig = cookieValue.slice(dotIdx + 1);

  if (!payloadB64 || !receivedSig) return null;

  // Constant-time HMAC comparison to prevent timing attacks
  const expectedSig = hmac(payloadB64, secret);

  let sigValid = false;
  try {
    const expectedBuf = Buffer.from(expectedSig, "base64url");
    const receivedBuf = Buffer.from(receivedSig, "base64url");

    // timingSafeEqual requires equal-length buffers
    if (expectedBuf.length === receivedBuf.length) {
      sigValid = timingSafeEqual(expectedBuf, receivedBuf);
    }
  } catch {
    return null;
  }

  if (!sigValid) return null;

  // Decode payload
  let payload: ImpersonationPayload;
  try {
    const raw = Buffer.from(payloadB64, "base64url").toString("utf-8");
    payload = JSON.parse(raw) as ImpersonationPayload;
  } catch {
    return null;
  }

  // Validate shape
  if (
    typeof payload.actorId !== "string" ||
    typeof payload.targetId !== "string" ||
    typeof payload.issuedAt !== "number"
  ) {
    return null;
  }

  // Check expiry
  const ageMs = Date.now() - payload.issuedAt;
  if (ageMs > IMPERSONATION_MAX_AGE_SEC * 1000) return null;

  return payload;
}
