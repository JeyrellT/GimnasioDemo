/**
 * CLI runner — recupera los ejercicios huérfanos de la cuenta borrada del coach
 *
 * Uso:
 *   pnpm exec tsx scripts/recover-orphan-exercises.ts            # dry-run
 *   pnpm exec tsx scripts/recover-orphan-exercises.ts --apply
 *
 * Contexto: 13 ejercicios quedaron con `isPublic = false` y `createdById`
 * apuntando a una cuenta vieja de Jorge que fue borrada
 * (jeug777@gmail.com+deleted-...). Como la visibilidad es
 * `isPublic = true OR createdById = usuario_actual`, nadie podía verlos: ni el
 * Jorge de hoy (es otro id) ni los demás coaches. Estaban invisibles en la base.
 *
 * Qué hace:
 *   1. FUSIONA los que ya existen en el catálogo público, para no dejar dos
 *      tarjetas del mismo movimiento. Reusa la misma mecánica que
 *      scripts/merge-duplicate-exercise.ts: hereda el video si el nuevo no
 *      tiene, repunta prescripciones / series / overrides, y soft-delete.
 *   2. PUBLICA los que no tienen equivalente, reasignando la autoría al Jorge
 *      actual (es la misma persona; la cuenta vieja ya no existe).
 *
 * La clasificación es manual: se comparó cada huérfano contra el catálogo
 * público por nombre, músculo y equipo. El matching automático no servía —
 * emparejaba "Aperturas con mancuernas" con "Elevación lateral" solo porque
 * comparten músculo y equipo.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

/** Huérfano -> equivalente público que se conserva. */
const FUSIONAR: Array<[string, string]> = [
	// mismo nombre exacto; además el huérfano tenía SHOULDERS como primario,
	// que es incorrecto para unas aperturas de pecho.
	["aperturas-con-mancuernas", "dumbbell-chest-fly"],
	["elevaciones-frontales-con-mancuernas", "dumbbell-front-raise"],
	["elevaciones-laterales-con-mancuernas", "dumbbell-lateral-raise"],
	["press-de-banca-plano-con-mancuernas", "dumbbell-bench-press"],
	["press-banco-plano-con-barra", "barbell-bench-press"],
	["pull-apart-con-o-sin-banda", "band-pull-aparts"],
];

/**
 * Huérfanos sin equivalente en el catálogo: se publican.
 * - wall-slides: movilidad de hombro, no hay nada parecido.
 * - flexiones-inclinadas: el catálogo no tiene flexión inclinada.
 * - flexiones-con-o-sin-rodillas: la regresión con rodillas apoyadas es la
 *   opción para principiantes; "push-ups lentos" es otra cosa.
 * - fondos-en-banco: distinto de "Fondos en paralelas" y del asistido.
 * - press-de-pecho-cerrado-con-mancuernas: no hay press cerrado con mancuernas.
 * - press-militar-con-banda / con-mancuernas: el catálogo solo tiene la versión
 *   con barra y la de máquina.
 */
const PUBLICAR = [
	"wall-slides",
	"flexiones-inclinadas",
	"flexiones-con-o-sin-rodillas",
	"fondos-en-banco",
	"press-de-pecho-cerrado-con-mancuernas",
	"press-militar-con-banda",
	"press-militar-con-mancuernas",
];

/**
 * Correcciones de datos antes de publicar: estos venían mal desde la cuenta
 * vieja y al hacerlos públicos los verían todos los coaches. Una flexión es un
 * empuje de pecho, no de cuádriceps ni de cuerpo completo.
 */
const CORREGIR: Record<
	string,
	{
		primaryMuscle: "CHEST";
		secondaryMuscles: string[];
		equipment?: "BODYWEIGHT";
	}
> = {
	"flexiones-con-o-sin-rodillas": {
		primaryMuscle: "CHEST", // venía QUADS
		secondaryMuscles: ["TRICEPS", "SHOULDERS", "ABS"],
	},
	"flexiones-inclinadas": {
		primaryMuscle: "CHEST", // venía FULL_BODY
		secondaryMuscles: ["TRICEPS", "SHOULDERS", "ABS"],
		equipment: "BODYWEIGHT", // venía OTHER
	},
};

