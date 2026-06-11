// =============================================================================
// BLACKLINE FITNESS — ONVO → TrainerSubscription activation (server-only)
//
// Called by the ONVO webhook after a confirmed `payment-intent.succeeded` for a
// trainer's SaaS subscription. Manual pay-to-extend model: one payment extends
// the subscription window by SUBSCRIPTION_PERIOD_DAYS and sets status = ACTIVE.
//
// Idempotency: each payment records a PaymentEvent (UNIQUE [type, externalId]).
// A duplicate webhook delivery hits the unique constraint (P2002) and is skipped
// — the subscription is never double-extended for the same payment intent.
// =============================================================================
import "server-only";

import { prisma, Prisma } from "@/server/db";
import { logError, logInfo } from "@/lib/logger";

/** Days of access granted by one subscription payment. */
export const SUBSCRIPTION_PERIOD_DAYS = 30;

export async function activateTrainerSubscriptionFromPayment(opts: {
	trainerUserId: string;
	paymentIntentId: string;
	amountCents: number;
	payloadRaw: unknown;
}): Promise<void> {
	// ── 1. Durable idempotency: record the inbound event. ──────────────────────
	try {
		await prisma.paymentEvent.create({
			data: {
				type: "ONVO",
				externalId: opts.paymentIntentId,
				payloadRaw: opts.payloadRaw as Prisma.InputJsonValue,
				processed: true,
				processedAt: new Date(),
			},
		});
	} catch (e) {
		if (
			e instanceof Prisma.PrismaClientKnownRequestError &&
			e.code === "P2002" // unique violation on [type, externalId]
		) {
			logInfo("ONVO activate: duplicate intent, already processed", {
				paymentIntentId: opts.paymentIntentId,
			});
			return;
		}
		throw e; // unexpected → bubble up so the webhook 500s and ONVO retries
	}

	// ── 2. Extend the trainer's subscription window. ───────────────────────────
	const sub = await prisma.trainerSubscription.findUnique({
		where: { trainerUserId: opts.trainerUserId },
		select: { id: true, currentPeriodStart: true, currentPeriodEnd: true },
	});

	if (!sub) {
		// Payment is recorded but there's no subscription to extend (shouldn't
		// happen — a trainer always has one). Log loudly; do not throw (the payment
		// genuinely succeeded, retrying won't create the subscription).
		logError(new Error("TrainerSubscription not found"), {
			fn: "activateTrainerSubscriptionFromPayment",
			trainerUserId: opts.trainerUserId,
		});
		return;
	}

	const now = new Date();
	// Stack on top of remaining active time; otherwise start a fresh window today.
	const stillActive = sub.currentPeriodEnd > now;
	const base = stillActive ? sub.currentPeriodEnd : now;
	const newEnd = new Date(
		base.getTime() + SUBSCRIPTION_PERIOD_DAYS * 86_400_000,
	);

	await prisma.trainerSubscription.update({
		where: { id: sub.id },
		data: {
			status: "ACTIVE",
			currentPeriodStart: stillActive ? sub.currentPeriodStart : now,
			currentPeriodEnd: newEnd,
		},
	});

	logInfo("ONVO: trainer subscription extended", {
		trainerUserId: opts.trainerUserId,
		newEnd: newEnd.toISOString(),
	});
}
