/**
 * CLI runner — crea (o actualiza) las cuentas de demostración para marketing
 *
 * Uso (PowerShell), parado en la carpeta del proyecto:
 *   $env:DEMO_PASSWORD="la-clave-que-vos-elijas"
 *   pnpm exec tsx scripts/crear-cuentas-demo.ts            # dry-run
 *   pnpm exec tsx scripts/crear-cuentas-demo.ts --apply
 *
 * Por qué existe: para grabar material de marketing hace falta entrar a la app,
 * pero las cuentas reales tienen datos de clientes de verdad (protegidos por la
 * ley de datos personales) y nadie debería andar con sus contraseñas. Estas dos
 * cuentas son ficticias, con una clave que elegís vos, y se pueden borrar
 * cuando quieras sin afectar a nadie.
 *
 * Qué crea:
 *   - Un COACH ficticio con suscripción ACTIVA por un año, para que nunca
 *     aparezca el muro de renovación en medio de una grabación.
 *   - Un CLIENTE ficticio ligado a ese coach.
 *   - Le copia al coach la rutina que tiene videos en todos sus ejercicios y se
 *     la asigna al cliente, así ambas vistas tienen contenido real que mostrar.
 *
 * Idempotente: si las cuentas ya existen, actualiza la contraseña y rehace la
 * rutina. Correrlo dos veces deja el mismo estado.
 *
 * La contraseña se lee SOLO de la variable de entorno: no queda escrita en este
 * archivo ni en el repositorio.
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/crypto/passwords";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const PASSWORD = process.env.DEMO_PASSWORD;

/** Rutina que se clona: es la única con video en el 100% de sus ejercicios. */
const RUTINA_ORIGEN = "Hipertrofia Principiante 3 días";

const COACH = {
	email: "andres.coach@ejemplo.cr",
	name: "Andrés Villalobos Mora",
	tradeName: "AndresCoachCR",
	specialty: "Hipertrofia y recomposición corporal",
	bio: "Cuenta de demostración para material de marketing.",
};

const CLIENTE = {
	email: "mariana.solis@ejemplo.cr",
	name: "Mariana Solís Rojas",
};

