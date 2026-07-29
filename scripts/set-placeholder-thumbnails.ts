/**
 * CLI runner — imágenes provisionales para los ejercicios que aún no tienen video
 *
 * Uso:
 *   pnpm exec tsx scripts/set-placeholder-thumbnails.ts            # dry-run
 *   pnpm exec tsx scripts/set-placeholder-thumbnails.ts --apply    # aplica
 *   pnpm exec tsx scripts/set-placeholder-thumbnails.ts --clear --apply   # borra TODAS
 *
 * Mientras no haya videos propios, los ejercicios se ven con el ícono gris de
 * mancuerna. Esto les pone una foto real del movimiento para que la biblioteca
 * no se vea vacía.
 *
 * Fuente: free-exercise-db (yuhonas/free-exercise-db), dataset abierto de 873
 * ejercicios con fotos, servido por jsDelivr — el mismo CDN que el catálogo ya
 * usaba y que `next.config.ts` ya tiene en `images.remotePatterns`.
 *
 * Se escribe en `thumbnailUrl`, NO en `mediaUrl`:
 *   - `mediaUrl` es el campo del video; dejarlo libre para el video real.
 *   - `ExerciseThumbnail` (listas) y `ExerciseVideoModal` (detalle) leen
 *     `thumbnailUrl` cuando no hay gif, así que la foto llena el espacio.
 *
 * Alcance: los ejercicios que la UI muestra con el ícono gris, que NO es lo
 * mismo que "sin video". Entran tres casos: sin nada, con una ruta local
 * muerta (`/exercises/*.jpg` — esa carpeta no existe y da 404), y con un video
 * del que no se puede derivar poster. Si un ejercicio ya muestra una foto, no
 * se toca. Al cargar los videos reales, `--clear` deja los thumbnails en null
 * de una sola pasada.
 *
 * El emparejamiento es manual (abajo), no automático: probamos con matching por
 * nombre y asignaba cosas como "Dumbbell Squat" a las aperturas de pecho.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const CLEAR = argv.includes("--clear");

const CDN =
	"https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises";
const INDEX =
	"https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json";

/**
 * slug del catálogo -> nombre EXACTO en free-exercise-db.
 * Revisado a mano ejercicio por ejercicio. Cuando el movimiento exacto no
 * existe en el dataset se usa el más cercano (ej. no hay búlgaro, se usa
 * "Split Squat with Dumbbells"); son fotos de relleno, no material didáctico.
 */
