"use client";
// =============================================================================
// BLACKLINE FITNESS — Instrucciones de pago por SINPE Móvil
//
// Se muestra en lugar del widget de tarjeta mientras la pasarela (ONVO) no esté
// en vivo — o sea, cuando el flag PAYMENT está en false. Al activar la pasarela
// la UI vuelve sola al cobro con tarjeta, sin tocar este componente.
//
// A diferencia del pago con tarjeta, este NO reactiva la cuenta solo: el webhook
// de ONVO es lo que dispara la activación automática. Por eso el texto es
// explícito en que hay que enviar el comprobante y que la activación es manual;
// si no, el coach paga y se queda esperando frente al muro sin saber por qué.
// =============================================================================

import { useState } from "react";
import { Smartphone, Copy, Check } from "lucide-react";

import { formatCRC } from "@/lib/format";
import { SINPE_PHONE, SINPE_PHONE_DISPLAY } from "@/lib/consts";

export function SinpePayment({ amountCRC }: { amountCRC: number }) {
	const [copiado, setCopiado] = useState(false);

	async function copiar() {
		try {
			await navigator.clipboard.writeText(SINPE_PHONE);
			setCopiado(true);
			setTimeout(() => setCopiado(false), 2000);
		} catch {
			// Sin permiso de portapapeles (o http): el número igual está a la vista.
		}
	}

	return (
		<div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4">
			<div className="flex items-center gap-2">
				<Smartphone className="h-4 w-4 shrink-0 text-[#F59E0B]" />
				<p className="text-sm font-semibold text-[#FAFAFA]">
					Pagá por SINPE Móvil
				</p>
			</div>

			<div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[#0A0A0A] px-4 py-3">
				<div>
					<p className="text-[11px] uppercase tracking-wide text-[#71717A]">
						Número
					</p>
					<p className="font-mono text-xl font-bold tracking-wide text-[#FAFAFA]">
						{SINPE_PHONE_DISPLAY}
					</p>
				</div>
				<button
					type="button"
					onClick={copiar}
					className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#3F3F46] px-3 py-2 text-xs font-medium text-[#FAFAFA] transition-colors hover:bg-[#27272A]"
				>
					{copiado ? (
						<>
							<Check className="h-3.5 w-3.5 text-[#22C55E]" />
							Copiado
						</>
					) : (
						<>
							<Copy className="h-3.5 w-3.5" />
							Copiar
						</>
					)}
				</button>
			</div>

			<div className="mt-3 flex items-baseline justify-between">
				<span className="text-xs text-[#A1A1AA]">Monto a transferir</span>
				<span className="text-base font-bold text-[#FAFAFA]">
					{formatCRC(amountCRC)}
				</span>
			</div>

			<p className="mt-3 text-xs leading-relaxed text-[#A1A1AA]">
				Cuando hagás la transferencia, enviá el comprobante al mismo número. Tu
				cuenta se activa de forma manual, así que puede tardar un poco en
				desbloquearse.
			</p>
		</div>
	);
}
