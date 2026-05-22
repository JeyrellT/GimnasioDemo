// =============================================================================
// BLACKLINE FITNESS — Seed: Default video URLs per exercise
//
// Reads `prisma/seed/data/exercise-videos.json` and writes the `videoUrl` of
// each entry into `Exercise.mediaUrl` (matched by slug). Entries with `null`
// or empty URL are skipped. Slugs not found in the DB are logged as warnings.
//
// Idempotent — safe to re-run. The per-trainer override
// (`TrainerExerciseMedia`) is never touched by this script; it always wins
// over the catalog default at read time, so a coach who already set their own
// video will not lose it.
//
// Usage:
//   pnpm db:seed:videos
//
// Workflow expected:
//   1. Open prisma/seed/data/exercise-videos.json
//   2. Replace `null` with a YouTube / Vimeo / Google Drive URL for each
//      exercise you want a default for.
//   3. Run `pnpm db:seed:videos`.
//   4. New entries are picked up by `Exercise.mediaUrl` and reflected in the
//      biblioteca + reproductor.
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface VideoEntry {
  nameEs: string;
  videoUrl: string | null;
}

interface VideosConfig {
  $schema?: string;
  strength: Record<string, VideoEntry>;
  warmup: Record<string, VideoEntry>;
}

interface Plan {
  slug: string;
  url: string;
}

function loadConfig(): VideosConfig {
  const path = resolve(__dirname, "data", "exercise-videos.json");
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as VideosConfig;
  if (typeof parsed.strength !== "object" || typeof parsed.warmup !== "object") {
    throw new Error(
      "exercise-videos.json must have `strength` and `warmup` sections",
    );
  }
  return parsed;
}

function buildPlan(config: VideosConfig): Plan[] {
  const plans: Plan[] = [];
  for (const [slug, entry] of Object.entries(config.strength)) {
    if (entry?.videoUrl && entry.videoUrl.trim() !== "") {
      plans.push({ slug, url: entry.videoUrl.trim() });
    }
  }
  for (const [slug, entry] of Object.entries(config.warmup)) {
    if (entry?.videoUrl && entry.videoUrl.trim() !== "") {
      plans.push({ slug, url: entry.videoUrl.trim() });
    }
  }
  return plans;
}

async function seedVideos(prisma: PrismaClient): Promise<{
  applied: number;
  unchanged: number;
  missing: number;
  totalConfigured: number;
}> {
  const config = loadConfig();
  const plan = buildPlan(config);
  const totalEntries =
    Object.keys(config.strength).length + Object.keys(config.warmup).length;

  console.log("=== BLACKLINE FITNESS — exercise videos seed ===");
  console.log(
    `Cargados ${totalEntries} slugs en JSON, ${plan.length} con URL a aplicar.`,
  );

  if (plan.length === 0) {
    console.log("No hay videos para aplicar todavía. Edit el JSON y reintentá.");
    return { applied: 0, unchanged: 0, missing: 0, totalConfigured: 0 };
  }

  // Look up which slugs actually exist in the DB to give a clean warning list.
  const existing = await prisma.exercise.findMany({
    where: { slug: { in: plan.map((p) => p.slug) }, deletedAt: null },
    select: { id: true, slug: true, nameEs: true, mediaUrl: true },
  });
  const bySlug = new Map(existing.map((e) => [e.slug, e]));

  let applied = 0;
  let unchanged = 0;
  let missing = 0;

  for (const p of plan) {
    const row = bySlug.get(p.slug);
    if (!row) {
      console.warn(`  warn  slug no encontrado: "${p.slug}"`);
      missing++;
      continue;
    }
    if (row.mediaUrl === p.url) {
      unchanged++;
      continue;
    }
    await prisma.exercise.update({
      where: { id: row.id },
      data: { mediaUrl: p.url },
    });
    console.log(`  ok    ${p.slug.padEnd(40)} ← ${truncate(p.url, 60)}`);
    applied++;
  }

  console.log("\n=== Resultado ===");
  console.log(`  Aplicados   : ${applied}`);
  console.log(`  Sin cambios : ${unchanged}`);
  console.log(`  Slug faltante: ${missing}`);
  console.log(`  Total config: ${plan.length}`);

  return { applied, unchanged, missing, totalConfigured: plan.length };
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ log: ["warn", "error"] });
  try {
    await seedVideos(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error("[seed-videos] FAILED");
  console.error(err);
  process.exit(1);
});
