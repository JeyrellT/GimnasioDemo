"use client";
// =============================================================================
// BLACKLINE FITNESS — ONVO subscription payment widget
// Mounts the ONVO card widget for the trainer to pay their SaaS subscription.
// Ported from BarberXCR's MembershipPayment.
//   - Creates the intent server-side (createSubscriptionPaymentIntent).
//   - Loads the ONVO SDK and mounts onvo.pay(...).render(#container).
//   - Mounts exactly once (startedRef); container stays visible at .render()
//     time with the loader/error as an overlay; onSuccess refreshes the page.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, CreditCard, Loader2 } from "lucide-react";

import { createSubscriptionPaymentIntent } from "@/app/actions/billing";
import { loadOnvo } from "@/lib/payments/onvo/sdk";

type Status = "loading" | "ready" | "error" | "paid";

export function OnvoSubscriptionPayment({ onPaid }: { onPaid?: () => void }) {
	const router = useRouter();
	const containerRef = useRef<HTMLDivElement>(null);
	const startedRef = useRef(false);
	// Unique container id per instance so the SDK never renders into the wrong node.
	const [containerId] = useState(
		() => `onvo-c-${Math.random().toString(36).slice(2)}`,
	);
	const [status, setStatus] = useState<Status>("loading");
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const mount = useCallback(async () => {
		setStatus("loading");
		setErrorMsg(null);
		try {
			const res = await createSubscriptionPaymentIntent();
			if (!res.ok) {
				setStatus("error");
				setErrorMsg(res.error.message || "No se pudo iniciar el pago.");
				return;
			}
			const onvo = await loadOnvo();
			if (!containerRef.current) return;
			containerRef.current.innerHTML = "";
			onvo
				.pay({
					publicKey: res.value.publicKey,
					paymentIntentId: res.value.intentId,
					paymentType: "one_time",
					locale: "es",
					onSuccess: () => {
						setStatus("paid");
						onPaid?.();
						router.refresh();
					},
					onError: () => {
						setStatus("error");
						setErrorMsg(
							"No se pudo procesar el pago. Verificá los datos de tu tarjeta.",
						);
					},
				})
				.render(`#${containerId}`);
			setStatus("ready");
		} catch {
			setStatus("error");
			setErrorMsg("No se pudo cargar la pasarela de pago. Revisá tu conexión.");
		}
	}, [containerId, onPaid, router]);

	// Mount exactly once — avoids creating multiple intents on re-render.
	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;
		void mount();
	}, [mount]);

	if (status === "paid") {
		return (
			<div className="flex items-center gap-3 rounded-xl border border-[#22C55E]/30 bg-[#052E16] px-4 py-3 text-sm text-[#86EFAC]">
				<CheckCircle2 className="h-5 w-5 shrink-0" />
				¡Pago recibido! Tu suscripción quedó activa.
			</div>
		);
	}

	return (
		<div className="relative overflow-hidden rounded-xl border border-[#3F3F46] bg-[#18181B]">
			{/* ONVO iframe mounts here — always visible so it sizes correctly. */}
			<div id={containerId} ref={containerRef} className="min-h-[320px] p-3" />

			{status === "loading" && (
				<div className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-[#18181B] text-sm text-[#A1A1AA]">
					<Loader2 className="h-5 w-5 animate-spin text-[#F59E0B]" />
					Cargando pasarela de pago…
				</div>
			)}

			{status === "error" && (
				<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#18181B] p-6 text-center">
					<div className="flex items-center gap-2 text-sm text-[#FCA5A5]">
						<AlertCircle className="h-5 w-5 shrink-0" />
						{errorMsg}
					</div>
					<button
						type="button"
						onClick={() => {
							startedRef.current = false;
							void mount();
						}}
						className="inline-flex items-center gap-2 rounded-lg border border-[#F59E0B]/40 px-4 py-2 text-sm text-[#FCD34D] transition-colors hover:bg-[#F59E0B]/10"
					>
						<CreditCard className="h-4 w-4" />
						Reintentar
					</button>
				</div>
			)}
		</div>
	);
}
