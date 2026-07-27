/**
 * CLI runner — carga los programas del coach (rutina de mujer y de hombre)
 *
 *   - "Programa Coo 2.0"            -> rutina FEMALE, 5 días + abdominales
 *   - "Programa Entrenamiento Leyner" -> rutina MALE, 6 días + abdominales
 *
 * Uso:
 *   pnpm exec tsx scripts/load-programas-coach.ts                          # dry-run
 *   pnpm exec tsx scripts/load-programas-coach.ts --apply                  # aplica
 *   pnpm exec tsx scripts/load-programas-coach.ts --apply --trainer-email coach@x.com
 *
 * Qué hace:
 *   1. Resuelve el coach destino (por --trainer-email, o el TRAINER cuyo nombre
 *      contenga "jorge"). Falla si hay 0 o más de 1 candidato.
 *   2. Upsert por `slug` de los ejercicios NUEVOS de ambos programas
 *      (prisma/seed/data/exercises-programa-{coo,leyner}.json) en el CATÁLOGO
 *      PÚBLICO: isPublic=true, createdById=null. Cualquier coach que abra una
 *      cuenta los ve, tengan video o no. Como todo ejercicio público quedan
 *      read-only en la UI; cada coach puede asignarles su propio video con
 *      TrainerExerciseMedia sin tocar la fila compartida.
 *   3. Verifica que existan los ejercicios que los programas REUSAN del catálogo
 *      público (leg-press, plank, dips, etc.). Si falta alguno, aborta antes de
 *      tocar las rutinas — no se crea una rutina a medias.
 *   4. Crea las dos RoutineTemplate (FEMALE y MALE) con sus días de
 *      entrenamiento + el bloque de abdominales, respetando sets/reps/notas y
 *      mapeando la nomenclatura A/B del PDF a `supersetGroup`.
 *
 * Idempotencia:
 *   - Ejercicios: upsert por slug (re-correr no duplica).
 *   - Rutinas: si ya existe una RoutineTemplate del mismo coach con el mismo
 *     nombre, se reemplazan sus días (delete + recreate) en una transacción,
 *     de modo que re-correr deja el mismo estado final.
 *
 * Requiere DATABASE_URL apuntando a la base destino.
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const emailFlagIdx = argv.indexOf("--trainer-email");
const TRAINER_EMAIL = emailFlagIdx >= 0 ? argv[emailFlagIdx + 1] : undefined;

// ---------------------------------------------------------------------------
// Datos de ejercicios (investigados y validados)
// ---------------------------------------------------------------------------

interface ExerciseEntry {
  pdfName: string;
  slug: string;
  nameEs: string;
  nameEn: string;
  instructionsEs: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  difficulty: string;
  category: string;
  reuseExistingSlug: string | null;
  note: string | null;
}

function loadEntries(file: string): ExerciseEntry[] {
  return JSON.parse(
    readFileSync(join(__dirname, "..", "prisma", "seed", "data", file), "utf-8"),
  );
}

// Fichas investigadas: las del programa de mujer (Coo) + las nuevas del de hombre
// (Leyner). Se deduplican por slug: varios ejercicios de ambos PDFs comparten
// entrada de catálogo (p. ej. "Prensa" y "Prensa horizontal" -> leg-press).
const ENTRIES: ExerciseEntry[] = [
  ...loadEntries("exercises-programa-coo.json"),
  ...loadEntries("exercises-programa-leyner.json"),
];

/** pdfName -> slug efectivo (el reusado del catálogo, o el nuevo). */
const SLUG_BY_PDF_NAME = new Map<string, string>(
  ENTRIES.map((e) => [e.pdfName, e.reuseExistingSlug ?? e.slug]),
);

/**
 * Alias: nombres que aparecen en el PDF de hombre para ejercicios que ya
 * quedaron cubiertos por el programa de mujer o por el catálogo público, pero
 * escritos distinto ("Flexión rodilla sentado" vs "Flexión de rodilla sentada").
 * Mapean directo al slug final para no duplicar fichas.
 */
