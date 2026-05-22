// =============================================================================
// BLACKLINE FITNESS — Reset trainer video overrides
//
// Soft-deletes TODOS los TrainerExerciseMedia activos (de todos los trainers).
// Después del reset, el catálogo (Exercise.mediaUrl, populado por el seed
// `db:seed:videos` desde prisma/seed/data/exercise-videos.json) toma efecto
// en todo el sistema.
//
// Para cuándo: cuando actualizaste el JSON con URLs nuevas y querés que TODOS
// los trainers vean esos URLs, sin importar lo que hubieran pegado ellos antes
// (overrides viejos).
//
// NOTA: el flujo normal NO necesita este script — desde el smart fallback en
// `getExercise` y `resolveEffectiveMediaUrl` del endpoint by-exerciseId, un
// override "roto" (URL no Drive/YouTube/Vimeo) ya cae automáticamente al
// catálogo. Este reset es solo para forzar uniformidad o reiniciar
// completamente las preferencias por-trainer.
//
// Soft-delete (no destructivo): los rows se marcan con `deletedAt = now()`,
// se pueden restaurar manualmente si fuera necesario.
//
// Usage:
//   pnpm db:reset-video-overrides
//
// Idempotente — re-correrlo sobre una DB sin overrides activos es no-op.
// =============================================================================

import { PrismaClient } from "@prisma/client";

async function main(): Promise<void> {
  const prisma = new PrismaClient({ log: ["warn", "error"] });
  try {
    console.log("=== BLACKLINE FITNESS — reset trainer video overrides ===");

    const active = await prisma.trainerExerciseMedia.findMany({
      where: { deletedAt: null },
      select: { id: true, trainerUserId: true, exerciseId: true, mediaUrl: true },
    });

    if (active.length === 0) {
      console.log("No hay overrides activos. Nada que hacer.");
      return;
    }

    console.log(`Encontrados ${active.length} overrides activos. Soft-deleting...`);

    const now = new Date();
    const result = await prisma.trainerExerciseMedia.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: now },
    });

    console.log(`\n=== Resultado ===`);
    console.log(`  Soft-deleted: ${result.count}`);
    console.log(
      "El próximo fetch de cada ejercicio devolverá el catálogo (Exercise.mediaUrl) " +
        "directamente.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error("[reset-video-overrides] FAILED");
  console.error(err);
  process.exit(1);
});
