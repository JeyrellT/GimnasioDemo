"use client";
// =============================================================================
// BLACKLINE FITNESS — Selector de plan
//
// El coach elige su plan al terminar los 15 días de prueba. Se usa en el muro
// de renovación y en /trainer/facturacion.
//
// Los planes salen de `src/lib/plans.ts` (fuente única): agregar o cambiar un
// plan no requiere tocar este componente.
// =============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, Loader2 } from "lucide-react";
import type { SubscriptionTier } from "@prisma/client";

import { PLANES } from "@/lib/plans";
import { formatCRC } from "@/lib/format";
import { elegirMiPlan } from "@/app/actions/billing";

interface PlanPickerProps {
	/** Plan actual del coach, para marcarlo como seleccionado. */
	actual: SubscriptionTier | null;
	/** Se llama después de guardar, con el plan elegido. */
	onElegido?: (tier: SubscriptionTier) => void;
	/** Texto del botón de confirmación. */
	textoBoton?: string;
}

export function PlanPicker({
	actual,
	onElegido,
	textoBoton = "Confirmar plan",
}: PlanPickerProps) {
	const router = useRouter();
	const [guardando, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	// Arranca en el plan actual si sigue vigente; si no, en el destacado.
	const [elegido, setElegido] = useState<SubscriptionTier>(() => {
		if (actual && PLANES.some((p) => p.tier === actual)) return actual;
		return (PLANES.find((p) => p.destacado) ?? PLANES[0]).tier;
	});

	function confirmar() {
		setError(null);
		startTransition(async () => {
			const res = await elegirMiPlan(elegido);
			if (!res.ok) {
				setError(res.error.message);
				return;
			}
			onElegido?.(elegido);
			router.refresh();
		});
	}

	return (
		<div className="space-y-3">
			<div className="grid gap-3 sm:grid-cols-2">
				{PLANES.map((plan) => {
					const seleccionado = plan.tier === elegido;
					return (
						<button
							key={plan.tier}
							type="button"
							onClick={() => setElegido(plan.tier)}
							aria-pressed={seleccionado}
							className={[
								"relative flex flex-col rounded-xl border p-4 text-left transition-colors",
								seleccionado
									? "border-brand-primary bg-brand-primary/5"
									: "border-[#3F3F46] bg-[#18181B] hover:border-[#52525B]",
							].join(" ")}
						>
							{plan.destacado && (
								<span className="absolute -top-2 right-3 rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
									Recomendado
								</span>
							)}

							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<p className="flex items-center gap-1.5 text-sm font-bold text-[#FAFAFA]">
										{plan.incluyeIA && (
											<Sparkles
												className="h-3.5 w-3.5 shrink-0 text-brand-primary"
												aria-hidden="true"
											/>
										)}
										{plan.label}
									</p>
									<p className="mt-0.5 text-xs text-[#71717A]">{plan.tagline}</p>
								</div>
								<span
									className={[
										"mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
										seleccionado
											? "border-brand-primary bg-brand-primary"
											: "border-[#52525B]",
									].join(" ")}
								>
									{seleccionado && (
										<Check className="h-3 w-3 text-white" aria-hidden="true" />
									)}
								</span>
							</div>

							<p className="mt-3 text-2xl font-bold text-[#FAFAFA]">
								{formatCRC(plan.priceCRC)}
								<span className="text-sm font-normal text-[#71717A]"> / mes</span>
							</p>

							<ul className="mt-3 space-y-1.5">
								{plan.features.map((f) => (
									<li
										key={f}
										className="flex items-start gap-1.5 text-xs text-[#A1A1AA]"
									>
										<Check
											className="mt-0.5 h-3 w-3 shrink-0 text-[#22C55E]"
											aria-hidden="true"
										/>
										{f}
									</li>
								))}
							</ul>

							{actual === plan.tier && (
								<p className="mt-3 text-[11px] font-medium text-[#71717A]">
									Tu plan actual
								</p>
							)}
						</button>
					);
				})}
			</div>

			{error && <p className="text-xs text-[#FCA5A5]">{error}</p>}

			<button
				type="button"
				onClick={confirmar}
				disabled={guardando}
				className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
			>
				{guardando ? (
					<>
						<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
						Guardando…
					</>
				) : (
					textoBoton
				)}
			</button>
		</div>
	);
}
