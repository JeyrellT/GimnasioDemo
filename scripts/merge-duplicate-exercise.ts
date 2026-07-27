/**
 * CLI runner — fusiona dos ejercicios duplicados del catálogo
 *
 * Uso:
 *   pnpm exec tsx scripts/merge-duplicate-exercise.ts --old <slug> --new <slug>            # dry-run
 *   pnpm exec tsx scripts/merge-duplicate-exercise.ts --old <slug> --new <slug> --apply
 *
 * Caso de uso: el mismo movimiento quedó cargado dos veces con nombres que no
 * coinciden exactamente (typos, singular/plural, con o sin equipo en el nombre),
 * así que un match por nombre no los detecta. Se conserva el NUEVO y se retira
 * el VIEJO sin romper nada de lo que ya lo referenciaba.
 *
 * Qué hace:
 *   1. Si el viejo tiene video (`mediaUrl`) y el nuevo no, lo hereda — el link
 *      que el coach eligió a mano es trabajo que no se debe perder.
 *   2. Repunta al nuevo todo lo que apuntaba al viejo: prescripciones de rutina
 *      (RoutineExercise), series ya registradas (PerformedSet) y overrides de
 *      video por coach (TrainerExerciseMedia).
 *   3. Soft-delete del viejo (`deletedAt`), nunca hard delete: las FK son
 *      Restrict y además interesa conservar el rastro.
 *
 * Seguridad:
 *   - Aborta si un día de rutina fuera a quedar con el ejercicio repetido
 *     (RoutineExercise tiene UNIQUE por [routineDayId, order], pero dos filas
 *     distintas del mismo día apuntando al mismo ejercicio sería un duplicado
 *     visible para el cliente).
 *   - Aborta si un coach ya tenía override de video sobre AMBOS (no se puede
 *     decidir cuál gana sin preguntar).
 *   - Todo corre en una transacción.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const arg = (name: string): string | undefined => {
	const i = argv.indexOf(name);
	return i >= 0 ? argv[i + 1] : undefined;
};
const OLD = arg("--old");
const NEW = arg("--new");

async function main(): Promise<void> {
	if (!OLD || !NEW) {
		throw new Error("Faltan --old <slug> y --new <slug>.");
	}
	if (OLD === NEW) throw new Error("--old y --new son el mismo slug.");

	console.log(
		`\n=== Fusión de ejercicios ${APPLY ? "(APPLY)" : "(DRY-RUN)"} ===\n`,
	);

	const viejo = await prisma.exercise.findUnique({
		where: { slug: OLD },
		select: {
			id: true,
			slug: true,
			nameEs: true,
			mediaUrl: true,
			deletedAt: true,
		},
	});
	const nuevo = await prisma.exercise.findUnique({
		where: { slug: NEW },
		select: {
			id: true,
			slug: true,
			nameEs: true,
			mediaUrl: true,
			deletedAt: true,
		},
	});

	if (!viejo) throw new Error(`No existe el ejercicio viejo: ${OLD}`);
	if (!nuevo) throw new Error(`No existe el ejercicio nuevo: ${NEW}`);
	if (viejo.deletedAt) throw new Error(`El viejo (${OLD}) ya está borrado.`);
	if (nuevo.deletedAt) throw new Error(`El nuevo (${NEW}) está borrado.`);

	console.log(
		`VIEJO  ${viejo.slug} — "${viejo.nameEs}" (video: ${viejo.mediaUrl ? "sí" : "no"})`,
	);
	console.log(
		`NUEVO  ${nuevo.slug} — "${nuevo.nameEs}" (video: ${nuevo.mediaUrl ? "sí" : "no"})`,
	);

	const heredaVideo = Boolean(viejo.mediaUrl) && !nuevo.mediaUrl;
	if (heredaVideo) console.log(`\nEl nuevo hereda el video del viejo.`);

	// -- Referencias a repuntar -------------------------------------------------
	const prescripciones = await prisma.routineExercise.findMany({
		where: { exerciseId: viejo.id },
		select: {
			id: true,
			routineDayId: true,
			routineDay: {
				select: { name: true, routine: { select: { name: true } } },
			},
		},
	});
	const series = await prisma.performedSet.count({
		where: { exerciseId: viejo.id },
	});
	const overridesViejo = await prisma.trainerExerciseMedia.findMany({
		where: { exerciseId: viejo.id },
		select: { id: true, trainerUserId: true },
	});

	console.log(`\nReferencias al viejo:`);
	console.log(`  prescripciones de rutina: ${prescripciones.length}`);
	for (const p of prescripciones) {
		console.log(`     - "${p.routineDay.routine.name}" / ${p.routineDay.name}`);
	}
	console.log(`  series registradas: ${series}`);
	console.log(`  overrides de video por coach: ${overridesViejo.length}`);

	// -- Chequeos de seguridad --------------------------------------------------
	const diasAfectados = [...new Set(prescripciones.map((p) => p.routineDayId))];
	const yaTienenElNuevo = await prisma.routineExercise.findMany({
		where: { exerciseId: nuevo.id, routineDayId: { in: diasAfectados } },
		select: {
			routineDay: {
				select: { name: true, routine: { select: { name: true } } },
			},
		},
	});
	if (yaTienenElNuevo.length > 0) {
		throw new Error(
			`Hay días que ya tienen el ejercicio nuevo y quedarían con el mismo ejercicio dos veces: ` +
				yaTienenElNuevo
					.map((r) => `"${r.routineDay.routine.name}"/${r.routineDay.name}`)
					.join(", "),
		);
	}

	const trainersConAmbos = await prisma.trainerExerciseMedia.findMany({
		where: {
			exerciseId: nuevo.id,
			trainerUserId: { in: overridesViejo.map((o) => o.trainerUserId) },
		},
		select: { trainerUserId: true },
	});
	if (trainersConAmbos.length > 0) {
		throw new Error(
			`Estos coaches ya tienen override de video sobre ambos ejercicios; resolvelo a mano: ` +
				trainersConAmbos.map((t) => t.trainerUserId).join(", "),
		);
	}

	if (!APPLY) {
		console.log(
			`\nDRY-RUN: no se escribió nada. Re-corré con --apply para aplicar.\n`,
		);
		return;
	}

	await prisma.$transaction(
		async (tx) => {
			if (heredaVideo && viejo.mediaUrl) {
				await tx.exercise.update({
					where: { id: nuevo.id },
					data: { mediaUrl: viejo.mediaUrl },
				});
			}

			await tx.routineExercise.updateMany({
				where: { exerciseId: viejo.id },
				data: { exerciseId: nuevo.id },
			});
			await tx.performedSet.updateMany({
				where: { exerciseId: viejo.id },
				data: { exerciseId: nuevo.id },
			});
			await tx.trainerExerciseMedia.updateMany({
				where: { exerciseId: viejo.id },
				data: { exerciseId: nuevo.id },
			});

			await tx.exercise.update({
				where: { id: viejo.id },
				data: { deletedAt: new Date() },
			});
		},
		{ timeout: 30_000, maxWait: 15_000 },
	);

	console.log(
		`\nListo: ${prescripciones.length} prescripciones y ${series} series repuntadas al nuevo.`,
	);
	console.log(`El viejo (${viejo.slug}) quedó con soft-delete.\n`);
}

main()
	.catch((e) => {
		console.error("\nERROR:", e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
