#!/usr/bin/env node
/**
 * download-warmup-images.mjs
 *
 * Descarga imágenes demostrativas para los 30 calentamientos desde Free
 * Exercise DB (yuhonas/free-exercise-db en GitHub raw).
 *
 * El repo usa nombres TitleCase_Underscore (ej. "Mountain_Climbers"), no
 * lowercase-dashed. Por eso este script mantiene una tabla manual:
 *   spanish-slug  →  candidatos en TitleCase del upstream
 *
 * Para cada calentamiento prueba sus candidatos en orden, baja el primero
 * que exista y lo guarda como public/exercises/<spanish-slug>.jpg.
 * Eso hace que el fallback chain de ExerciseThumbnail (que prueba
 * `/exercises/<slug>.jpg` antes de SLUG_IMAGE_MAP) las muestre sin tocar
 * código.
 *
 * Uso:
 *   node scripts/download-warmup-images.mjs              # baja todas
 *   node scripts/download-warmup-images.mjs --dry-run    # solo lista
 *   node scripts/download-warmup-images.mjs --force      # sobreescribe existentes
 *   node scripts/download-warmup-images.mjs --slug=bird-dog
 */

import { writeFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_DIR = join(PROJECT_ROOT, "public", "exercises");

const RAW_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const SINGLE = args.find((a) => a.startsWith("--slug="))?.slice(7);

// ---------------------------------------------------------------------------
// Mapping: spanish slug → array de slugs upstream a probar en orden.
// Estos nombres fueron verificados contra la lista real del repo via la
// GitHub API (873 ejercicios totales). Para los que no existen en el repo
// usamos el ejercicio de fuerza más cercano como proxy razonable.
// ---------------------------------------------------------------------------

const WARMUP_CANDIDATES = {
  // ── CARDIO ────────────────────────────────────────────────────────────────
  // "Cardio en máquina" no existe genérico — usamos Stationary_Bike como proxy
  "cardio-en-maquina": ["Stationary_Bike_Run_V._2", "Rowing_Stationary"],
  "saltos-de-tijera": ["Rope_Jumping"], // mejor match en el repo
  "rodillas-altas": ["Hip_Lift_With_Band", "Rope_Jumping"], // no hay high-knees, usar proxy
  "talones-a-gluteos": ["Double_Leg_Butt_Kick", "Single_Leg_Butt_Kick"],
  "saltar-la-cuerda": ["Rope_Jumping"],
  "mountain-climbers": ["Mountain_Climbers"],

  // ── MOVILIDAD ─────────────────────────────────────────────────────────────
  "circulos-de-hombros": ["Shoulder_Circles"],
  "circulos-de-brazos": ["Arm_Circles"],
  "circulos-de-cadera": ["Standing_Hip_Circles", "Hip_Circles_prone"],
  "circulos-de-tobillos": ["Ankle_Circles"],
  "gato-camello": ["Cat_Stretch"],
  "worlds-greatest-stretch": ["Worlds_Greatest_Stretch"],
  "inchworm": ["Inchworm"],

  // ── ACTIVACION ────────────────────────────────────────────────────────────
  "sentadilla-con-peso-corporal": ["Bodyweight_Squat", "Chair_Squat"],
  "zancadas-caminando": ["Bodyweight_Walking_Lunge", "Dumbbell_Lunges"],
  "puente-de-gluteo": ["Single_Leg_Glute_Bridge", "Barbell_Glute_Bridge"],
  "bird-dog": ["Alternate_Leg_Diagonal_Bound", "Plank"], // no hay bird-dog real, usar plank como activación core
  "plancha-isometrica": ["Plank"],
  "push-ups-lentos": ["Pushups", "Push-Ups_With_Feet_On_An_Exercise_Ball"],
  "band-pull-aparts": ["Band_Pull_Apart"],
  "face-pulls-con-banda": ["Face_Pull"],
  "monster-walks-con-banda": ["Monster_Walk"],

  // ── ESTIRAMIENTOS ─────────────────────────────────────────────────────────
  "estiramiento-cuadriceps-de-pie": ["Standing_Elevated_Quad_Stretch", "Quad_Stretch"],
  "estiramiento-isquiotibiales-sentado": ["Seated_Floor_Hamstring_Stretch", "Hamstring_Stretch"],
  "estiramiento-gemelos-en-pared": ["Calf_Stretch_Elbows_Against_Wall", "Calf_Stretch_Hands_Against_Wall"],
  "figura-4-supino": ["On-Your-Back_Quad_Stretch", "Hamstring_Stretch"], // figure-4 no existe nombrado
  "estiramiento-flexor-de-cadera": ["Kneeling_Hip_Flexor", "Intermediate_Hip_Flexor_and_Quad_Stretch"],
  "estiramiento-pecho-en-puerta": ["Dynamic_Chest_Stretch", "Chest_Stretch_on_Stability_Ball"],
  "postura-del-nino": ["Childs_Pose"],
  "estiramiento-triceps-sobre-cabeza": ["Triceps_Stretch", "Behind_Head_Chest_Stretch"],
};

const FRAMES_TO_TRY = ["0", "1"]; // algunos ejercicios solo tienen 1.jpg

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function urlExists(url) {
  try {
    // jsdelivr y raw.githubusercontent bloquean HEAD; usar GET con Range
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-100" },
      redirect: "follow",
    });
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}