const ALIASES: Record<string, string> = {
  // --- ya cubiertos por el catálogo público ---
  "Dominadas abiertas": "pull-up",
  "Fondos en paralelas": "dips",
  "Peso Muerto barra olimpica": "conventional-deadlift",
  "Remo con mancuerna": "dumbbell-single-arm-row",
  "Press frances con romana": "ez-bar-skull-crusher", // "romana" = barra Z en CR
  // --- ya cubiertos por las fichas del programa de mujer ---
  "Jalón Abierto": "cable-lat-pulldown",
  "Jalón Cerrado": "close-grip-lat-pulldown",
  "Press vertical máquina": "machine-vertical-chest-press",
  "Máquina de abductor": "seated-hip-abduction-machine",
  "Flexión rodilla sentado": "seated-leg-curl",
  "Flexión rodilla acostado": "lying-leg-curl",
};

function slugFor(pdfName: string): string {
  const alias = ALIASES[pdfName];
  if (alias) return alias;
  const s = SLUG_BY_PDF_NAME.get(pdfName);
  if (!s) throw new Error(`Ejercicio no encontrado en el JSON ni en ALIASES: "${pdfName}"`);
  return s;
}

// ---------------------------------------------------------------------------
// Blueprint de la rutina (fiel al PDF "Programa Coo 2.0")
// ---------------------------------------------------------------------------

interface Item {
  pdf: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  superset: number | null;
  rest: number;
  notes: string | null;
}

interface Day {
  index: number;
  name: string;
  description: string | null;
  items: Item[];
}

interface RoutineSpec {
  name: string;
  description: string;
  audience: "FEMALE" | "MALE";
  days: Day[];
}

/** Recomendaciones del coach — idénticas en los dos PDFs (última página). */
function recomendaciones(intro: string): string {
  return [
    intro,
    "",
    "Recomendaciones:",
    "1. Control del peso: usá una carga que te permita mantener la técnica correcta. No excedas el peso en ninguna serie y aumentá progresivamente.",
    "2. Descansos perceptivos: ajustá el descanso según tu recuperación y control respiratorio. Máximo 3 minutos entre series en todos los casos.",
    "3. Avisá si sentís algún dolor, molestia o incomodidad en alguno de los ejercicios.",
    "4. Tomá suficiente agua durante el descanso.",
    "5. Terminá con 5 a 15 minutos de cardio suave en caminadora, elíptica o escaladora, caminando a baja intensidad.",
    "6. Bloques (A/B): los ejercicios agrupados se realizan alternados, uno detrás del otro, como un solo bloque.",
  ].join("\n");
}

/** Nota que se repite mucho en el programa de hombre. */
const PARCIALES = "10 repeticiones completas y 10 parciales.";

