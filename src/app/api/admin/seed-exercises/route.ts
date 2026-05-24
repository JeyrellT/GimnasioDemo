/**
 * Temporary API route to seed custom exercise data.
 * POST /api/admin/seed-exercises
 * Protected by a shared secret header.
 * DELETE THIS AFTER RUNNING.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import type { MuscleGroup } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SEED_SECRET = process.env.NEXTAUTH_SECRET ?? "";

interface ExercisePatch {
  namePattern: string;
  primaryMuscle?: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  instructionsEs: string;
}

const PATCHES: ExercisePatch[] = [
  {
    namePattern: "Cardio HIIT",
    secondaryMuscles: ["GLUTES", "HAMSTRINGS", "CALVES"],
    instructionsEs: [
      "Calentar 3-5 minutos a ritmo moderado en la caminadora o elíptica.",
      "Realizar un sprint o alta intensidad durante 30-60 segundos.",
      "Bajar a recuperación activa a ritmo suave por 60-90 segundos.",
      "Repetir los ciclos de alta y baja intensidad entre 8 y 12 veces.",
      "Enfriar 3-5 minutos a ritmo suave al finalizar.",
      "Mantener postura erguida, core activado y respiración controlada.",
    ].join("\n"),
  },
  {
    namePattern: "Desplantes",
    secondaryMuscles: ["GLUTES", "HAMSTRINGS", "CALVES"],
    instructionsEs: [
      "De pie con los pies juntos y el torso erguido.",
      "Da un paso largo hacia adelante, flexionando ambas rodillas a 90°.",
      "La rodilla trasera debe casi tocar el suelo sin apoyarse.",
      "Empuja con el pie delantero y da el siguiente paso con la otra pierna.",
      "Alterna las piernas mientras avanzas en línea recta.",
      "Mantén el core activado y la mirada al frente.",
    ].join("\n"),
  },
  {
    namePattern: "Elevaciones de piernas",
    primaryMuscle: "ABS",
    secondaryMuscles: ["OBLIQUES"],
    instructionsEs: [
      "Acuéstate boca arriba sobre una banca plana o colchoneta.",
      "Coloca las manos a los lados o debajo de los glúteos para soporte.",
      "Eleva ambas piernas juntas sin doblar las rodillas hasta 90°.",
      "Baja las piernas lentamente sin tocar el suelo.",
      "Repite de forma controlada con la espalda baja pegada a la superficie.",
      "Exhala al subir las piernas e inhala al bajarlas.",
    ].join("\n"),
  },
  {
    namePattern: "Extensión de piernas",
    secondaryMuscles: [],
    instructionsEs: [
      "Siéntate en la máquina con la espalda apoyada y los tobillos bajo el rodillo.",
      "Ajusta el respaldo para que las rodillas queden alineadas con el eje.",
      "Extiende las piernas apretando los cuádriceps hasta quedar rectas.",
      "Mantén la contracción un segundo en la parte superior.",
      "Baja el peso de forma controlada sin dejar caer.",
      "El movimiento debe ser lento y controlado, sin usar impulso.",
    ].join("\n"),
  },
  {
    namePattern: "Giros rusos",
    primaryMuscle: "OBLIQUES",
    secondaryMuscles: ["ABS"],
    instructionsEs: [
      "Siéntate con las rodillas flexionadas y los pies ligeramente elevados.",
      "Sostén el disco liviano con ambas manos frente al pecho.",
      "Inclina el torso hacia atrás unos 45° con la espalda recta.",
      "Gira el torso hacia un lado llevando el disco junto al cuerpo.",
      "Regresa al centro y gira hacia el otro lado de forma controlada.",
      "Mantén el core contraído y la mirada siguiendo al disco.",
    ].join("\n"),
  },
  {
    namePattern: "Plancha Lateral",
    secondaryMuscles: ["OBLIQUES", "GLUTES", "SHOULDERS"],
    instructionsEs: [
      "Acuéstate de lado apoyando el antebrazo con el codo bajo el hombro.",
      "Eleva las caderas formando una línea recta de cabeza a pies.",
      "Mantén el core activado y las caderas alineadas sin dejarlas caer.",
      "Sostén la posición durante el tiempo indicado.",
      "Cambia de lado y repite con el otro brazo.",
      "Evita rotar el torso; el cuerpo debe mantenerse en un solo plano.",
    ].join("\n"),
  },
  {
    namePattern: "Plancha tradicional",
    secondaryMuscles: ["OBLIQUES", "SHOULDERS", "GLUTES"],
    instructionsEs: [
      "Colócate boca abajo apoyando los antebrazos y las puntas de los pies.",
      "Eleva el cuerpo formando una línea recta de cabeza a talones.",
      "Mantén el core contraído y los glúteos apretados.",
      "No dejes caer las caderas ni levantes los glúteos.",
      "Sostén la posición respirando de forma constante.",
      "Mantén la mirada hacia el suelo para alinear la columna cervical.",
    ].join("\n"),
  },
  {
    namePattern: "Press de hombro con mancuernas",
    primaryMuscle: "SHOULDERS",
    secondaryMuscles: ["TRICEPS"],
    instructionsEs: [
      "Siéntate en un banco con respaldo o de pie con los pies al ancho de hombros.",
      "Sostén una mancuerna en cada mano a la altura de los hombros, palmas al frente.",
      "Empuja las mancuernas hacia arriba hasta extender los brazos sin bloquear codos.",
      "Baja de forma controlada hasta la posición inicial.",
      "Mantén el core activado y la espalda recta durante todo el movimiento.",
      "Exhala al subir e inhala al bajar.",
    ].join("\n"),
  },
];

export async function POST(req: Request) {
  // Simple auth check
  const authHeader = req.headers.get("x-seed-secret");
  if (!authHeader || authHeader !== SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { name: string; status: string }[] = [];

  for (const patch of PATCHES) {
    const exercise = await prisma.exercise.findFirst({
      where: {
        nameEs: { contains: patch.namePattern },
        isPublic: false,
        deletedAt: null,
      },
      select: { id: true, nameEs: true, primaryMuscle: true },
    });

    if (!exercise) {
      results.push({ name: patch.namePattern, status: "not_found" });
      continue;
    }

    const data: Record<string, unknown> = {
      secondaryMuscles: patch.secondaryMuscles,
      instructionsEs: patch.instructionsEs,
    };
    if (patch.primaryMuscle) {
      data.primaryMuscle = patch.primaryMuscle;
    }

    await prisma.exercise.update({ where: { id: exercise.id }, data });
    results.push({
      name: exercise.nameEs!,
      status: `updated → ${patch.primaryMuscle ?? exercise.primaryMuscle} + [${patch.secondaryMuscles.join(",")}]`,
    });
  }

  return NextResponse.json({ ok: true, results });
}
