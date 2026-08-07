// =============================================================================
// BLACKLINE FITNESS — Asistente: puerta por plan
//
// El asistente con IA solo viene en el plan Blackline Coach IA. Esta página es
// un Server Component que lee el plan del coach ANTES de mandar el chat al
// navegador: si su plan no incluye IA ve la invitación a cambiarse, y el chat
// nunca se monta.
//
// La regla de qué plan incluye IA vive en `src/lib/plans.ts`, no acá.
// =============================================================================

import Link from "next/link";
import { Sparkles, Lock, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

import { requireTrainer, getTrainerPlanTier } from "@/server/guards";
import { planIncluyeIA, PLANES, nombreDePlan } from "@/lib/plans";
import { formatCRC } from "@/lib/format";
import AsistenteClient from "./_client";

export const metadata: Metadata = { title: "Asistente" };

export default async function AsistentePage() {
	const trainer = await requireTrainer();
	const tier = await getTrainerPlanTier(trainer.id);

	if (planIncluyeIA(tier)) {
		return <AsistenteClient />;
	}

	const planIA = PLANES.find((p) => p.incluyeIA);

	return (
		<div className="mx-auto max-w-lg py-10">
			<div className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6 text-center sm:p-8">
				<div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-primary/10 ring-1 ring-brand-primary/30">
					<Lock className="h-6 w-6 text-brand-primary" aria-hidden="true" />
				</div>

				<h1 className="mt-5 text-xl font-bold text-[#FAFAFA]">
					El asistente viene con el plan {planIA?.label ?? "con IA"}
				</h1>
				<p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
					Tu plan actual es <strong>{tier ? nombreDePlan(tier) : "—"}</strong>,
					que no incluye el asistente. Cambiando de plan podés preguntarle sobre
					tus clientes, tus rutinas y tu negocio en lenguaje normal.
				</p>

				{planIA && (
					<>
						<ul className="mt-5 space-y-2 text-left">
							{planIA.features
								.filter((f) => f.toLowerCase().includes("ia") || f.toLowerCase().includes("asistente") || f.toLowerCase().includes("cient"))
								.map((f) => (
									<li
										key={f}
										className="flex items-start gap-2 text-sm text-[#FAFAFA]"
									>
										<Sparkles
											className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary"
											aria-hidden="true"
										/>
										{f}
									</li>
								))}
						</ul>

						<p className="mt-5 text-sm text-[#71717A]">
							{planIA.label} —{" "}
							<span className="font-bold text-[#FAFAFA]">
								{formatCRC(planIA.priceCRC)}
							</span>{" "}
							/ mes
						</p>
					</>
				)}

				<Link
					href="/trainer/facturacion"
					className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
				>
					Cambiar de plan
					<ArrowRight className="h-4 w-4" aria-hidden="true" />
				</Link>
			</div>
		</div>
	);
}
