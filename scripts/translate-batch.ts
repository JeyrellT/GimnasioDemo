/**
 * CLI runner — traducción batch de ejercicios con Gemini
 *
 * Uso: pnpm tsx scripts/translate-batch.ts
 *
 * Requiere la variable de entorno GEMINI_API_KEY configurada.
 * Lee de prisma/seed/data/free-exercise-db.json
 * Escribe en prisma/seed/data/exercises-es-cr.json (append-only para ids nuevos)
 *
 * Este script NO se corre en seed automático.
 * Solo se usa para regenerar/ampliar las traducciones manualmente.
 */

import { runTranslateBatch } from "../prisma/seed/translate-exercises";

async function main(): Promise<void> {
  try {
    await runTranslateBatch();
    process.exitCode = 0;
  } catch (err) {
    console.error(
      "[translate-batch] Error fatal:",
      err instanceof Error ? err.message : String(err),
    );
    process.exitCode = 1;
  }
}

main();