const MAP: Record<string, string> = {
	// --- pierna ---
	"bulgarian-split-squat-dumbbell": "Split Squat with Dumbbells",
	"smith-machine-bulgarian-split-squat": "Smith Single-Leg Split Squat",
	"heels-elevated-goblet-squat": "Goblet Squat",
	"kettlebell-sumo-squat": "Plie Dumbbell Squat",
	"smith-machine-squat": "Smith Machine Squat",
	"hack-squat-machine": "Hack Squat",
	"squat-jump": "Weighted Jump Squat",
	"seated-leg-curl": "Seated Leg Curl",
	"smith-machine-deadlift": "Smith Machine Stiff-Legged Deadlift",
	"dumbbell-deadlift": "Romanian Deadlift",
	"machine-hip-thrust": "Barbell Hip Thrust",
	"barbell-hip-thrust": "Barbell Hip Thrust",
	"single-leg-hip-thrust": "Barbell Hip Thrust",
	"seated-hip-abduction-machine": "Thigh Abductor",
	"hip-adduction-machine": "Thigh Adductor",
	"standing-calf-raise-machine": "Standing Calf Raises",
	"seated-calf-raise-machine": "Seated Calf Raise",
	"leg-press-calf-raise": "Calf Press On The Leg Press Machine",
	// --- espalda ---
	"close-grip-lat-pulldown": "Close-Grip Front Lat Pulldown",
	"reverse-grip-lat-pulldown": "Underhand Cable Pulldowns",
	"cable-straight-arm-pullover": "Straight-Arm Dumbbell Pullover",
	"machine-single-arm-row": "Leverage Iso Row",
	"chest-supported-row-machine": "Leverage High Row",
	"t-bar-row-machine": "T-Bar Row with Handle",
	"machine-assisted-wide-grip-pull-up": "Band Assisted Pull-Up",
	// --- pecho ---
	"smith-machine-incline-bench-press": "Smith Machine Incline Bench Press",
	"smith-machine-bench-press": "Smith Machine Bench Press",
	"incline-dumbbell-press": "Incline Dumbbell Press",
	"machine-incline-chest-press": "Leverage Incline Chest Press",
	"machine-vertical-chest-press": "Leverage Chest Press",
	"pec-deck-machine": "Butterfly",
	// --- hombro ---
	"machine-shoulder-press": "Leverage Shoulder Press",
	"seated-dumbbell-lateral-raise": "Seated Side Lateral Raise",
	"dumbbell-rear-delt-raise": "Seated Bent-Over Rear Delt Raise",
	"four-way-dumbbell-delt-raise": "Side Laterals to Front Raise",
	"cable-face-pull": "Face Pull",
	// --- brazo ---
	"ez-bar-curl": "EZ-Bar Curl",
	"standing-ez-bar-preacher-curl": "Preacher Curl",
	"dumbbell-spider-curl": "Spider Curl",
	"bayesian-cable-curl": "Standing One-Arm Cable Curl",
	"hammer-curl-isometric-hold": "Alternate Hammer Curl",
	"dumbbell-isometric-biceps-hold": "Seated Dumbbell Curl",
	"machine-assisted-dip": "Dip Machine",
	"close-grip-push-up": "Push-Ups - Close Triceps Position",
	"overhead-dumbbell-triceps-extension": "Dumbbell One-Arm Triceps Extension",
	// --- core / full body ---
	"dumbbell-thruster": "Kettlebell Thruster",
	"russian-twist": "Russian Twist",
	"crunch-feet-elevated": "Crunch - Legs On Exercise Ball",
	"plank-up-down": "Plank",
	"weighted-decline-sit-up": "Sit-Up",

	// --- calentamiento (sembrados en 20260518230000_seed_warmup_exercises) ---
	// Tampoco tienen video, así que entran en el mismo relleno.
	"aperturas-con-mancuernas": "Dumbbell Flyes",
	"elevaciones-frontales-con-mancuernas": "Front Dumbbell Raise",
	"elevaciones-laterales-con-mancuernas": "Side Lateral Raise",
	"flexiones-con-o-sin-rodillas": "Pushups",
	"flexiones-inclinadas": "Incline Push-Up",
	"fondos-en-banco": "Bench Dips",
	"press-banco-plano-con-barra": "Barbell Bench Press - Medium Grip",
	"press-de-banca-plano-con-mancuernas": "Dumbbell Bench Press",
	"press-de-pecho-cerrado-con-mancuernas":
		"Dumbbell Bench Press with Neutral Grip",
	"press-militar-con-banda": "Shoulder Press - With Bands",
	"press-militar-con-mancuernas": "Dumbbell Shoulder Press",
	"pull-apart-con-o-sin-banda": "Band Pull Apart",

	// --- calentamiento y movilidad ---
	// Estos apuntaban a rutas locales muertas (/exercises/*.jpg): la carpeta
	// public/exercises no existe y en producción daban 404, por eso salían con
	// el ícono gris.
	"circulos-de-hombros": "Shoulder Circles",
	"circulos-de-brazos": "Arm Circles",
	"circulos-de-cadera": "Standing Hip Circles",
	"circulos-de-tobillos": "Ankle Circles",
	"puente-de-gluteo": "Butt Lift (Bridge)",
	"bird-dog": "Superman",
	"push-ups-lentos": "Pushups",
	"saltos-de-tijera": "Rope Jumping",
	"rodillas-altas": "Fast Skipping",
	"talones-a-gluteos": "Double Leg Butt Kick",
	"saltar-la-cuerda": "Rope Jumping",
	"mountain-climbers": "Mountain Climbers",
	"gato-camello": "Cat Stretch",
	"worlds-greatest-stretch": "World's Greatest Stretch",
	inchworm: "Inchworm",
	"sentadilla-con-peso-corporal": "Bodyweight Squat",
	"band-pull-aparts": "Band Pull Apart",
	"face-pulls-con-banda": "Face Pull",
	"monster-walks-con-banda": "Monster Walk",
	"wall-slides": "Shoulder Stretch",
	// --- estiramientos ---
	"estiramiento-cuadriceps-de-pie": "Quad Stretch",
	"estiramiento-isquiotibiales-sentado": "Seated Floor Hamstring Stretch",
	"estiramiento-gemelos-en-pared": "Calf Stretch Hands Against Wall",
	"estiramiento-flexor-de-cadera": "Kneeling Hip Flexor",
	"estiramiento-pecho-en-puerta": "Chest And Front Of Shoulder Stretch",
	"estiramiento-triceps-sobre-cabeza": "Triceps Stretch",
	"figura-4-supino": "IT Band and Glute Stretch",
	"postura-del-nino": "Child's Pose",
};

/** Una URL de imagen sirve solo si es http(s); las rutas locales están muertas. */
function thumbUsable(t: string | null): boolean {
	return Boolean(t && (t.startsWith("http://") || t.startsWith("https://")));
}

/** El thumbnail se puede derivar del video solo en Drive / YouTube / Vimeo. */
function videoDerivable(v: string | null): boolean {
	return Boolean(
		v &&
			/drive\.google\.com|googleusercontent\.com|youtube\.com|youtu\.be|vimeo\.com/.test(
				v,
			),
	);
}

interface FeEntry {
	id: string;
	name: string;
	images: string[];
}

