/**
 * CLI runner — limpieza de URLs de medios locales (no remotas)
 *
 * Uso:
 *   pnpm exec tsx scripts/cleanup-non-drive-thumbnails.ts             # dry-run
 *   pnpm exec tsx scripts/cleanup-non-drive-thumbnails.ts --limit 5   # dry-run con N ejemplos
 *   pnpm exec tsx scripts/cleanup-non-drive-thumbnails.ts --apply     # aplica cambios
 *
 * Cuándo correrlo:
 *   Tras migrar de paths locales hardcodeados (ej. "/exercises/foo.jpg") a URLs
 *   remotas reales (Google Drive, YouTube, Vimeo, etc.), este script limpia los
 *   registros que quedaron apuntando a paths locales — es un one-shot,
 *   intencionalmente fuera del flujo de migrations Prisma.
 *
 * Qué hace:
 *   1. Recorre Exercise.thumbnailUrl, Exercise.gifUrl, Exercise.mediaUrl.
 *      Una URL es "limpiable" si:
 *        - es null o string vacío
 *        - empieza con "/" (path local absoluto)
 *        - empieza con "./" o "../" (path relativo)
 *        - NO empieza con "http://" ni "https://"
 *      Para campos nullable, las URLs limpiables se setean a null.
 *   2. Recorre TrainerExerciseMedia.mediaUrl. Como ese campo es NOT NULL,
 *      las filas con URL limpiable se BORRAN (hard delete) en lugar de actualizar.
 *
 * Modos:
 *   - Sin flags: dry-run. Cuenta filas afectadas y muestra ejemplos. No toca BD.
 *   - --apply:   prompt de confirmación + transacción Prisma (atómica).
 *   - --limit N: cantidad de ejemplos por categoría en dry-run (default 10).
 *
 * Notas:
 *   - Usa PrismaClient raw (sin la extensión de soft-delete de src/server/db.ts)
 *     para no ocultar filas con deletedAt; si una fila soft-deleted tiene un
 *     path local, también queremos limpiarlo.
 *   - YouTube / Vimeo / Drive / cualquier https:// se preserva.
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// -----------------------------------------------------------------------------
// CLI args
// -----------------------------------------------------------------------------

interface CliArgs {
  apply: boolean;
  limit: number;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { apply: false, limit: 10 };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--apply") {
      args.apply = true;
      continue;
    }
    if (token === "--limit") {
      const raw = argv[i + 1];
      if (!raw) {
        throw new Error("--limit requiere un valor numérico");
      }
      const n = Number.parseInt(raw, 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`--limit inválido: ${raw}`);
      }
      args.limit = n;
      i++;
      continue;
    }
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Flag desconocido: ${token}`);
  }
  return args;
}

function printHelp(): void {
  console.log(
    [
      "Uso: pnpm exec tsx scripts/cleanup-non-drive-thumbnails.ts [opciones]",
      "",
      "Opciones:",
      "  --apply        Aplica cambios (sin esto: dry-run).",
      "  --limit N      Ejemplos por categoría en dry-run (default 10).",
      "  --help, -h     Muestra esta ayuda.",
    ].join("\n"),
  );
}

// -----------------------------------------------------------------------------
// Reglas de limpieza
// -----------------------------------------------------------------------------

/**
 * Devuelve true si el valor debe ser nulificado (o la fila borrada, según contexto).
 * Una URL "preservable" es la que arranca con http:// o https://.
 * Todo lo demás (null, "", paths con "/", "./", "../", strings raros) es limpiable.
 */
function isCleanable(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  const trimmed = value.trim();
  if (trimmed === "") return true;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// Análisis (dry-run + base para --apply)
// -----------------------------------------------------------------------------

interface ExerciseFieldStats {
  total: number;
  toClean: number;
  examples: string[];
  idsToUpdate: string[];
}

interface ExerciseAnalysis {
  thumbnailUrl: ExerciseFieldStats;
  gifUrl: ExerciseFieldStats;
  mediaUrl: ExerciseFieldStats;
}

interface TrainerMediaAnalysis {
  total: number;
  toDelete: number;
  examples: string[];
  idsToDelete: string[];
}

interface FullAnalysis {
  exercises: ExerciseAnalysis;
  trainerMedia: TrainerMediaAnalysis;
  totalRowOperations: number;
}

function emptyStats(): ExerciseFieldStats {
  return { total: 0, toClean: 0, examples: [], idsToUpdate: [] };
}

async function analyze(
  prisma: PrismaClient,
  exampleLimit: number,
): Promise<FullAnalysis> {
  // Exercise: solo necesitamos los 4 campos relevantes.
  const exerciseRows = await prisma.exercise.findMany({
    select: {
      id: true,
      thumbnailUrl: true,
      gifUrl: true,
      mediaUrl: true,
    },
  });

  const exercises: ExerciseAnalysis = {
    thumbnailUrl: emptyStats(),
    gifUrl: emptyStats(),
    mediaUrl: emptyStats(),
  };

  for (const row of exerciseRows) {
    accumulate(exercises.thumbnailUrl, row.id, row.thumbnailUrl, exampleLimit);
    accumulate(exercises.gifUrl, row.id, row.gifUrl, exampleLimit);
    accumulate(exercises.mediaUrl, row.id, row.mediaUrl, exampleLimit);
  }

  // TrainerExerciseMedia: mediaUrl es NOT NULL → borramos la fila si es limpiable.
  const trainerMediaRows = await prisma.trainerExerciseMedia.findMany({
    select: { id: true, mediaUrl: true },
  });

  const trainerMedia: TrainerMediaAnalysis = {
    total: trainerMediaRows.length,
    toDelete: 0,
    examples: [],
    idsToDelete: [],
  };

  for (const row of trainerMediaRows) {
    if (isCleanable(row.mediaUrl)) {
      trainerMedia.toDelete += 1;
      trainerMedia.idsToDelete.push(row.id);
      if (trainerMedia.examples.length < exampleLimit) {
        trainerMedia.examples.push(formatValue(row.mediaUrl));
      }
    }
  }

  const totalRowOperations =
    exercises.thumbnailUrl.toClean +
    exercises.gifUrl.toClean +
    exercises.mediaUrl.toClean +
    trainerMedia.toDelete;

  return { exercises, trainerMedia, totalRowOperations };
}

function accumulate(
  stats: ExerciseFieldStats,
  rowId: string,
  value: string | null,
  exampleLimit: number,
): void {
  stats.total += 1;
  if (isCleanable(value)) {
    stats.toClean += 1;
    stats.idsToUpdate.push(rowId);
    if (stats.examples.length < exampleLimit) {
      stats.examples.push(formatValue(value));
    }
  }
}

function formatValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return "<null>";
  if (value === "") return '""';
  return value;
}

