"use server";
// =============================================================================
// BLACKLINE FITNESS — ONVO subscription payment server actions
// Owner: backend-api.
//
// The trainer pays their Blackline Fitness SaaS subscription with a card via
// ONVO. The amount is determined SERVER-SIDE from the SubscriptionPlan price for
// the trainer's tier — the client never sends an amount. The trainer identity
// comes from the session, and travels in the intent metadata so the webhook can
// map the successful payment back to the right subscription.
// =============================================================================

import { prisma } from "@/server/db";
import { serverEnv } from "@/server/env";
import { requireTrainer } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { logError } from "@/lib/logger";
import {
	createPaymentIntent,
	OnvoError,
	onvoConfigured,
} from "@/lib/payments/onvo/client";
import { toCents } from "@/lib/payments/onvo/money";
import type { ActionResult } from "@/types/api";

export interface SubscriptionPaymentIntent {
	intentId: string;
	publicKey: string;
	amountCRC: number;
}

/**
 * Create an ONVO payment intent to pay the current trainer's subscription.
 * Returns { intentId, publicKey, amountCRC } for the frontend to mount the
 * ONVO card widget. Amount is the SubscriptionPlan price for the trainer's tier.
 */
export async function createSubscriptionPaymentIntent(): Promise<
	ActionResult<SubscriptionPaymentIntent>
> {
	return tryCatch(async () => {
		const trainer = await requireTrainer();

		if (!onvoConfigured()) {
			throw new ValidationError(
				"PAYMENTS_UNAVAILABLE",
				"Los pagos no están disponibles en este momento.",
			);
		}

		const sub = await prisma.trainerSubscription.findUnique({
			where: { trainerUserId: trainer.id },
			select: { planTier: true },
		});
		if (!sub) {
			throw new NotFoundError(
				"NO_SUBSCRIPTION",
				"No tenés una suscripción registrada.",
			);
		}

		const plan = await prisma.subscriptionPlan.findUnique({
			where: { tier: sub.planTier },
			select: { priceCRC: true, name: true },
		});
		if (!plan) {
			throw new NotFoundError(
				"NO_PLAN",
				"No se encontró el plan de suscripción.",
			);
		}

		const amountCRC = Number(plan.priceCRC);

		try {
			const intent = await createPaymentIntent({
				amountCents: toCents(amountCRC),
				description: `Blackline Fitness — ${plan.name} (${trainer.id})`,
				metadata: { type: "trainer_subscription", trainerUserId: trainer.id },
			});
			return {
				intentId: intent.id,
				publicKey: serverEnv.ONVO_PUBLIC_KEY ?? "",
				amountCRC,
			};
		} catch (e) {
			if (e instanceof OnvoError) {
				logError(e, {
					fn: "createSubscriptionPaymentIntent",
					trainerId: trainer.id,
					status: e.statusCode,
				});
				throw new ValidationError(
					"PAYMENT_INIT_FAILED",
					"No se pudo iniciar el pago. Intentá de nuevo.",
				);
			}
			throw e;
		}
	});
}