async function main(): Promise<void> {
	console.log(
		`\n=== Recuperar huérfanos ${APPLY ? "(APPLY)" : "(DRY-RUN)"} ===\n`,
	);

	// El Jorge vigente: TRAINER activo (la cuenta vieja tiene deletedAt).
	const coach = await prisma.user.findFirst({
		where: {
			role: "TRAINER",
			deletedAt: null,
			name: { contains: "jorge", mode: "insensitive" },
		},
		select: { id: true, name: true, email: true },
	});
	if (!coach) throw new Error("No se encontró un TRAINER activo llamado Jorge.");
	console.log(`Autoría se reasigna a: ${coach.name} <${coach.email}>\n`);

	// ── 1. Fusiones ───────────────────────────────────────────────────────────
	console.log(`FUSIONAR (${FUSIONAR.length}):`);
	for (const [oldSlug, newSlug] of FUSIONAR) {
		const viejo = await prisma.exercise.findUnique({
			where: { slug: oldSlug },
			select: { id: true, nameEs: true, mediaUrl: true, deletedAt: true },
		});
		const nuevo = await prisma.exercise.findUnique({
			where: { slug: newSlug },
			select: { id: true, nameEs: true, mediaUrl: true, deletedAt: true },
		});
		if (!viejo || viejo.deletedAt) {
			console.log(`   -- ${oldSlug}: ya no está, se salta`);
			continue;
		}
		if (!nuevo || nuevo.deletedAt) {
			throw new Error(`El destino ${newSlug} no existe o está borrado.`);
		}

		const presc = await prisma.routineExercise.count({
			where: { exerciseId: viejo.id },
		});
		const series = await prisma.performedSet.count({
			where: { exerciseId: viejo.id },
		});
		const heredaVideo = Boolean(viejo.mediaUrl) && !nuevo.mediaUrl;
		console.log(
			`   ${oldSlug.padEnd(40)} -> ${newSlug.padEnd(24)} (${presc} prescr., ${series} series${heredaVideo ? ", hereda video" : ""})`,
		);

		if (!APPLY) continue;

		// Evita que un día quede con el mismo ejercicio dos veces.
		const dias = await prisma.routineExercise.findMany({
			where: { exerciseId: viejo.id },
			select: { routineDayId: true },
		});
		const choque = await prisma.routineExercise.count({
			where: {
				exerciseId: nuevo.id,
				routineDayId: { in: dias.map((d) => d.routineDayId) },
			},
		});
		if (choque > 0) {
			throw new Error(
				`${oldSlug}: hay días que ya tienen ${newSlug}; quedaría duplicado. Resolvelo a mano.`,
			);
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
	}

	// ── 2. Publicaciones ──────────────────────────────────────────────────────
	console.log(`\nPUBLICAR (${PUBLICAR.length}):`);
	const aPublicar = await prisma.exercise.findMany({
		where: { slug: { in: PUBLICAR }, deletedAt: null },
		select: {
			id: true,
			slug: true,
			nameEs: true,
			primaryMuscle: true,
			equipment: true,
			isPublic: true,
		},
	});
	const noEncontrados = PUBLICAR.filter(
		(s) => !aPublicar.some((e) => e.slug === s),
	);
	if (noEncontrados.length > 0) {
		throw new Error(`No existen estos slugs: ${noEncontrados.join(", ")}`);
	}
	for (const e of aPublicar) {
		const fix = CORREGIR[e.slug];
		const nota = fix
			? `  <-- corregir a ${fix.primaryMuscle}${fix.equipment ? ` / ${fix.equipment}` : ""}`
			: "";
		console.log(
			`   ${e.slug.padEnd(40)} ${e.primaryMuscle.padEnd(10)} ${e.equipment.padEnd(11)} "${e.nameEs}"${nota}`,
		);
	}

	if (APPLY) {
		const r = await prisma.exercise.updateMany({
			where: { slug: { in: PUBLICAR }, deletedAt: null },
			data: { isPublic: true, createdById: coach.id },
		});
		console.log(`\n   -> ${r.count} publicados y reasignados.`);

		for (const [slug, fix] of Object.entries(CORREGIR)) {
			await prisma.exercise.update({
				where: { slug },
				data: {
					primaryMuscle: fix.primaryMuscle,
					secondaryMuscles:
						fix.secondaryMuscles as Parameters<
							typeof prisma.exercise.update
						>[0]["data"]["secondaryMuscles"],
					...(fix.equipment ? { equipment: fix.equipment } : {}),
				},
			});
			console.log(`   -> ${slug}: músculos y equipo corregidos.`);
		}
	}

	if (!APPLY) {
		console.log("\nDRY-RUN: no se escribió nada. Re-corré con --apply.\n");
		return;
	}

	const visibles = await prisma.exercise.count({
		where: {
			deletedAt: null,
			category: "STRENGTH",
			OR: [{ isPublic: true }, { createdById: coach.id }],
		},
	});
	console.log(`\nEjercicios de fuerza visibles ahora: ${visibles}\n`);
}

main()
	.catch((e) => {
		console.error("\nERROR:", e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
