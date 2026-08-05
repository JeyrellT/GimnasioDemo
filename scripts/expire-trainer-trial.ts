/**
 * CLI runner — vence el trial de un trainer (activa el muro de renovación)
 *
 * Uso:
 *   pnpm exec tsx scripts/expire-trainer-trial.ts --email coach@x.com           # dry-run
 *   pnpm exec tsx scripts/expire-trainer-trial.ts --email coach@x.com --apply
 *
 * Mueve `trialEndsAt` y `currentPeriodEnd` al pasado dejando el status en TRIAL.
 * `evaluateSubscriptionAccess` (src/lib/subscription.ts) lo lee como
 * TRIAL_EXPIRED, y el layout de (app) reemplaza toda la interfaz del trainer
 * con el muro "Tu prueba gratuita terminó", desde donde solo puede pagar por
 * ONVO o cerrar sesión.
 *
 * Se mueven las DOS fechas a propósito: si `currentPeriodEnd` quedara en el
 * futuro, al pagar ONVO apilaría los 30 días nuevos encima del sobrante en vez
 * de arrancar una ventana limpia (ver activateTrainerSubscriptionFromPayment).
 *
 * NO suspende al usuario (`User.suspendedAt`): eso es otra cosa, bloquea el
 * login por completo y no ofrece pagar. Tampoco toca a sus clientes — el muro
 * solo aplica al rol TRAINER, así que ellos siguen entrenando normal.
 *
 * Para revertir: /admin → extender trial o activar licencia. O correr este
 * mismo script con --days N para dejar el trial venciendo en N días.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const arg = (name: string): string | undefined => {
	const i = argv.indexOf(name);
	return i >= 0 ? argv[i + 1] : undefined;
};
const EMAIL = arg("--email");
/** Días desde hoy hasta el vencimiento. Negativo = ya vencido (default -1). */
const DAYS = Number(arg("--days") ?? -1);

async function main(): Promise<void> {
	if (!EMAIL) throw new Error("Falta --email <correo del trainer>.");
	if (!Number.isFinite(DAYS)) throw new Error("--days debe ser un número.");

	console.log(`\n=== Vencer trial ${APPLY ? "(APPLY)" : "(DRY-RUN)"} ===\n`);

	const coach = await prisma.user.findFirst({
		where: { email: EMAIL, deletedAt: null },
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			suspendedAt: true,
		},
	});
	if (!coach) throw new Error(`No existe un usuario activo con email ${EMAIL}.`);
	if (coach.role !== "TRAINER") {
		throw new Error(
			`${coach.email} tiene rol ${coach.role}; el muro solo aplica a TRAINER.`,
		);
	}

	const sub = await prisma.trainerSubscription.findUnique({
		where: { trainerUserId: coach.id },
	});
	if (!sub) throw new Error(`${coach.email} no tiene suscripción registrada.`);

	const now = new Date();
	const nuevaFecha = new Date(now.getTime() + DAYS * 86_400_000);

	console.log(`Coach: ${coach.name} <${coach.email}>`);
	console.log(`  plan   : ${sub.planTier}`);
	console.log(`  status : ${sub.status}`);
	console.log(`  antes  : trialEndsAt=${sub.trialEndsAt?.toISOString() ?? "null"}`);
	console.log(`           currentPeriodEnd=${sub.currentPeriodEnd.toISOString()}`);
	console.log(`  después: ambas = ${nuevaFecha.toISOString()}`);
	console.log(
		`\n  Resultado: ${DAYS < 0 ? "MURO DE RENOVACIÓN activo (trial vencido)" : `trial vigente por ${DAYS} día(s)`}`,
	);

	const clientes = await prisma.trainerClient.count({
		where: { trainerId: coach.id, status: "ACTIVE" },
	});
	console.log(
		`  Sus ${clientes} cliente(s) activo(s) NO se ven afectados: el muro es solo para el trainer.`,
	);

	if (!APPLY) {
		console.log("\nDRY-RUN: no se escribió nada. Re-corré con --apply.\n");
		return;
	}

	await prisma.trainerSubscription.update({
		where: { id: sub.id },
		data: {
			status: "TRIAL",
			trialEndsAt: nuevaFecha,
			currentPeriodEnd: nuevaFecha,
		},
	});

	console.log("\nListo. Para desbloquearlo: /admin → extender trial o activar licencia.\n");
}

main()
	.catch((e) => {
		console.error("\nERROR:", e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
