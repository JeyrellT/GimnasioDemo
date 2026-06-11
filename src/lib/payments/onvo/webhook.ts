// =============================================================================
// BLACKLINE FITNESS — ONVO webhook secret verification (server-only)
// Ported from BarberXCR.
//
// ONVO sends the webhook secret VERBATIM in the `X-Webhook-Secret` header (value
// prefix `webhook_secret_…`). Verification is a constant-time comparison of that
// header against ONVO_WEBHOOK_SECRET. This is a SHARED-SECRET model, NOT an HMAC
// over the body (per docs.onvopay.com, June 2026). Fail-closed when either side
// is missing.
//
// TODO(onvo): verify against a real sandbox webhook delivery; if ONVO also sends
// an HMAC signature, upgrade this to HMAC-SHA256 over the raw body.
// =============================================================================
import "server-only";
import { timingSafeEqual } from "node:crypto";

export function verifyWebhookSecret(
	provided: string | null | undefined,
	expected: string | undefined,
): boolean {
	if (!provided || !expected) return false;
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	// timingSafeEqual throws if lengths differ — guard first (length is not secret).
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