async function main(): Promise<void> {
	console.log(`\n=== Cuentas demo ${APPLY ? "(APPLY)" : "(DRY-RUN)"} ===\n`);

	if (!PASSWORD) {
		throw new Error(
			'Falta la variable DEMO_PASSWORD. En PowerShell:  $env:DEMO_PASSWORD="tu-clave"',
		);
	}
	if (PASSWORD.length < 8) {
		throw new Error("La contraseña debe tener al menos 8 caracteres.");
	}

	const origen = await prisma.routineTemplate.findFirst({
		where: { name: RUTINA_ORIGEN, deletedAt: null },
		select: {
			id: true,
			name: true,
			goal: true,
			audience: true,
			splitDays: true,
			durationWeeks: true,
			days: {
				orderBy: { dayIndex: "asc" },
				select: {
					dayIndex: true,
					name: true,
					description: true,
					exercises: {
						orderBy: { order: "asc" },
						select: {
							exerciseId: true,
							order: true,
							targetSets: true,
							targetRepsMin: true,
							targetRepsMax: true,
							targetRpe: true,
							restSeconds: true,
							tempo: true,
							supersetGroup: true,
							notes: true,
							// El snapshot que ve el cliente lleva los datos del
							// ejercicio desnormalizados (nombre, video, miniatura).
							// Sin esto la sesión se abre sin nombres ni videos.
							exercise: {
								select: {
									slug: true,
									nameEs: true,
									nameEn: true,
									mediaUrl: true,
									gifUrl: true,
									thumbnailUrl: true,
								},
							},
						},
					},
				},
			},
		},
	});
	if (!origen) throw new Error(`No se encontró la rutina "${RUTINA_ORIGEN}".`);

	const totalEj = origen.days.reduce((n, d) => n + d.exercises.length, 0);
	console.log(`COACH   ${COACH.name} <${COACH.email}>`);
	console.log(`CLIENTE ${CLIENTE.name} <${CLIENTE.email}>`);
	console.log(
		`RUTINA  se clona "${origen.name}" — ${origen.days.length} días, ${totalEj} ejercicios`,
	);
	console.log(`CLAVE   la de DEMO_PASSWORD (${PASSWORD.length} caracteres)`);

	if (!APPLY) {
		console.log("\nDRY-RUN: no se escribió nada. Re-corré con --apply.\n");
		return;
	}

	const passwordHash = await hashPassword(PASSWORD);
	const ahora = new Date();
	const enUnAnio = new Date(ahora.getTime() + 365 * 86_400_000);

	// ── Coach ────────────────────────────────────────────────────────────────
	const coach = await prisma.user.upsert({
		where: { email: COACH.email },
		create: {
			email: COACH.email,
			name: COACH.name,
			passwordHash,
			role: "TRAINER",
			emailVerified: ahora,
			mustChangePassword: false,
		},
		update: { passwordHash, name: COACH.name, deletedAt: null },
		select: { id: true },
	});

	await prisma.trainerProfile.upsert({
		where: { userId: coach.id },
		create: {
			userId: coach.id,
			tradeName: COACH.tradeName,
			specialty: COACH.specialty,
			bio: COACH.bio,
		},
		update: { tradeName: COACH.tradeName },
	});

	// Suscripción ACTIVA por un año: sin esto el muro de renovación puede
	// aparecer justo cuando estás grabando.
	await prisma.trainerSubscription.upsert({
		where: { trainerUserId: coach.id },
		create: {
			trainerUserId: coach.id,
			planTier: "STUDIO",
			status: "ACTIVE",
			currentPeriodStart: ahora,
			currentPeriodEnd: enUnAnio,
			trialEndsAt: null,
		},
		update: {
			status: "ACTIVE",
			currentPeriodEnd: enUnAnio,
			trialEndsAt: null,
		},
	});

	// ── Cliente ──────────────────────────────────────────────────────────────
	const cliente = await prisma.user.upsert({
		where: { email: CLIENTE.email },
		create: {
			email: CLIENTE.email,
			name: CLIENTE.name,
			passwordHash,
			role: "CLIENT",
			emailVerified: ahora,
			mustChangePassword: false,
		},
		update: { passwordHash, name: CLIENTE.name, deletedAt: null },
		select: { id: true },
	});

	await prisma.clientProfile.upsert({
		where: { userId: cliente.id },
		// GREEN = cuestionario de aptitud aprobado, puede entrenar sin restricción.
		create: { userId: cliente.id, parqStatus: "GREEN" },
		update: {},
	});

	await prisma.trainerClient.upsert({
		where: {
			trainerId_clientId: { trainerId: coach.id, clientId: cliente.id },
		},
		create: {
			trainerId: coach.id,
			clientId: cliente.id,
			status: "ACTIVE",
			monthlyPriceCRC: 45_000,
		},
		update: { status: "ACTIVE", endedAt: null },
	});

	// ── Rutina clonada y asignada ────────────────────────────────────────────
	await prisma.$transaction(
		async (tx) => {
			const previa = await tx.routineTemplate.findFirst({
				where: { trainerId: coach.id, name: origen.name, deletedAt: null },
				select: { id: true },
			});
			if (previa) {
				await tx.assignedRoutine.deleteMany({
					where: { routineTemplateId: previa.id },
				});
				await tx.routineDay.deleteMany({ where: { routineId: previa.id } });
				await tx.routineTemplate.delete({ where: { id: previa.id } });
			}

			const nueva = await tx.routineTemplate.create({
				data: {
					trainerId: coach.id,
					name: origen.name,
					description: "Rutina de demostración con video en todos los ejercicios.",
					goal: origen.goal,
					audience: origen.audience,
					splitDays: origen.splitDays,
					durationWeeks: origen.durationWeeks,
				},
				select: { id: true },
			});

			for (const d of origen.days) {
				const dia = await tx.routineDay.create({
					data: {
						routineId: nueva.id,
						dayIndex: d.dayIndex,
						name: d.name,
						description: d.description,
					},
					select: { id: true },
				});
				if (d.exercises.length > 0) {
					await tx.routineExercise.createMany({
						// `exercise` es la relación que se trajo solo para el snapshot;
						// no es una columna, así que se descarta antes de insertar.
						data: d.exercises.map(({ exercise: _omitido, ...e }) => ({
							...e,
							routineDayId: dia.id,
						})),
					});
				}
			}

			// `snapshotJson` guarda la prescripción vigente que ve el cliente.
			// Se copia la estructura de días para que la sesión tenga qué mostrar.
			await tx.assignedRoutine.create({
				data: {
					clientUserId: cliente.id,
					routineTemplateId: nueva.id,
					status: "ACTIVE",
					startsOn: ahora,
					// Misma forma que usan las asignaciones reales de la app. Los
					// campos de primer nivel NO son opcionales: la pantalla de
					// sesión hace `snapshot.goal.toLowerCase()` y revienta con
					// "Algo se rompió en esta sección" si falta.
					snapshotJson: {
						goal: origen.goal,
						audience: origen.audience,
						splitDays: origen.splitDays,
						durationWeeks: origen.durationWeeks,
						templateId: nueva.id,
						templateName: origen.name,
						snapshotAt: ahora.toISOString(),
						days: origen.days.map((d) => ({
							name: d.name,
							dayIndex: d.dayIndex,
							exercises: d.exercises.map((e) => ({
								slug: e.exercise.slug,
								notes: e.notes,
								order: e.order,
								tempo: e.tempo,
								gifUrl: e.exercise.gifUrl,
								nameEn: e.exercise.nameEn,
								nameEs: e.exercise.nameEs,
								mediaUrl: e.exercise.mediaUrl,
								targetRpe: e.targetRpe ? Number(e.targetRpe) : null,
								exerciseId: e.exerciseId,
								targetSets: e.targetSets,
								restSeconds: e.restSeconds,
								thumbnailUrl: e.exercise.thumbnailUrl,
								supersetGroup: e.supersetGroup,
								targetRepsMax: e.targetRepsMax,
								targetRepsMin: e.targetRepsMin,
							})),
						})),
					},
				},
			});
		},
		{ timeout: 30_000, maxWait: 15_000 },
	);

	console.log("\nListo. Ya podés entrar con esas dos cuentas y la clave que elegiste.");
	console.log("Para borrarlas después, avisá y se hace con un script.\n");
}

main()
	.catch((e) => {
		console.error("\nERROR:", e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
