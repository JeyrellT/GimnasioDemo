/**
 * CLI runner — seed de ejercicios
 *
 * Uso: pnpm tsx scripts/seed-exercises.ts
 *
 * Instancia el PrismaClient, ejecuta seedExercises y desconecta.
 * Diseñado para correrse manualmente o en CI/CD post-migración.
 */

import { PrismaClient } from "@prisma/client";
import { seedExercises } from "../prisma/seed/exercises";

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    log: [{ level: "warn", emit: "stdout" }, { level: "error", emit: "stdout" }],
  });

  try {
    const result = await seedExercises(prisma);
    console.log(
      `[seed-exercises] Resultado: ${result.created} creados, ${result.skipped} saltados.`,
    );
    process.exitCode = 0;
  } catch (err) {
    console.error(
      "[seed-exercises] Error fatal:",
      err instanceof Error ? err.message : String(err),
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
