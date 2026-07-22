// =============================================================================
// BLACKLINE FITNESS — ONVO Pay webhook receiver
// POST /api/webhooks/onvo
//
// Replaces the Tilopay stub as the active payment provider. ONVO posts payment
// lifecycle events here. We verify the X-Webhook-Secret shared secret (NOT an
// HMAC — see lib/payments/onvo/webhook.ts), then extend the paying trainer's
// subscription on `payment-intent.succeeded`. Idempotent via PaymentEvent.
//
// Contract (set on intent creation in onvo.actions.ts):
//   metadata = { type: "trainer_subscription", trainerUserId: "<userId>" }
// =============================================================================
import { NextResponse } from "next/server";

import { serverEnv } from "@/server/env";
import { verifyWebhookSecret } from "@/lib/payments/onvo/webhook";
import { activateTrainerSubscriptionFromPayment } from "@/lib/payments/onvo/subscription";
import { logError, logInfo, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 64 * 1024;

export async function POST(req: Request): Promise<NextResponse> {
	// Read the raw body once (kept as string for the secret check + JSON parse).
	const raw = await req.text();
	if (raw.length > MAX_BYTES) {
		return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
	}

	// ── Verify the shared secret (fail-closed). 400 — never 200. ───────────────
	if (
		!verifyWebhookSecret(
			req.headers.get("x-webhook-secret"),
			serverEnv.ONVO_WEBHOOK_SECRET,
		)
	) {
		logWarn("ONVO webhook: invalid/missing X-Webhook-Secret — rejecting");
		return NextResponse.json(
			{ error: "invalid_webhook_secret" },
			{ status: 400 },
		);
	}

	// ── Parse defensively. ─────────────────────────────────────────────────────
	let event: { type?: string; data?: Record<string, unknown> };
	try {
		event = JSON.parse(raw);
	} catch {
		// Malformed body should not trigger infinite retries.
		return NextResponse.json({ received: true, error: "invalid_json" });
	}

	const data = (event.data ?? {}) as Record<string, unknown>;
	const intentId = typeof data.id === "string" ? data.id : null; // intent id at data.id
	const meta = (data.metadata ?? {}) as Record<string, unknown>;
	const metaType = typeof meta.type === "string" ? meta.type : null;
	const trainerUserId =
		typeof meta.trainerUserId === "string" ? meta.trainerUserId : null;

	logInfo("ONVO webhook received", {
		type: event.type,
		intentId,
		metaType,
		trainerUserId: trainerUserId ? `${trainerUserId.slice(0, 8)}…` : null,
	});

	// ── Dispatch. ──────────────────────────────────────────────────────────────
	if (
		event.type === "payment-intent.succeeded" &&
		metaType === "trainer_subscription" &&
		trainerUserId &&
		intentId
	) {
		const rawAmount = data.amount;
		const amountCents = typeof rawAmount === "number" ? rawAmount : 0;
		try {
			await activateTrainerSubscriptionFromPayment({
				trainerUserId,
				paymentIntentId: intentId,
				amountCents,
				payloadRaw: event,
			});
		} catch (e) {
			// CRITICAL: return 500 so ONVO RETRIES — a trainer who paid must never be
			// left unactivated. activateTrainerSubscriptionFromPayment is idempotent.
			logError(e, { fn: "onvo.webhook.activate", intentId });
			return NextResponse.json({ error: "activation_failed" }, { status: 500 });
		}
	}
	// Everything else (failed / deferred / unknown / non-subscription) → ack 200
	// so ONVO stops retrying.
	return NextResponse.json({ received: true });
}
