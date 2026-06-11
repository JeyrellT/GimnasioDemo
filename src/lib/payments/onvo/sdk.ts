"use client";
// =============================================================================
// BLACKLINE FITNESS — ONVO Pay browser SDK loader (client-only)
// Ported from BarberXCR. Idempotent: injects https://sdk.onvopay.com/sdk.js once
// and resolves with the global `onvo`.
// =============================================================================

export interface OnvoSdk {
	pay(opts: {
		publicKey: string;
		paymentIntentId: string;
		paymentType?: "one_time" | "subscription";
		locale?: "es" | "en";
		onSuccess?: (data: unknown) => void;
		onError?: (data: unknown) => void;
	}): { render(selector: string): void; submitPayment?: () => void };
}

const SCRIPT_ID = "onvo-sdk-script";
const SCRIPT_SRC = "https://sdk.onvopay.com/sdk.js";
const TIMEOUT_MS = 15_000;

let onvoPromise: Promise<OnvoSdk> | null = null;

export function loadOnvo(): Promise<OnvoSdk> {
	if (typeof window === "undefined") {
		return Promise.reject(new Error("loadOnvo: client-only"));
	}
	const w = window as unknown as { onvo?: OnvoSdk };
	if (w.onvo) return Promise.resolve(w.onvo);
	if (onvoPromise) return onvoPromise;

	onvoPromise = new Promise<OnvoSdk>((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error("ONVO SDK load timed out")),
			TIMEOUT_MS,
		);
		const done = () => {
			clearTimeout(timer);
			if (w.onvo) resolve(w.onvo);
			else reject(new Error("ONVO SDK loaded but window.onvo is undefined"));
		};
		const fail = () => {
			clearTimeout(timer);
			onvoPromise = null; // allow a later retry
			reject(new Error("ONVO SDK script failed to load"));
		};

		const existing = document.getElementById(
			SCRIPT_ID,
		) as HTMLScriptElement | null;
		if (existing) {
			existing.addEventListener("load", done, { once: true });
			existing.addEventListener("error", fail, { once: true });
			if (w.onvo) done();
			return;
		}

		const script = document.createElement("script");
		script.id = SCRIPT_ID;
		script.src = SCRIPT_SRC;
		script.async = true;
		script.addEventListener("load", done, { once: true });
		script.addEventListener("error", fail, { once: true });
		document.head.appendChild(script);
	});

	return onvoPromise;
}
