/**
 * TEMPORARY — one-time seed endpoint for Exercise table.
 * DELETE THIS FILE after seeding is complete.
 *
 * POST /api/admin/seed-exercises
 * Authorization: Bearer vizion-seed-exercises-2026-05-17
 */

import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/server/db";

// ── Bearer token guard ───────────────────────────────────────────────────────

const SEED_TOKEN = "vizion-seed-exercises-2026-05-17";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Enum mappers (replicated from prisma/seed/exercises.ts) ──────────────────

type MuscleGroup =
  | "CHEST" | "BACK" | "SHOULDERS" | "BICEPS" | "TRICEPS" | "FOREARMS"
  | "ABS" | "OBLIQUES" | "GLUTES" | "QUADS" | "HAMSTRINGS" | "CALVES"
  | "NECK" | "FULL_BODY";

type ExerciseEquipment =
  | "BARBELL" | "DUMBBELL" | "KETTLEBELL" | "MACHINE" | "CABLE"
  | "BAND" | "BODYWEIGHT" | "OTHER";

type ExerciseDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

const MUSCLE_MAP: Record<string, MuscleGroup> = {
  chest: "CHEST", pectoral: "CHEST", pectorals: "CHEST",
  back: "BACK", "lower back": "BACK", "upper back": "BACK", lats: "BACK",
  shoulders: "SHOULDERS", deltoids: "SHOULDERS", "anterior deltoid": "SHOULDERS",
  "rear deltoids": "SHOULDERS", "medial deltoid": "SHOULDERS",
  traps: "SHOULDERS", trapezius: "SHOULDERS",
  biceps: "BICEPS", brachialis: "BICEPS",
  triceps: "TRICEPS",
  forearms: "FOREARMS", brachioradialis: "FOREARMS",
  core: "ABS", abs: "ABS", abdominals: "ABS", "hip flexors": "ABS",
  obliques: "OBLIQUES",
  glutes: "GLUTES",
  quadriceps: "QUADS", quads: "QUADS",
  hamstrings: "HAMSTRINGS",
  calves: "CALVES",
  neck: "NECK",
};

const EQUIPMENT_MAP: Record<string, ExerciseEquipment> = {
  "body only": "BODYWEIGHT", bodyweight: "BODYWEIGHT", bodyonly: "BODYWEIGHT", none: "BODYWEIGHT",
  barbell: "BARBELL",
  dumbbell: "DUMBBELL", dumbbells: "DUMBBELL",
  kettlebell: "KETTLEBELL",
  machine: "MACHINE",
  cable: "CABLE",
  band: "BAND", bands: "BAND", "resistance band": "BAND",
  other: "OTHER", "medicine ball": "OTHER",
};

function mapMuscle(raw: string): MuscleGroup | null {
  return MUSCLE_MAP[raw.toLowerCase().trim()] ?? null;
}
function mapEquipment(raw: string): ExerciseEquipment {
  return EQUIPMENT_MAP[raw.toLowerCase().trim()] ?? "OTHER";
}
function mapDifficulty(raw: string): ExerciseDifficulty {
  const n = raw.toLowerCase().trim();
  if (n === "beginner") return "BEGINNER";
  if (n === "advanced") return "ADVANCED";
  return "INTERMEDIATE";
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Auth check
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${SEED_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Load JSONs from disk (project root on Railway)
    const dataDir = join(process.cwd(), "prisma", "seed", "data");

    const rawExercises: RawExercise[] = JSON.parse(
      readFileSync(join(dataDir, "free-exercise-db.json"), "utf-8"),
    );
    const translations: TranslatedExercise[] = JSON.parse(
      readFileSync(join(dataDir, "exercises-es-cr.json"), "utf-8"),
    );

    const translationMap = new Map(translations.map((t) => [t.id, t]));

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const raw of rawExercises) {
      const tr = translationMap.get(raw.id);
      if (!tr) { skipped++; errors.push(`No translation: ${raw.id}`); continue; }

      const primaryMuscle = mapMuscle(raw.primaryMuscles[0] ?? "");
      if (!primaryMuscle) { skipped++; errors.push(`Unknown muscle: ${raw.primaryMuscles[0]} (${raw.id})`); continue; }

      const secondaryMuscles = raw.secondaryMuscles
        .map(mapMuscle)
        .filter((m): m is MuscleGroup => m !== null)
        .filter((m, i, arr) => arr.indexOf(m) === i);

      const equipment = mapEquipment(raw.equipment);
      const difficulty = mapDifficulty(raw.level);
      const firstImage = raw.images[0] ?? null;
      const instructionsEs = tr.instructionsEs.join("\n\n");
      const instructionsEn = raw.instructions.join("\n\n");

      try {
        await prisma.exercise.upsert({
          where: { slug: raw.id },
          create: {
            slug: raw.id,
            nameEs: tr.nameEs,
            nameEn: raw.name,
            instructionsEs,
            instructionsEn,
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
            nameEs: tr.nameEs,
            nameEn: raw.name,
            instructionsEs,
            instructionsEn,
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
        skipped++;
        errors.push(`Upsert failed ${raw.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({ ok: true, created, skipped, errors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
