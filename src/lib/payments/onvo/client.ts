// =============================================================================
// BLACKLINE FITNESS — ONVO Pay API client (server-only)
// Ported from BarberXCR. ONVO is the Costa Rican card gateway.
//
// Facts (docs.onvopay.com):
//   - ONE host for test AND live (api.onvopay.com); the KEY decides the mode
//     (onvo_test_* vs onvo_live_*). The old api.dev.onvopay.com host is DEAD.
//   - Auth = `Authorization: Bearer <ONVO_SECRET_KEY>` (backend only, never logged).
//   - Amount = integer cents. Card data never touches us (the JS SDK tokenizes).
// =============================================================================
import "server-only";

import { serverEnv } from "@/server/env";
import { logError, logInfo } from "@/lib/logger";

export class OnvoError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number | null,
	) {
		super(message);
		this.name = "OnvoError";
	}
}

/**
 * True only when BOTH keys are present. The public key is required by the
 * frontend SDK; without it the card widget cannot mount, so we treat a missing
 * public key as "not configured" and fail-closed (endpoint → unavailable).
 */
export function onvoConfigured(): boolean {
	return Boolean(serverEnv.ONVO_SECRET_KEY && serverEnv.ONVO_PUBLIC_KEY);
}

// ONVO ids are opaque slugs; restrict to URL-safe chars so an id can never be
// interpolated into the API path as a traversal (e.g. "../../").
const ID_RE = /^[A-Za-z0-9_-]+$/;
const TIMEOUT_MS = 15_000;

async function onvoRequest<T = Record<string, unknown>>(
	method: string,
	path: string,
	opts: { body?: unknown; expectedStatus?: number } = {},
): Promise<T> {
	if (!onvoConfigured()) {
		throw new OnvoError(
			"ONVO no configurado — falta ONVO_SECRET_KEY / ONVO_PUBLIC_KEY.",
			null,
		);
	}

	const base = serverEnv.ONVO_BASE_URL.replace(/\/+$/, "");
	const url = `${base}/${path.replace(/^\/+/, "")}`;
	const expected = opts.expectedStatus ?? 200;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			method,
			headers: {
				// Secret is sent only as the Bearer header — never logged.
				Authorization: `Bearer ${serverEnv.ONVO_SECRET_KEY}`,
				"Content-Type": "application/json",
			},
			body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
			signal: controller.signal,
			cache: "no-store",
		});

		// Log a summary only — NO auth header, NO card data.
		logInfo("ONVO request", { method, path, status: res.status });

		if (res.status !== expected) {
			let detail = "";
			try {
				const body = (await res.json()) as { message?: string; error?: string };
				detail = body.message || body.error || "";
			} catch {
				detail = await res.text().catch(() => "");
			}
			throw new OnvoError(
				`ONVO API error: ${detail || res.statusText}`,
				res.status,
			);
		}

		return (await res.json()) as T;
	} catch (e) {
		if (e instanceof OnvoError) throw e;
		logError(e, { fn: "onvo.request", method, path });
		throw new OnvoError("ONVO request failed (network / timeout).", null);
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Create an ONVO payment intent. `amountCents` = integer cents (use toCents).
 * `metadata` is echoed back verbatim in the webhook (`data.metadata`) — we use
 * it to carry `{ type, trainerUserId }` so the webhook can map the payment back.
 * Returns the ONVO response (contains at least `{ id }`).
 */
export async function createPaymentIntent(opts: {
	amountCents: number;
	description: string;
	currency?: "CRC" | "USD";
	metadata?: Record<string, unknown>;
}): Promise<{ id: string } & Record<string, unknown>> {
	const body: Record<string, unknown> = {
		currency: opts.currency ?? "CRC",
		amount: opts.amountCents,
		description: opts.description,
	};
	if (opts.metadata) body.metadata = opts.metadata;
	return onvoRequest("POST", "payment-intents", { body, expectedStatus: 201 });
}

/** Retrieve a payment intent by id (for polling / reconciliation). */
export async function getPaymentIntent(
	intentId: string,
): Promise<Record<string, unknown>> {
	if (!ID_RE.test(intentId))
		throw new OnvoError("Invalid payment intent id.", null);
	return onvoRequest("GET", `payment-intents/${intentId}`, {
		expectedStatus: 200,
	});
}