async function downloadBinary(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error(`Archivo muy chico (${buf.length} bytes) — probable placeholder`);
  return buf;
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Resolver: prueba cada candidato y frame hasta encontrar uno que existe
// ---------------------------------------------------------------------------

async function resolveCandidate(candidates) {
  for (const cand of candidates) {
    for (const frame of FRAMES_TO_TRY) {
      const url = `${RAW_BASE}/${cand}/${frame}.jpg`;
      if (await urlExists(url)) {
        return { url, candidate: cand, frame };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n📦 Free Exercise DB → warmup image downloader\n`);
  console.log(`Source:     ${RAW_BASE}`);
  console.log(`Output dir: ${OUTPUT_DIR}`);
  console.log(`Mode:       ${DRY_RUN ? "DRY RUN" : "LIVE"}${FORCE ? " · FORCE" : ""}\n`);

  if (!DRY_RUN) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const entries = SINGLE
    ? [[SINGLE, WARMUP_CANDIDATES[SINGLE]]].filter(([, v]) => v)
    : Object.entries(WARMUP_CANDIDATES);

  if (SINGLE && entries.length === 0) {
    console.error(`❌ Slug "${SINGLE}" no está en el mapping.\n`);
    process.exit(1);
  }

  const found = [];
  const notFound = [];
  const skipped = [];
  const errors = [];

  for (const [spanishSlug, candidates] of entries) {
    const outFile = join(OUTPUT_DIR, `${spanishSlug}.jpg`);

    if (!FORCE && (await fileExists(outFile))) {
      console.log(`⏭️  ${spanishSlug.padEnd(40)} ya existe — skip`);
      skipped.push(spanishSlug);
      continue;
    }

    process.stdout.write(`🔍 ${spanishSlug.padEnd(40)} `);
    const match = await resolveCandidate(candidates);

    if (!match) {
      console.log(`❌ NO ENCONTRADO`);
      notFound.push({ slug: spanishSlug, candidates });
      continue;
    }

    if (DRY_RUN) {
      console.log(`✅ ${match.candidate}/${match.frame}.jpg`);
      found.push({ slug: spanishSlug, source: match.candidate });
      continue;
    }

    try {
      const buf = await downloadBinary(match.url);
      await writeFile(outFile, buf);
      const kb = (buf.length / 1024).toFixed(1);
      console.log(`✅ ${match.candidate}/${match.frame}.jpg (${kb} KB)`);
      found.push({ slug: spanishSlug, source: match.candidate, bytes: buf.length });
    } catch (err) {
      console.log(`💥 ERROR: ${err.message}`);
      errors.push({ slug: spanishSlug, error: err.message });
    }
  }

  // ── Reporte final ────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(70));
  console.log(`📊 REPORTE`);
  console.log("═".repeat(70));
  console.log(`✅ Encontradas:               ${found.length}`);
  console.log(`⏭️  Saltadas (ya existían):   ${skipped.length}`);
  console.log(`❌ No encontradas:            ${notFound.length}`);
  console.log(`💥 Errores:                   ${errors.length}`);

  if (notFound.length > 0) {
    console.log(`\n⚠️  Sin match en Free Exercise DB:`);
    for (const { slug, candidates } of notFound) {
      console.log(`   - ${slug}  (intentados: ${candidates.join(", ")})`);
    }
    console.log(`\n   Buscalas manualmente en Pexels / Unsplash y guardalas como`);
    console.log(`   public/exercises/<slug>.jpg`);
  }

  if (errors.length > 0) {
    console.log(`\n💥 Errores:`);
    for (const { slug, error } of errors) {
      console.log(`   - ${slug}: ${error}`);
    }
  }

  console.log("\n✨ Listo. Las imágenes están en public/exercises/.");
  console.log("   El ExerciseThumbnail las recoge automáticamente sin más cambios.\n");
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