const COO_DAYS: Day[] = [
  {
    index: 1,
    name: "Día 1 — Pierna (cuádriceps y glúteo)",
    description: null,
    items: [
      { pdf: "Desplante búlgaro mancuerna", sets: 4, repsMin: 5, repsMax: 10, superset: null, rest: 90, notes: "10 repeticiones con peso; soltás el peso y hacés 5 repeticiones más." },
      { pdf: "Sentadilla goblet con cuña", sets: 3, repsMin: 15, repsMax: 15, superset: 2, rest: 60, notes: null },
      { pdf: "Sentadilla sumo con KTB", sets: 3, repsMin: 15, repsMax: 15, superset: 2, rest: 90, notes: null },
      { pdf: "Máquina abductor", sets: 4, repsMin: 30, repsMax: 30, superset: null, rest: 60, notes: null },
      { pdf: "Extensión de rodilla", sets: 3, repsMin: 8, repsMax: 12, superset: null, rest: 90, notes: "Subiendo peso en cada serie: 12, 10 y 8 repeticiones. Preguntale al coach el peso." },
      { pdf: "Máquina hip trust", sets: 4, repsMin: 12, repsMax: 12, superset: null, rest: 90, notes: "Con el peso completo y sostené 10 segundos al final." },
      { pdf: "Prensa horizontal", sets: 3, repsMin: 12, repsMax: 12, superset: null, rest: 90, notes: null },
    ],
  },
  {
    index: 2,
    name: "Día 2 — Espalda, hombro y tríceps",
    description: null,
    items: [
      { pdf: "Jalón abierto", sets: 3, repsMin: 10, repsMax: 10, superset: 1, rest: 0, notes: "Sin descanso: seguí de una con el jalón cerrado." },
      { pdf: "Jalón cerrado", sets: 3, repsMin: 10, repsMax: 10, superset: 1, rest: 0, notes: "Va pegado al jalón abierto, sin descanso entre los dos." },
      { pdf: "Elevación lateral mancuerna", sets: 3, repsMin: 15, repsMax: 15, superset: 1, rest: 90, notes: "Bajá el peso si lo necesitás, pero completá las 15 repeticiones." },
      { pdf: "Pull over polea", sets: 4, repsMin: 15, repsMax: 15, superset: 2, rest: 0, notes: null },
      { pdf: "Extensión codo mecate", sets: 4, repsMin: 15, repsMax: 15, superset: 2, rest: 90, notes: null },
      { pdf: "Remo máquina individual", sets: 3, repsMin: 12, repsMax: 12, superset: 3, rest: 0, notes: null },
      { pdf: "Máquina jalón dorsal supino", sets: 3, repsMin: 12, repsMax: 12, superset: 3, rest: 90, notes: null },
      { pdf: "Fondos asistidos", sets: 3, repsMin: 12, repsMax: 12, superset: null, rest: 90, notes: null },
    ],
  },
  {
    index: 3,
    name: "Día 3 — Femoral, glúteo y pantorrilla",
    description: null,
    items: [
      { pdf: "Peso muerto en Smith", sets: 4, repsMin: 12, repsMax: 12, superset: null, rest: 120, notes: null },
      { pdf: "Flexión de rodilla acostada", sets: 4, repsMin: 15, repsMax: 15, superset: null, rest: 90, notes: "Sostené 15 segundos al final de cada serie." },
      { pdf: "Flexión de rodilla sentada", sets: 4, repsMin: 10, repsMax: 10, superset: null, rest: 90, notes: "Individual: 10 repeticiones con cada pierna." },
      { pdf: "Prensa", sets: 4, repsMin: 10, repsMax: 10, superset: null, rest: 120, notes: "Subiendo peso en cada serie." },
      { pdf: "Máquina de pantorrillas", sets: 2, repsMin: 1, repsMax: 10, superset: null, rest: 60, notes: "Bajada: hacés 10, 9, 8, 7... hasta 1 y repetís." },
      { pdf: "Hip trust con una pierna", sets: 3, repsMin: 15, repsMax: 15, superset: null, rest: 90, notes: null },
      { pdf: "Máquina aductor", sets: 3, repsMin: 30, repsMax: 30, superset: null, rest: 60, notes: null },
    ],
  },
  {
    index: 4,
    name: "Día 4 — Hombro y brazo",
    description: null,
    items: [
      { pdf: "Elevación frontal mancuerna", sets: 3, repsMin: 10, repsMax: 10, superset: 1, rest: 0, notes: null },
      { pdf: "Press militar máquina", sets: 3, repsMin: 12, repsMax: 12, superset: 1, rest: 90, notes: null },
      { pdf: "Elevación posterior mancuerna", sets: 3, repsMin: 12, repsMax: 12, superset: 2, rest: 0, notes: null },
      { pdf: "Bíceps hold", sets: 3, repsMin: 12, repsMax: 12, superset: 2, rest: 0, notes: "Sostén isométrico: aguantás la posición, no hacés repeticiones normales." },
      { pdf: "Curl martillo", sets: 3, repsMin: 12, repsMax: 12, superset: 2, rest: 90, notes: null },
      { pdf: "Face pull", sets: 3, repsMin: 15, repsMax: 15, superset: 4, rest: 0, notes: null },
      { pdf: "Plancha", sets: 3, repsMin: 1, repsMax: 1, superset: 4, rest: 60, notes: "Sostené 1 minuto." },
    ],
  },
  {
    index: 5,
    name: "Día 5 — Full body / metabólico",
    description: null,
    items: [
      { pdf: "Thrusters", sets: 3, repsMin: 12, repsMax: 12, superset: 1, rest: 0, notes: null },
      { pdf: "Salto con sentadilla", sets: 3, repsMin: 12, repsMax: 12, superset: 1, rest: 90, notes: null },
      { pdf: "Peso muerto mancuerna", sets: 3, repsMin: 12, repsMax: 12, superset: null, rest: 90, notes: null },
      { pdf: "Press pecho vertical máquina", sets: 3, repsMin: 12, repsMax: 12, superset: null, rest: 90, notes: null },
      { pdf: "Curl barra Z", sets: 3, repsMin: 12, repsMax: 12, superset: null, rest: 60, notes: null },
      { pdf: "Máquina Remo T", sets: 3, repsMin: 12, repsMax: 12, superset: null, rest: 90, notes: null },
      { pdf: "Four ways", sets: 3, repsMin: 10, repsMax: 10, superset: null, rest: 60, notes: "Las cuatro elevaciones encadenadas cuentan como una sola repetición. Usá poco peso." },
    ],
  },
  {
    index: 6,
    name: "Abdominales (2-3 veces por semana)",
    description:
      "Máximo 2-3 sesiones de abdomen por semana, al final de la rutina, dejando al menos 1 día de descanso entre una y otra.",
    items: [
      { pdf: "Twister russian", sets: 3, repsMin: 30, repsMax: 30, superset: null, rest: 45, notes: null },
      { pdf: "Abdominal básico pie arriba", sets: 3, repsMin: 25, repsMax: 25, superset: null, rest: 45, notes: null },
      { pdf: "Plancha dinámica", sets: 3, repsMin: 1, repsMax: 1, superset: null, rest: 45, notes: "Sostené 45 segundos subiendo y bajando los codos." },
    ],
  },
];

