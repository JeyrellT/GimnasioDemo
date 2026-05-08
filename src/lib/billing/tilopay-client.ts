// =============================================================================
// VIZION — Tilopay payment gateway client
// Owner: backend-api.
//
// PAYMENT_PROVIDER_LIVE=false (default): All operations return fake/sandbox
// data so the full billing flow can be tested without real money.
//
// When PAYMENT_PROVIDER_LIVE=true: Uses real Tilopay API endpoints.
// The switch is a single env var flip — no code change needed.
//
// TODO(backend-api, V1.1): Confirm exact Tilopay API endpoint URLs and
// request/response schemas. These are placeholders based on common Costa Rica
// payment gateway conventions. Adjust when credentials are available.
// =============================================================================

import { createId } from "@paralleldrive/cuid2";
import { createHmac, timingSafeEqual } from "crypto";

import { env } from "@/env";
import { isFlagOn } from "@/lib/flags";
import { ExternalServiceError } from "@/lib/errors";
import { logError, logInfo } from "@/lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateChargeInput {
  amountCRC: number;
  description: string;
  customerEmail: string;
  /** URL Tilopay will POST the result to */
  callbackUrl: string;
  /** Internal reference (shown in Tilopay dashboard) */
  reference?: string;
}

export interface CreateChargeResult {
  chargeId: string;
  /** Redirect the user here to complete payment */
  paymentUrl: string;
  status: "PENDING";
}

export type TilopayChargeStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";

export interface GetChargeStatusResult {
  chargeId: string;
  status: TilopayChargeStatus;
  paidAt: string | null;
  amountCRC: number;
}

// ── Tilopay base URL ──────────────────────────────────────────────────────────

const TILOPAY_BASE_URL = "https://api.tilopay.com/v1";

// ── Helper: HTTP request wrapper ──────────────────────────────────────────────

async function tilopayRequest<T>(
  path: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${TILOPAY_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.TILOPAY_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "no body");
    throw new ExternalServiceError(
      "TILOPAY_REQUEST_FAILED",
      `Tilopay error ${response.status}: ${text}`,
    );
  }

  return response.json() as Promise<T>;
}

// =============================================================================
// createCharge
// =============================================================================

/**
 * Create a payment charge via Tilopay.
 *
 * When PAYMENT_PROVIDER_LIVE=false, returns a fake charge so the full flow
 * can be tested without real money. chargeId prefixed with "tlp_test_".
 */
export async function createCharge(
  input: CreateChargeInput,
): Promise<CreateChargeResult> {
  if (!isFlagOn("PAYMENT")) {
    // Sandbox / test mode
    const chargeId = `tlp_test_${createId()}`;
    logInfo("Tilopay sandbox: fake charge created", { chargeId });
    return {
      chargeId,
      paymentUrl: `${env.APP_URL}/billing/pago-simulado?chargeId=${chargeId}`,
      status: "PENDING",
    };
  }

  try {
    const result = await tilopayRequest<{
      charge_id: string;
      payment_url: string;
    }>("/charges", "POST", {
      amount: input.amountCRC,
      currency: "CRC",
      description: input.description,
      customer_email: input.customerEmail,
      callback_url: input.callbackUrl,
      reference: input.reference,
    });

    logInfo("Tilopay charge created", { chargeId: result.charge_id });
    return {
      chargeId: result.charge_id,
      paymentUrl: result.payment_url,
      status: "PENDING",
    };
  } catch (e) {
    logError(e, { action: "createCharge", email: "[redacted]" });
    throw e;
  }
}

// =============================================================================
// getChargeStatus
// =============================================================================

/**
 * Retrieve the current status of a charge.
 * In sandbox mode, always returns PAID for test charges after 5s (simulated).
 */
export async function getChargeStatus(
  chargeId: string,
): Promise<GetChargeStatusResult> {
  if (!isFlagOn("PAYMENT") || chargeId.startsWith("tlp_test_")) {
    return {
      chargeId,
      status: "PAID",
      paidAt: new Date().toISOString(),
      amountCRC: 0,
    };
  }

  try {
    const result = await tilopayRequest<{
      charge_id: string;
      status: TilopayChargeStatus;
      paid_at: string | null;
      amount: number;
    }>(`/charges/${chargeId}`, "GET");

    return {
      chargeId: result.charge_id,
      status: result.status,
      paidAt: result.paid_at,
      amountCRC: result.amount,
    };
  } catch (e) {
    logError(e, { action: "getChargeStatus", chargeId });
    throw e;
  }
}

// =============================================================================
// verifyWebhookSignature
//
// Tilopay sends HMAC-SHA256 in the X-Tilopay-Signature header.
// We reconstruct the HMAC and compare via timingSafeEqual to prevent
// timing attacks.
// =============================================================================

/**
 * Verify that a webhook payload came from Tilopay.
 *
 * @param rawBody  - The raw Buffer of the POST body (before JSON.parse).
 * @param signature - The value of the X-Tilopay-Signature header.
 * @returns true if the signature is valid.
 */
export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signature: string,
): boolean {
  try {
    const hmac = createHmac("sha256", env.TILOPAY_WEBHOOK_SECRET);
    hmac.update(typeof rawBody === "string" ? rawBody : rawBody);
    const expected = hmac.digest("hex");

    // Constant-time comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expected, "hex");
    const signatureBuf = Buffer.from(signature.replace(/^sha256=/, ""), "hex");

    if (expectedBuf.length !== signatureBuf.length) return false;

    return timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}
