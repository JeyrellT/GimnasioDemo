// =============================================================================
// BLACKLINE FITNESS — Catálogo canónico de planes de suscripción
//
// Fuente única de verdad de nombres, precios y qué incluye cada plan. Lo usan
// el muro de renovación, la página de facturación, la página pública de precios
// y el cobro (que resuelve el monto SERVER-SIDE desde el plan del coach, nunca
// desde algo que mande el navegador).
//
// Mismo patrón que `backend/app/plans.py` en BarberCR: un diccionario por clave
// de plan con etiqueta y precio, y el precio se resuelve en el servidor a la
// hora de cobrar.
//
// Al cambiar precios, actualizar TAMBIÉN:
//   - prisma/seed/index.ts (catálogo en base de datos)
//   - la página pública /pricing lee de acá, así que no hay que tocarla.
// =============================================================================

import type { SubscriptionTier } from "@prisma/client";

export interface Plan {
	tier: SubscriptionTier;
	/** Nombre comercial, el que ve el coach. */
	label: string;
	priceCRC: number;
	/** Tope de clientes activos. */
	maxClients: number;
	/** Si el plan da acceso al asistente con IA. */
	incluyeIA: boolean;
	/** Frase corta de venta, para la tarjeta del plan. */
	tagline: string;
	/** Bullets que se muestran en la tarjeta. */
	features: string[];
	/** Marca visual de "el recomendado". */
	destacado?: boolean;
}

/**
 * Planes que se ofrecen HOY. El coach elige uno al terminar los 15 días de
 * prueba. El orden acá es el orden en que se muestran.
 */
export const PLANES: Plan[] = [
	{
		tier: "COACH",
		label: "Blackline Coach",
		priceCRC: 15_000,
		maxClients: 60,
		incluyeIA: false,
		tagline: "Todo lo que necesitás para manejar tu gente.",
		features: [
			"Clientes ilimitados hasta 60",
			"Rutinas con días, series, reps y descansos",
			"Biblioteca de más de 110 ejercicios",
			"Importar rutinas desde una foto",
			"Progreso, medidas y fotos de tus clientes",
			"Control de ingresos y gastos",
			"Cobros mensuales a tus clientes",
			"Funciona sin internet",
		],
	},
	{
		tier: "COACH_IA",
		label: "Blackline Coach IA",
		priceCRC: 20_000,
		maxClients: 60,
		incluyeIA: true,
		tagline: "Lo mismo, más tu copiloto con inteligencia artificial.",
		destacado: true,
		features: [
			"Todo lo del plan Blackline Coach",
			"Asistente con IA que conoce a tus clientes",
			"Respuestas con respaldo científico",
			"Consultas sobre tu negocio en lenguaje normal",
		],
	},
];

/**
 * Planes viejos (Solo / Pro / Studio). Se retiraron de la oferta pero siguen
 * acá porque hay cuentas antiguas que los referencian: sin esto, la app no
 * sabría qué nombre ni qué precio mostrarles.
 */
export const PLANES_RETIRADOS: Plan[] = [
	{
		tier: "SOLO",
		label: "Blackline Solo",
		priceCRC: 8_900,
		maxClients: 5,
		incluyeIA: false,
		tagline: "Plan retirado.",
		features: [],
	},
	{
		tier: "PRO",
		label: "Blackline Pro",
		priceCRC: 22_900,
		maxClients: 25,
		incluyeIA: false,
		tagline: "Plan retirado.",
		features: [],
	},
	{
		tier: "STUDIO",
		label: "Blackline Studio",
		priceCRC: 44_900,
		maxClients: 60,
		incluyeIA: true,
		tagline: "Plan retirado.",
		features: [],
	},
];

const TODOS = [...PLANES, ...PLANES_RETIRADOS];

/** Busca un plan por tier, incluidos los retirados. */
export function getPlan(tier: SubscriptionTier): Plan | undefined {
	return TODOS.find((p) => p.tier === tier);
}

/** Precio mensual del plan. 0 si el tier no existe (no debería pasar). */
export function precioDePlan(tier: SubscriptionTier): number {
	return getPlan(tier)?.priceCRC ?? 0;
}

/** Nombre comercial del plan, para mostrarle al coach. */
export function nombreDePlan(tier: SubscriptionTier): string {
	return getPlan(tier)?.label ?? tier;
}

/**
 * ¿Este plan da acceso al asistente con IA?
 *
 * Es la única función que decide el acceso a la IA — si algún día cambia la
 * regla, se cambia acá y no en cada pantalla.
 */
export function planIncluyeIA(tier: SubscriptionTier | null | undefined): boolean {
	if (!tier) return false;
	return getPlan(tier)?.incluyeIA ?? false;
}

/** El plan que se sugiere por defecto al terminar la prueba. */
export const PLAN_POR_DEFECTO: SubscriptionTier = "COACH_IA";