// ---------------------------------------------------------------------------
// Blueprint del "Programa Entrenamiento Leyner" (hombre) — 6 días + abdominales
// ---------------------------------------------------------------------------

const LEYNER_DAYS: Day[] = [
  {
    index: 1,
    name: "Día 1 — Empuje (pecho, hombro y tríceps)",
    description: null,
    items: [
      { pdf: "Press inclinado smith", sets: 4, repsMin: 8, repsMax: 10, superset: null, rest: 120, notes: null },
      { pdf: "Press plano smith o barra", sets: 3, repsMin: 10, repsMax: 10, superset: 2, rest: 0, notes: `${PARCIALES} Podés hacerlo en Smith o con barra.` },
      { pdf: "Aperturas con mancuerna", sets: 3, repsMin: 15, repsMax: 15, superset: 2, rest: 90, notes: "Abrí todo lo que puedas, sin forzar el hombro." },
      { pdf: "Press vertical máquina", sets: 3, repsMin: 10, repsMax: 12, superset: null, rest: 90, notes: PARCIALES },
      { pdf: "Extensión codo mecate", sets: 3, repsMin: 10, repsMax: 10, superset: null, rest: 90, notes: "10 repeticiones con el codo en grado 0 y 10 con el codo a 30 grados." },
      { pdf: "Fondos en paralelas", sets: 3, repsMin: 15, repsMax: 15, superset: null, rest: 90, notes: "Bajá profundo y con el tronco inclinado hacia adelante." },
      { pdf: "Press militar máquina", sets: 3, repsMin: 8, repsMax: 12, superset: null, rest: 90, notes: "Pirámide de mayor a menor peso: 8, 10 y 12 repeticiones." },
    ],
  },
  {
    index: 2,
    name: "Día 2 — Tirón (espalda y bíceps)",
    description: null,
    items: [
      { pdf: "Dominadas abiertas", sets: 3, repsMin: 8, repsMax: 10, superset: null, rest: 120, notes: null },
      { pdf: "Máquina dominadas abiertas", sets: 3, repsMin: 20, repsMax: 20, superset: 2, rest: 0, notes: "Sacá pecho y estirá completo abajo." },
      { pdf: "Jalón Abierto", sets: 3, repsMin: 10, repsMax: 10, superset: 2, rest: 90, notes: "Usá 3 posiciones de agarre distintas (preguntale al coach cuáles)." },
      { pdf: "Jalón Cerrado", sets: 3, repsMin: 12, repsMax: 12, superset: null, rest: 90, notes: null },
      { pdf: "Pull over polea", sets: 3, repsMin: 15, repsMax: 15, superset: null, rest: 90, notes: null },
      { pdf: "Curl predicador barra Z de pie", sets: 3, repsMin: 12, repsMax: 12, superset: 5, rest: 0, notes: null },
      { pdf: "Curl martillo hold", sets: 3, repsMin: 10, repsMax: 10, superset: 5, rest: 90, notes: "10 repeticiones normales y 10 segundos de sostén al final (confirmá el formato con el coach)." },
    ],
  },
  {
    index: 3,
    name: "Día 3 — Pierna completa",
    description: null,
    items: [
      { pdf: "Desplante búlgaro Smith", sets: 4, repsMin: 12, repsMax: 12, superset: null, rest: 90, notes: null },
      { pdf: "Sentadilla Smith", sets: 4, repsMin: 10, repsMax: 10, superset: null, rest: 120, notes: PARCIALES },
      { pdf: "Prensa", sets: 4, repsMin: 10, repsMax: 10, superset: null, rest: 120, notes: PARCIALES },
      { pdf: "Peso Muerto barra olimpica", sets: 4, repsMin: 10, repsMax: 10, superset: null, rest: 120, notes: null },
      { pdf: "Hip trust barra olímpica o máquina", sets: 3, repsMin: 10, repsMax: 10, superset: null, rest: 90, notes: `${PARCIALES} Podés hacerlo con barra olímpica o en máquina.` },
      { pdf: "Pantorrillas en prensa horizontal", sets: 2, repsMin: 1, repsMax: 10, superset: null, rest: 60, notes: "Bajada: hacés 10, 9, 8, 7... hasta 1 y repetís." },
      { pdf: "Máquina de abductor", sets: 3, repsMin: 15, repsMax: 15, superset: null, rest: 60, notes: "15 repeticiones y 15 más para terminar." },
    ],
  },
  {
    index: 4,
    name: "Día 4 — Empuje 2 (pecho, hombro y tríceps)",
    description: null,
    items: [
      { pdf: "Press inclinado mancuernas", sets: 4, repsMin: 8, repsMax: 10, superset: null, rest: 120, notes: "Agarre neutro y bajá completo." },
      { pdf: "Press inclinado máquina", sets: 3, repsMin: 10, repsMax: 12, superset: null, rest: 90, notes: "En el gimnasio del coach es la máquina amarilla." },
      { pdf: "Peck deck", sets: 3, repsMin: 10, repsMax: 10, superset: null, rest: 90, notes: PARCIALES },
      { pdf: "Elevación lateral sentado", sets: 3, repsMin: 12, repsMax: 12, superset: null, rest: 60, notes: null },
      { pdf: "Press frances con romana", sets: 3, repsMin: 10, repsMax: 10, superset: 5, rest: 0, notes: "Con barra Z (romana)." },
      { pdf: "Push ups cerrados", sets: 3, repsMin: 12, repsMax: 12, superset: 5, rest: 90, notes: null },
      { pdf: "Extensión codo sobre cabeza", sets: 3, repsMin: 15, repsMax: 15, superset: null, rest: 60, notes: null },
    ],
  },
  {
    index: 5,
    name: "Día 5 — Tirón 2 (espalda y bíceps)",
    description: null,
    items: [
      { pdf: "Remo máquina triángulo", sets: 4, repsMin: 12, repsMax: 12, superset: null, rest: 90, notes: "En polea, con el agarre de triángulo." },
      { pdf: "Remo máquina individual", sets: 4, repsMin: 10, repsMax: 10, superset: null, rest: 90, notes: "10 repeticiones con cada brazo." },
      { pdf: "Remo máquina amarilla", sets: 3, repsMin: 5, repsMax: 8, superset: null, rest: 90, notes: "8 repeticiones con cada brazo por separado y 5 con los dos juntos. En el gimnasio del coach es la máquina amarilla." },
      { pdf: "Remo con mancuerna", sets: 3, repsMin: 5, repsMax: 5, superset: null, rest: 90, notes: "Estirá bien abajo en cada repetición." },
      { pdf: "Curl Bayesian polea individual", sets: 3, repsMin: 10, repsMax: 10, superset: null, rest: 60, notes: null },
      { pdf: "Face pull", sets: 3, repsMin: 15, repsMax: 15, superset: null, rest: 60, notes: null },
      { pdf: "Curl spider mancuerna", sets: 3, repsMin: 10, repsMax: 10, superset: null, rest: 60, notes: null },
    ],
  },
  {
    index: 6,
    name: "Día 6 — Femoral, cuádriceps y pantorrilla",
    description: null,
    items: [
      { pdf: "Flexión rodilla sentado", sets: 4, repsMin: 15, repsMax: 15, superset: null, rest: 90, notes: null },
      { pdf: "Flexión rodilla acostado", sets: 3, repsMin: 12, repsMax: 12, superset: null, rest: 90, notes: "Sostené 1 segundo en cada repetición." },
      { pdf: "Extensión de rodilla", sets: 3, repsMin: 8, repsMax: 12, superset: null, rest: 90, notes: "Subiendo peso en cada serie: 12, 10 y 8 repeticiones." },
      { pdf: "Sentadilla Hack", sets: 3, repsMin: 6, repsMax: 8, superset: null, rest: 120, notes: null },
      { pdf: "Soleos máquina", sets: 3, repsMin: 20, repsMax: 20, superset: null, rest: 60, notes: "Sostené 20 segundos al final de la serie." },
      { pdf: "Máquina aductor", sets: 3, repsMin: 20, repsMax: 20, superset: null, rest: 60, notes: "Sostené 20 segundos al final de la serie." },
    ],
  },
  {
    index: 7,
    name: "Abdominales (2-3 veces por semana)",
    description:
      "Máximo 2-3 sesiones de abdomen por semana, al final de la rutina, dejando al menos 1 día de descanso entre una y otra.",
    items: [
      { pdf: "Máquina abs declinado", sets: 3, repsMin: 15, repsMax: 15, superset: null, rest: 45, notes: "Con peso (saco)." },
      { pdf: "Twister russian", sets: 3, repsMin: 30, repsMax: 30, superset: null, rest: 45, notes: null },
      { pdf: "Plancha", sets: 3, repsMin: 1, repsMax: 1, superset: null, rest: 45, notes: "Sostené 1 minuto." },
    ],
  },
];

