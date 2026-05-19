/**
 * Seed de ejercicios — Blackline Fitness
 *
 * Carga el stub de Free Exercise DB (prisma/seed/data/free-exercise-db.json)
 * junto con sus traducciones ES-CR (prisma/seed/data/exercises-es-cr.json)
 * y hace upsert en la tabla Exercise por slug.
 *
 * Ejecutar via: scripts/seed-exercises.ts
 * No confundirse con el seed principal (prisma/seed/index.ts) que lo llama
 * desde la migración inicial — este archivo es el módulo reutilizable.
 */

import { PrismaClient, ExerciseEquipment, ExerciseDifficulty, MuscleGroup } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Tipos que reflejan la shape del JSON de Free Exercise DB
// ---------------------------------------------------------------------------

interface RawExercise {
  id: string;
  name: string;
  force: string;
  level: string;
  mechanic: string;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

interface TranslatedExercise {
  id: string;
  nameEs: string;
  instructionsEs: string[];
}

interface SeedResult {
  created: number;
  skipped: number;
}

// ---------------------------------------------------------------------------
// Mapeos de valores del JSON al enum de Prisma
// ---------------------------------------------------------------------------

/**
 * Mapea el string de músculo del JSON (Free Exercise DB) al enum MuscleGroup.
 * Si no hay match retorna null — el caller decide si skip o usa fallback.
 */
function mapMuscleGroup(raw: string): MuscleGroup | null {
  const normalized = raw.toLowerCase().trim();

  // Valores válidos: CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, FOREARMS,
  // ABS, OBLIQUES, GLUTES, QUADS, HAMSTRINGS, CALVES, NECK, FULL_BODY
  // Sincronizado con prisma/schema.prisma → enum MuscleGroup.
  const MAP: Record<string, MuscleGroup> = {
    // Pecho
    chest: "CHEST",
    pectoral: "CHEST",
    pectorals: "CHEST",
    // Espalda (lats/traps se mapean a BACK o SHOULDERS según anatomía)
    back: "BACK",
    "lower back": "BACK",
    "upper back": "BACK",
    lats: "BACK",
    // Hombros / trapecios
    shoulders: "SHOULDERS",
    deltoids: "SHOULDERS",
    "anterior deltoid": "SHOULDERS",
    "rear deltoids": "SHOULDERS",
    "medial deltoid": "SHOULDERS",
    traps: "SHOULDERS",
    trapezius: "SHOULDERS",
    // Bíceps
    biceps: "BICEPS",
    brachialis: "BICEPS",
    // Tríceps
    triceps: "TRICEPS",
    // Antebrazos
    forearms: "FOREARMS",
    brachioradialis: "FOREARMS",
    // Abdominales / core — el schema usa ABS (no CORE ni LATS)
    core: "ABS",
    abs: "ABS",
    abdominals: "ABS",
    "hip flexors": "ABS",
    // Oblicuos
    obliques: "OBLIQUES",
    // Glúteos
    glutes: "GLUTES",
    // Cuádriceps
    quadriceps: "QUADS",
    quads: "QUADS",
    // Femorales
    hamstrings: "HAMSTRINGS",
    // Pantorrillas
    calves: "CALVES",
    // Cuello
    neck: "NECK",
  } as const;

  return MAP[normalized] ?? null;
}

/**
 * Mapea el string de equipamiento al enum ExerciseEquipment.
 * Fallback: OTHER.
 */
function mapEquipment(raw: string): ExerciseEquipment {
  const normalized = raw.toLowerCase().trim();

  const MAP: Record<string, ExerciseEquipment> = {
    "body only": "BODYWEIGHT",
    bodyweight: "BODYWEIGHT",
    bodyonly: "BODYWEIGHT",
    none: "BODYWEIGHT",
    barbell: "BARBELL",
    dumbbell: "DUMBBELL",
    dumbbells: "DUMBBELL",
    kettlebell: "KETTLEBELL",
    machine: "MACHINE",
    cable: "CABLE",
    band: "BAND",
    bands: "BAND",
    "resistance band": "BAND",
    other: "OTHER",
    "medicine ball": "OTHER",
  } as const;

  return MAP[normalized] ?? "OTHER";
}

/**
 * Mapea el nivel de dificultad al enum ExerciseDifficulty.
 * Fallback: INTERMEDIATE.
 */
function mapDifficulty(raw: string): ExerciseDifficulty {
  const normalized = raw.toLowerCase().trim();

  if (normalized === "beginner") return "BEGINNER";
  if (normalized === "advanced") return "ADVANCED";
  return "INTERMEDIATE";
}

// ---------------------------------------------------------------------------
// Función principal de seed
// ---------------------------------------------------------------------------

/**
 * Carga ambos JSONs y hace upsert de cada ejercicio en la tabla Exercise.
 * Retorna el conteo de ejercicios creados y saltados.
 *
 * "Saltado" significa: el ejercicio del JSON en inglés no tenía una entrada
 * correspondiente en el JSON de traducciones ES-CR. En ese caso se loggea
 * un warning y se omite el upsert.
 */
export async function seedExercises(
  prisma: PrismaClient,
): Promise<SeedResult> {
  const dataDir = join(__dirname, "data");

  // Cargar JSONs desde disco
  const rawExercises: RawExercise[] = JSON.parse(
    readFileSync(join(dataDir, "free-exercise-db.json"), "utf-8"),
  );

  const translatedExercises: TranslatedExercise[] = JSON.parse(
    readFileSync(join(dataDir, "exercises-es-cr.json"), "utf-8"),
  );

  // Construir mapa de traducciones por id para lookup O(1)
  const translationMap = new Map<string, TranslatedExercise>(
    translatedExercises.map((t) => [t.id, t]),
  );

  let created = 0;
  let skipped = 0;

  for (const raw of rawExercises) {
    const translation = translationMap.get(raw.id);

    if (!translation) {
      // El ejercicio no tiene traducción — no podemos completar el modelo
      console.warn(
        `[seed-exercises] WARNING: Sin traducción para "${raw.id}" — saltando.`,
      );
      skipped++;
      continue;
    }

    // Músculo primario: toma el primero del array
    const primaryMuscleRaw = raw.primaryMuscles[0] ?? "";
    const primaryMuscle = mapMuscleGroup(primaryMuscleRaw);

    if (!primaryMuscle) {
      console.warn(
        `[seed-exercises] WARNING: Músculo primario desconocido "${primaryMuscleRaw}" en "${raw.id}" — saltando.`,
      );
      skipped++;
      continue;
    }

    // Músculos secundarios: filtrar nulos silenciosamente (son opcionales)
    const secondaryMuscles: MuscleGroup[] = raw.secondaryMuscles
      .map(mapMuscleGroup)
      .filter((m): m is MuscleGroup => m !== null)
      // Deduplicar — el mismo músculo puede aparecer por distintos sinónimos
      .filter((m, i, arr) => arr.indexOf(m) === i);

    const equipment = mapEquipment(raw.equipment);
    const difficulty = mapDifficulty(raw.level);

    // URLs de media: si hay una imagen la usamos para gif y thumbnail
    // Prioridad: imagen local en public/exercises/ (.jpg primero, luego .png), luego la del JSON
    const publicDir = join(__dirname, "../../public");
    let firstImage: string | null = null;
    for (const ext of [".jpg", ".png"]) {
      const candidate = `/exercises/${raw.id}${ext}`;
      if (existsSync(join(publicDir, candidate))) {
        firstImage = candidate;
        break;
      }
    }
    if (!firstImage) firstImage = raw.images[0] ?? null;

    // instructionsEs: las instrucciones traducidas unidas por doble salto
    // para almacenar en el campo Text de Prisma. El frontend las parte por \n\n.
    const instructionsEsText = translation.instructionsEs.join("\n\n");

    // instructionsEn: instrucciones originales como texto plano
    const instructionsEnText = raw.instructions.join("\n\n");

    try {
      await prisma.exercise.upsert({
        where: { slug: raw.id },
        create: {
          slug: raw.id,
          nameEs: translation.nameEs,
          nameEn: raw.name,
          instructionsEs: instructionsEsText,
          instructionsEn: instructionsEnText,
          primaryMuscle,
          secondaryMuscles,
          equipment,
          difficulty,
          mediaUrl: firstImage,
          gifUrl: firstImage,
          thumbnailUrl: firstImage,
          isPublic: true,
          createdById: null,
        },
        update: {
          // En re-runs actualizamos traducciones y metadatos, no el slug
          nameEs: translation.nameEs,
          nameEn: raw.name,
          instructionsEs: instructionsEsText,
          instructionsEn: instructionsEnText,
          primaryMuscle,
          secondaryMuscles,
          equipment,
          difficulty,
          mediaUrl: firstImage,
          gifUrl: firstImage,
          thumbnailUrl: firstImage,
        },
      });

      created++;
    } catch (err) {
      console.error(
        `[seed-exercises] ERROR al hacer upsert de "${raw.id}":`,
        err instanceof Error ? err.message : String(err),
      );
      skipped++;
    }
  }

  console.log(
    `[seed-exercises] Completado: ${created} ejercicios creados/actualizados, ${skipped} saltados.`,
  );

  return { created, skipped };
}