async function main(): Promise<void> {
	console.log(
		`\n=== Thumbnails provisionales ${APPLY ? "(APPLY)" : "(DRY-RUN)"}${CLEAR ? " [CLEAR]" : ""} ===\n`,
	);

	// -- Modo borrado: limpia los thumbnails que apuntan al CDN del dataset -----
	if (CLEAR) {
		const conPlaceholder = await prisma.exercise.count({
			where: { thumbnailUrl: { startsWith: CDN }, deletedAt: null },
		});
		console.log(`Ejercicios con thumbnail provisional: ${conPlaceholder}`);
		if (!APPLY) {
			console.log("\nDRY-RUN: no se borró nada. Agregá --apply.\n");
			return;
		}
		const r = await prisma.exercise.updateMany({
			where: { thumbnailUrl: { startsWith: CDN }, deletedAt: null },
			data: { thumbnailUrl: null },
		});
		console.log(`\nBorrados: ${r.count} thumbnails.\n`);
		return;
	}

	// -- Descargar el índice del dataset y resolver cada nombre a su imagen ----
	const res = await fetch(INDEX);
	if (!res.ok)
		throw new Error(
			`No se pudo bajar el índice del dataset: HTTP ${res.status}`,
		);
	const fedb = (await res.json()) as FeEntry[];
	const byName = new Map(fedb.map((f) => [f.name, f]));

	const faltantes = Object.entries(MAP).filter(([, name]) => !byName.has(name));
	if (faltantes.length > 0) {
		const detalle = faltantes
			.map(([slug, name]) => `${slug} -> "${name}"`)
			.join(", ");
		throw new Error(
			`Estos nombres ya no existen en el dataset (¿cambió upstream?): ${detalle}`,
		);
	}

	// -- Ejercicios objetivo -----------------------------------------------------
	// Los que la UI muestra con el ícono gris de mancuerna, que NO es lo mismo
	// que "sin video": también entran los que tienen una ruta local muerta
	// (/exercises/*.jpg — esa carpeta no existe) o un video del que no se puede
	// derivar poster. El criterio replica resolveUrl() de ExerciseThumbnail.
	const todos = await prisma.exercise.findMany({
		where: { deletedAt: null },
		select: {
			id: true,
			slug: true,
			nameEs: true,
			thumbnailUrl: true,
			mediaUrl: true,
		},
		orderBy: { nameEs: "asc" },
	});
	const sinFoto = todos.filter(
		(e) => !thumbUsable(e.thumbnailUrl) && !videoDerivable(e.mediaUrl),
	);
	console.log(`Ejercicios en el catálogo: ${todos.length}`);
	console.log(`Se ven con el ícono gris (sin foto): ${sinFoto.length}`);

	const sinMapear = sinFoto.filter((e) => !MAP[e.slug]);
	if (sinMapear.length > 0) {
		console.log(
			`\nSin imagen asignada en el MAP (${sinMapear.length}) — se dejan como están:`,
		);
		for (const e of sinMapear) console.log(`   - ${e.slug} (${e.nameEs})`);
	}

	const objetivo = sinFoto.filter((e) => MAP[e.slug]);
	console.log(`\nA rellenar: ${objetivo.length}`);

	// -- Verificar que cada imagen exista de verdad antes de escribirla ---------
	const urls = new Map<string, string>();
	let rotas = 0;
	for (const e of objetivo) {
		const entry = byName.get(MAP[e.slug]);
		if (!entry) continue; // ya validado arriba; el guard mantiene los tipos sanos
		const img = entry.images[0];
		if (!img) {
			console.log(`   !! ${e.slug}: "${entry.name}" no tiene imágenes`);
			rotas++;
			continue;
		}
		const url = `${CDN}/${img}`;
		const head = await fetch(url, { method: "HEAD" });
		if (!head.ok) {
			console.log(`   !! ${e.slug}: HTTP ${head.status} en ${url}`);
			rotas++;
			continue;
		}
		urls.set(e.id, url);
		console.log(`   ok ${e.slug.padEnd(38)} <- ${entry.name}`);
	}

	if (rotas > 0)
		console.log(
			`\n${rotas} imagen(es) no disponibles; esos ejercicios se dejan sin thumbnail.`,
		);

	if (!APPLY) {
		console.log("\nDRY-RUN: no se escribió nada. Re-corré con --apply.\n");
		return;
	}

	let n = 0;
	for (const [id, url] of urls) {
		await prisma.exercise.update({
			where: { id },
			data: { thumbnailUrl: url },
		});
		n++;
	}
	console.log(`\nListo: ${n} thumbnails asignados.`);
	console.log("Para borrarlos todos cuando tengás los videos:");
	console.log(
		"   pnpm exec tsx scripts/set-placeholder-thumbnails.ts --clear --apply\n",
	);
}

main()
	.catch((e) => {
		console.error("\nERROR:", e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