// -----------------------------------------------------------------------------
// Reporte
// -----------------------------------------------------------------------------

function report(analysis: FullAnalysis): void {
  const { exercises, trainerMedia } = analysis;

  printField("Exercise.thumbnailUrl", exercises.thumbnailUrl);
  printField("Exercise.gifUrl", exercises.gifUrl);
  printField("Exercise.mediaUrl", exercises.mediaUrl);

  console.log("");
  console.log(
    `TrainerExerciseMedia: ${trainerMedia.toDelete} filas a borrar / ${trainerMedia.total} total (mediaUrl no nullable)`,
  );
  if (trainerMedia.examples.length > 0) {
    console.log(`  Ejemplos: ${JSON.stringify(trainerMedia.examples)}`);
  }

  console.log("");
  console.log(`Total operaciones: ${analysis.totalRowOperations}`);
}

function printField(label: string, stats: ExerciseFieldStats): void {
  console.log(`${label}: ${stats.toClean} a limpiar / ${stats.total} total`);
  if (stats.examples.length > 0) {
    console.log(`  Ejemplos: ${JSON.stringify(stats.examples)}`);
  }
}

// -----------------------------------------------------------------------------
// Confirmación interactiva
// -----------------------------------------------------------------------------

async function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(prompt);
    return answer.trim().toLowerCase() === "yes";
  } finally {
    rl.close();
  }
}

// -----------------------------------------------------------------------------
// Aplicación (transacción atómica)
// -----------------------------------------------------------------------------

async function applyChanges(
  prisma: PrismaClient,
  analysis: FullAnalysis,
): Promise<void> {
  const { exercises, trainerMedia } = analysis;

  // Construimos las operaciones en orden estable.
  // updateMany por lotes de IDs evita generar miles de updates individuales.
  const ops: Prisma.PrismaPromise<Prisma.BatchPayload>[] = [];

  if (exercises.thumbnailUrl.idsToUpdate.length > 0) {
    ops.push(
      prisma.exercise.updateMany({
        where: { id: { in: exercises.thumbnailUrl.idsToUpdate } },
        data: { thumbnailUrl: null },
      }),
    );
  }
  if (exercises.gifUrl.idsToUpdate.length > 0) {
    ops.push(
      prisma.exercise.updateMany({
        where: { id: { in: exercises.gifUrl.idsToUpdate } },
        data: { gifUrl: null },
      }),
    );
  }
  if (exercises.mediaUrl.idsToUpdate.length > 0) {
    ops.push(
      prisma.exercise.updateMany({
        where: { id: { in: exercises.mediaUrl.idsToUpdate } },
        data: { mediaUrl: null },
      }),
    );
  }
  if (trainerMedia.idsToDelete.length > 0) {
    // Hard delete: el campo mediaUrl es NOT NULL, no podemos nulificar.
    ops.push(
      prisma.trainerExerciseMedia.deleteMany({
        where: { id: { in: trainerMedia.idsToDelete } },
      }),
    );
  }

  if (ops.length === 0) {
    console.log("Nada que aplicar.");
    return;
  }

  console.log(`Ejecutando ${ops.length} operación(es) en transacción…`);
  const results = await prisma.$transaction(ops);

  let totalAffected = 0;
  for (const r of results) {
    totalAffected += r.count;
  }
  console.log(`Transacción completada. Filas afectadas: ${totalAffected}.`);
}

// -----------------------------------------------------------------------------
// Entry point
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(
      `Error parseando args: ${err instanceof Error ? err.message : String(err)}`,
    );
    printHelp();
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL no está definida. Configurala antes de correr este script.",
    );
    process.exit(1);
  }

  const mode = args.apply ? "APPLY" : "DRY-RUN";
  console.log(`[cleanup-non-drive-thumbnails] modo=${mode} limit=${args.limit}`);
  console.log("");

  const prisma = new PrismaClient();

  try {
    const analysis = await analyze(prisma, args.limit);
    report(analysis);

    if (!args.apply) {
      console.log("");
      console.log("(dry-run — no se modificó la base. Usá --apply para ejecutar.)");
      return;
    }

    if (analysis.totalRowOperations === 0) {
      console.log("");
      console.log("No hay nada que cambiar. Saliendo.");
      return;
    }

    console.log("");
    const confirmed = await confirm(
      `Vas a modificar ${analysis.totalRowOperations} fila(s). Continuar? (escribí 'yes' para confirmar): `,
    );
    if (!confirmed) {
      console.log("Cancelado por el usuario.");
      return;
    }

    await applyChanges(prisma, analysis);
  } catch (err) {
    console.error(
      "[cleanup-non-drive-thumbnails] Error fatal:",
      err instanceof Error ? err.stack ?? err.message : String(err),
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
