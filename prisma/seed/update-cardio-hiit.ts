/**
 * One-off script to update "Cardio HIIT (En caminadora o elíptica)"
 * with secondary muscles and instructions.
 *
 * Run: npx tsx prisma/seed/update-cardio-hiit.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["warn", "error"] });

const EXERCISE_ID = "cmpe8xx0t001mqm3rmihdrp9g";

async function main() {
  const exercise = await prisma.exercise.findUnique({
    where: { id: EXERCISE_ID },
    select: { id: true, nameEs: true, primaryMuscle: true },
  });

  if (!exercise) {
    console.error(`Exercise ${EXERCISE_ID} not found.`);
    process.exit(1);
  }

  console.log(`Updating: ${exercise.nameEs}`);

  await prisma.exercise.update({
    where: { id: EXERCISE_ID },
    data: {
      secondaryMuscles: ["GLUTES", "HAMSTRINGS", "CALVES"],
      instructionsEs: [
        "Calentar 3-5 minutos a ritmo moderado en la caminadora o elíptica.",
        "Realizar un sprint o alta intensidad durante 30-60 segundos.",
        "Bajar a recuperación activa a ritmo suave por 60-90 segundos.",
        "Repetir los ciclos de alta y baja intensidad entre 8 y 12 veces.",
        "Enfriar 3-5 minutos a ritmo suave al finalizar.",
        "Mantener postura erguida, core activado y respiración controlada durante toda la sesión.",
      ].join("\n"),
    },
  });

  console.log("Done — secondary muscles: GLUTES, HAMSTRINGS, CALVES + instructions added.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