// ---------------------------------------------------------------------------
// Rutinas a cargar
// ---------------------------------------------------------------------------

const ROUTINES: RoutineSpec[] = [
  {
    name: "Programa Coo 2.0 — Mujer",
    audience: "FEMALE",
    description: recomendaciones(
      "Programa de 5 días + bloque de abdominales, adaptado del PDF original del coach.",
    ),
    days: COO_DAYS,
  },
  {
    name: "Programa Entrenamiento Leyner — Hombre",
    audience: "MALE",
    description: recomendaciones(
      "Programa de 6 días + bloque de abdominales, adaptado del PDF original del coach.",
    ),
    days: LEYNER_DAYS,
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\n=== Programa Coo 2.0 — carga ${APPLY ? "(APPLY)" : "(DRY-RUN)"} ===\n`);

  // -- 1. Resolver coach ------------------------------------------------------
  const trainers = await prisma.user.findMany({
    where: TRAINER_EMAIL
      ? { email: TRAINER_EMAIL, deletedAt: null }
      : { role: "TRAINER", deletedAt: null, name: { contains: "jorge", mode: "insensitive" } },
    select: { id: true, name: true, email: true, role: true },
  });

  if (trainers.length === 0) {
    throw new Error(
      TRAINER_EMAIL
        ? `No existe un usuario con email ${TRAINER_EMAIL}.`
        : `No se encontró ningún TRAINER cuyo nombre contenga "jorge". Usá --trainer-email.`,
    );
  }
  if (trainers.length > 1) {
    throw new Error(
      `Hay ${trainers.length} candidatos: ${trainers.map((t) => `${t.name} <${t.email}>`).join(", ")}. Usá --trainer-email para desambiguar.`,
    );
  }

  const coach = trainers[0];
  if (coach.role !== "TRAINER" && coach.role !== "SUPER_ADMIN") {
    throw new Error(`${coach.email} tiene rol ${coach.role}; se esperaba TRAINER.`);
  }
  console.log(`Coach destino: ${coach.name} <${coach.email}> (${coach.id})\n`);

  // -- 2. Verificar TODO lo que las rutinas esperan encontrar ya existente ----
  // Cubre las dos vías por las que una rutina apunta al catálogo público:
  // `reuseExistingSlug` en las fichas y el mapa ALIASES. Se comprueba ANTES de
  // escribir nada para que el dry-run pruebe de verdad que el --apply va a
  // funcionar (si no, un alias inexistente reventaba después de haber creado
  // los ejercicios, dejando el trabajo a medias).
  const nuevos = ENTRIES.filter((e) => !e.reuseExistingSlug);
  const nuevosSlugs = new Set(nuevos.map((e) => e.slug));
  const routineSlugs = [
    ...new Set(
      ROUTINES.flatMap((r) => r.days.flatMap((d) => d.items.map((i) => slugFor(i.pdf)))),
    ),
  ];
  const mustExist = routineSlugs.filter((s) => !nuevosSlugs.has(s));

  const foundReused = await prisma.exercise.findMany({
    where: { slug: { in: mustExist } },
    select: { slug: true },
  });
  const missing = mustExist.filter((s) => !foundReused.some((f) => f.slug === s));
  if (missing.length > 0) {
    throw new Error(
      `Faltan en el catálogo ejercicios que las rutinas reusan: ${missing.join(", ")}. Corré el seed de ejercicios antes (pnpm seed).`,
    );
  }
  console.log(`Reusados del catálogo: ${mustExist.length} OK (${mustExist.join(", ")})`);

  // -- 3. Upsert de los ejercicios nuevos ------------------------------------
  console.log(`Ejercicios nuevos a cargar: ${nuevos.length}`);

  if (APPLY) {
    for (const e of nuevos) {
      const data = {
        nameEs: e.nameEs,
        nameEn: e.nameEn,
        instructionsEs: e.instructionsEs,
        primaryMuscle: e.primaryMuscle as Prisma.ExerciseCreateInput["primaryMuscle"],
        secondaryMuscles: e.secondaryMuscles as Prisma.ExerciseCreateInput["secondaryMuscles"],
        equipment: e.equipment as Prisma.ExerciseCreateInput["equipment"],
        difficulty: e.difficulty as Prisma.ExerciseCreateInput["difficulty"],
        category: e.category as Prisma.ExerciseCreateInput["category"],
        // Catálogo público de Blackline Fitness: cualquier coach que abra cuenta
        // los ve (la visibilidad es `isPublic = true OR createdById = usuario`).
        // createdById va en null igual que los ejercicios sembrados — son de la
        // plataforma, no de un coach. Cada coach puede ponerles SU propio video
        // con TrainerExerciseMedia sin mutar esta fila compartida.
        isPublic: true,
        createdById: null,
      };
      await prisma.exercise.upsert({
        where: { slug: e.slug },
        create: { slug: e.slug, ...data },
        update: data,
      });
    }
    console.log(`  -> ${nuevos.length} ejercicios upserted en el catálogo público.`);
  } else {
    for (const e of nuevos) {
      console.log(`  [dry] ${e.slug.padEnd(38)} ${e.primaryMuscle.padEnd(11)} ${e.nameEs}`);
    }
  }

  // -- 4. Resolver ids de todos los ejercicios de las rutinas -----------------
  const exRows = APPLY
    ? await prisma.exercise.findMany({
        where: { slug: { in: routineSlugs } },
        select: { id: true, slug: true },
      })
    : [];
  const idBySlug = new Map(exRows.map((r) => [r.slug, r.id]));

  if (APPLY) {
    const faltan = routineSlugs.filter((s) => !idBySlug.has(s));
    if (faltan.length > 0) throw new Error(`No se resolvieron ids para: ${faltan.join(", ")}`);
  }

  // -- 5. Crear / reemplazar cada rutina --------------------------------------
  for (const routine of ROUTINES) {
    const totalItems = routine.days.reduce((n, d) => n + d.items.length, 0);
    console.log(
      `\nRutina: "${routine.name}" (${routine.audience}) — ${routine.days.length} días, ${totalItems} ejercicios prescritos`,
    );
    for (const d of routine.days) {
      console.log(`  ${d.name} (${d.items.length})`);
      for (const i of d.items) {
        const reps = i.repsMin === i.repsMax ? `${i.repsMin}` : `${i.repsMin}-${i.repsMax}`;
        const sup = i.superset ? ` [bloque ${i.superset}]` : "";
        console.log(`    - ${i.sets}x${reps.padEnd(6)} ${slugFor(i.pdf).padEnd(38)}${sup}`);
      }
    }

    if (!APPLY) continue;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.routineTemplate.findFirst({
        where: { trainerId: coach.id, name: routine.name, deletedAt: null },
        select: { id: true },
      });

      let routineId: string;
      if (existing) {
        // Reemplazo idempotente: borra los días (cascade borra RoutineExercise).
        await tx.routineDay.deleteMany({ where: { routineId: existing.id } });
        await tx.routineTemplate.update({
          where: { id: existing.id },
          data: {
            description: routine.description,
            audience: routine.audience,
            splitDays: routine.days.length,
            goal: "HYPERTROPHY",
          },
        });
        routineId = existing.id;
        console.log(`  -> rutina existente actualizada (${routineId}).`);
      } else {
        const created = await tx.routineTemplate.create({
          data: {
            trainerId: coach.id,
            name: routine.name,
            description: routine.description,
            goal: "HYPERTROPHY",
            audience: routine.audience,
            splitDays: routine.days.length,
            durationWeeks: 8,
          },
          select: { id: true },
        });
        routineId = created.id;
        console.log(`  -> rutina creada (${routineId}).`);
      }

      // Los días se crean uno a uno porque necesitamos su id, pero todas las
      // prescripciones van en un solo createMany: con una fila por query la
      // transacción interactiva se pasaba del timeout (~45 inserts).
      const prescripciones: Prisma.RoutineExerciseCreateManyInput[] = [];

      for (const d of routine.days) {
        const day = await tx.routineDay.create({
          data: {
            routineId,
            dayIndex: d.index,
            name: d.name,
            description: d.description,
          },
          select: { id: true },
        });

        for (const [idx, item] of d.items.entries()) {
          const exerciseId = idBySlug.get(slugFor(item.pdf));
          if (!exerciseId) {
            throw new Error(`Sin id para el ejercicio "${item.pdf}" (${slugFor(item.pdf)}).`);
          }
          prescripciones.push({
            routineDayId: day.id,
            exerciseId,
            order: idx + 1,
            targetSets: item.sets,
            targetRepsMin: item.repsMin,
            targetRepsMax: item.repsMax,
            restSeconds: item.rest,
            supersetGroup: item.superset,
            notes: item.notes,
          });
        }
      }

      await tx.routineExercise.createMany({ data: prescripciones });
    }, { timeout: 30_000, maxWait: 15_000 });
  }

  if (!APPLY) {
    console.log("\nDRY-RUN: no se escribió nada. Re-corré con --apply para aplicar.\n");
    return;
  }

  console.log("\nListo. Revisá los ejercicios y las rutinas en la vista del coach.\n");
}

main()
  .catch((e) => {
    console.error("\nERROR:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
