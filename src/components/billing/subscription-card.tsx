"use client";
// =============================================================================
// BLACKLINE FITNESS — "Mi suscripción" card (trainer)
// Shows the trainer's Blackline subscription state and a button to pay/renew it
// with a card via ONVO. Rendered at the top of /trainer/facturacion.
// =============================================================================

import { useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client";

import { formatDateCR } from "@/lib/utils";
import { OnvoSubscriptionPayment } from "./onvo-subscription-payment";

export interface SubscriptionCardData {
	planTier: SubscriptionTier;
	status: SubscriptionStatus;
	currentPeriodEnd: Date;
	trialEndsAt: Date | null;
}

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
	TRIAL: "Prueba gratis",
	ACTIVE: "Activa",
	PAST_DUE: "Pago vencido",
	CANCELLED: "Cancelada",
	READ_ONLY: "Solo lectura",
};

const STATUS_COLOR: Record<SubscriptionStatus, string> = {
	TRIAL: "text-[#F59E0B]",
	ACTIVE: "text-[#22C55E]",
	PAST_DUE: "text-[#EF4444]",
	CANCELLED: "text-[#EF4444]",
	READ_ONLY: "text-[#EF4444]",
};

export function SubscriptionCard({
	subscription,
}: { subscription: SubscriptionCardData | null }) {
	const [paying, setPaying] = useState(false);

	if (!subscription) return null;

	const { status, planTier, currentPeriodEnd } = subscription;
	const needsPayment = status !== "ACTIVE";
	const periodLabel = formatDateCR(currentPeriodEnd, "d MMM yyyy");

	return (
		<div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 sm:p-5">
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-start gap-3">
					<div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F59E0B]/10 ring-1 ring-[#F59E0B]/30">
						<ShieldCheck className="h-5 w-5 text-[#F59E0B]" />
					</div>
					<div>
						<p className="text-sm font-semibold text-[#FAFAFA]">
							Plan {planTier} —{" "}
							<span className={STATUS_COLOR[status]}>
								{STATUS_LABEL[status]}
							</span>
						</p>
						<p className="mt-0.5 text-xs text-[#71717A]">
							{status === "ACTIVE" ? "Renueva el" : "Vence el"} {periodLabel}
						</p>
					</div>
				</div>

				{!paying && (
					<button
						type="button"
						onClick={() => setPaying(true)}
						className={
							`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${needsPayment
								? "bg-[#F59E0B] text-[#0A0A0A] hover:bg-[#D97706]"
								: "border border-[#3F3F46] text-[#FAFAFA] hover:bg-[#27272A]"}`
						}
					>
						<CreditCard className="h-4 w-4" />
						{needsPayment ? "Pagar suscripción" : "Renovar"}
					</button>
				)}
			</div>

			{paying && (
				<div className="mt-4">
					<OnvoSubscriptionPayment onPaid={() => setPaying(false)} />
					<button
						type="button"
						onClick={() => setPaying(false)}
						className="mt-3 w-full py-2 text-center text-xs text-[#71717A] transition-colors hover:text-[#A1A1AA]"
					>
						Cancelar
					</button>
				</div>
			)}
		</div>
	);
}
