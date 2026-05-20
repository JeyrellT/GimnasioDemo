// =============================================================================
// BLACKLINE FITNESS — Seed entry point
// Owner: database-architect.
//
// Idempotente. Se invoca con `pnpm db:seed`. Pasos:
//   1) Subscription plans (SOLO / PRO / STUDIO) — siempre.
//   2) Free Exercise DB — delegado a `seedExercises()` que implementa
//      python-data-engineer en `./exercises.ts`.
//   3) Datos demo (1 trainer + 2 clients + 1 rutina + 1 sesión) si
//      `process.env.SEED_DEMO === "true"`.
//
// Logging: console.log/console.error directo. Este script es CLI (tsx) y NO
// tiene contexto de request, por eso no usa `pino` ni `logger`.
// =============================================================================

import { PrismaClient, SubscriptionTier, UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { hashPassword } from "../../src/lib/crypto/passwords";
// NOTE: implementación a cargo de python-data-engineer.
// Firma actual: `(prisma: PrismaClient) => Promise<{ created: number; skipped: number }>`.
import { seedExercises } from "./exercises";
import { seedKnowledge } from "./knowledge";

// Demo password used by all 4 demo accounts (trainer, 2 clients, admin).
// Override with DEMO_PASSWORD env var if needed.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "blackline2026";

const prisma = new PrismaClient({ log: ["warn", "error"] });

// -----------------------------------------------------------------------------
// 1) SUBSCRIPTION PLANS
// -----------------------------------------------------------------------------
// Pricing fijado en PRODUCT_DECISIONS.md sección 6.
// IVA 13% incluido (regla de marketing). priceCRC representa el monto cobrado
// al entrenador, sin desglose impositivo en la tabla.
// -----------------------------------------------------------------------------

interface PlanSeed {
  tier: SubscriptionTier;
  name: string;
  priceCRC: string;
  maxClients: number;
  features: string[];
}

const SUBSCRIPTION_PLANS: PlanSeed[] = [
  {
    tier: SubscriptionTier.SOLO,
    name: "Blackline Solo",
    priceCRC: "8900.00",
    maxClients: 5,
    features: [
      "biblioteca_ejercicios",
      "rutinas",
      "ejecucion_sesion",
      "metricas_basicas",
      "factura_basica",
    ],
  },
  {
    tier: SubscriptionTier.PRO,
    name: "Blackline Pro",
    priceCRC: "22900.00",
    maxClients: 25,
    features: [
      "biblioteca_ejercicios",
      "rutinas",
      "ejecucion_sesion",
      "metricas_basicas",
      "factura_basica",
      "analytics_avanzado",
      "exports_pdf",
      "soporte_prioritario",
    ],
  },
  {
    tier: SubscriptionTier.STUDIO,
    name: "Blackline Studio",
    priceCRC: "44900.00",
    maxClients: 60,
    features: [
      "biblioteca_ejercicios",
      "rutinas",
      "ejecucion_sesion",
      "metricas_basicas",
      "factura_basica",
      "analytics_avanzado",
      "exports_pdf",
      "soporte_prioritario",
      "co_administracion",
      "branding_personalizado",
      "ia_asistente_v1_1",
    ],
  },
];

async function seedSubscriptionPlans(): Promise<void> {
  console.log("[seed] Subscription plans...");
  for (const plan of SUBSCRIPTION_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { tier: plan.tier },
      create: {
        tier: plan.tier,
        name: plan.name,
        priceCRC: new Prisma.Decimal(plan.priceCRC),
        maxClients: plan.maxClients,
        features: plan.features,
      },
      update: {
        name: plan.name,
        priceCRC: new Prisma.Decimal(plan.priceCRC),
        maxClients: plan.maxClients,
        features: plan.features,
      },
    });
    console.log(`  ok  ${plan.tier.padEnd(7)} ${plan.name}  ₡${plan.priceCRC}`);
  }
}

// -----------------------------------------------------------------------------
// 3) DEMO DATA (opcional)
// -----------------------------------------------------------------------------
// Crea: 1 entrenador, 2 clientes, link trainer-client ACTIVE para ambos,
// 1 RoutineTemplate con 3 días + 4 ejercicios cada uno (si hay ejercicios
// seedeados), 1 AssignedRoutine al primer cliente y 1 WorkoutSession completed.
//
// Diseñado para que un dev pueda levantar la app y ver UI con datos sin
// recorrer todo el onboarding.
// -----------------------------------------------------------------------------

const DEMO_TRAINER_EMAIL = "demo.trainer@blacklinefitness.app";
const DEMO_CLIENT_EMAILS = ["demo.cliente1@blacklinefitness.app", "demo.cliente2@blacklinefitness.app"];
const DEMO_ADMIN_EMAIL = "demo.admin@blacklinefitness.app";
const DEMO_CLIENT_EMAIL_3 = "demo.cliente3@blacklinefitness.app";
const DEMO_CLIENT_EMAIL_4 = "demo.cliente4@blacklinefitness.app";

async function seedDemoData(): Promise<void> {
  console.log("[seed] Demo data (SEED_DEMO=true)...");

  // Hash the demo password ONCE and reuse for all 4 demo accounts.
  // Hashing is intentionally slow (scrypt ~80ms per call), so caching matters.
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // -- Admin -----------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    create: {
      email: DEMO_ADMIN_EMAIL,
      name: "Admin Demo",
      role: UserRole.ADMIN,
      emailVerified: new Date(),
      pushOptIn: false,
      passwordHash,
    },
    update: { passwordHash },
  });
  console.log(`  ok  admin      ${admin.email}`);

  // -- Trainer ---------------------------------------------------------------
  const trainer = await prisma.user.upsert({
    where: { email: DEMO_TRAINER_EMAIL },
    create: {
      email: DEMO_TRAINER_EMAIL,
      name: "Coach Demo",
      role: UserRole.TRAINER,
      emailVerified: new Date(),
      pushOptIn: false,
      passwordHash,
      trainerProfile: {
        create: {
          tradeName: "Coach Demo Blackline",
          specialty: "Hipertrofia y fuerza",
          bio: "Cuenta demo para desarrollo local. No es un entrenador real.",
          defaultMonthlyPriceCRC: new Prisma.Decimal("20000.00"),
        },
      },
    },
    update: { passwordHash },
    include: { trainerProfile: true },
  });
  console.log(`  ok  trainer    ${trainer.email}`);

  // -- Clients ---------------------------------------------------------------
  // Cada cliente tiene perfil distinto (objetivos, antropometría, género)
  // para que la app demo se sienta variada y no espejada.
  interface DemoClientSeed {
    email: string;
    name: string;
    gender: "MALE" | "FEMALE";
    dateOfBirth: Date;
    heightCm: string;
    weightKg: string;
    goal: "MUSCLE_GAIN" | "FAT_LOSS";
  }

  const DEMO_CLIENTS: DemoClientSeed[] = [
    {
      email: "demo.cliente1@blacklinefitness.app",
      name: "Ana Demo",
      gender: "FEMALE",
      dateOfBirth: new Date("1997-08-22"),
      heightCm: "165.0",
      weightKg: "71.50",
      goal: "MUSCLE_GAIN",
    },
    {
      email: "demo.cliente2@blacklinefitness.app",
      name: "Bruno Demo",
      gender: "MALE",
      dateOfBirth: new Date("1992-03-15"),
      heightCm: "182.0",
      weightKg: "84.00",
      goal: "FAT_LOSS",
    },
  ];

  const clients = [];
  for (const seed of DEMO_CLIENTS) {
    const c = await prisma.user.upsert({
      where: { email: seed.email },
      create: {
        email: seed.email,
        name: seed.name,
        role: UserRole.CLIENT,
        gender: seed.gender,
        dateOfBirth: seed.dateOfBirth,
        emailVerified: new Date(),
        pushOptIn: false,
        passwordHash,
        clientProfile: {
          create: {
            parqStatus: "GREEN",
            goal: seed.goal,
            locationCity: "San José",
            weightKg: new Prisma.Decimal(seed.weightKg),
            heightCm: new Prisma.Decimal(seed.heightCm),
          },
        },
      },
      update: { passwordHash },
    });
    clients.push(c);
    console.log(`  ok  client     ${c.email} (${seed.goal})`);
  }

  // -- TrainerClient links ---------------------------------------------------
  for (const client of clients) {
    await prisma.trainerClient.upsert({
      where: {
        trainerId_clientId: { trainerId: trainer.id, clientId: client.id },
      },
      create: {
        trainerId: trainer.id,
        clientId: client.id,
        status: "ACTIVE",
        monthlyPriceCRC: new Prisma.Decimal("20000.00"),
      },
      update: {},
    });
  }
  console.log(`  ok  links      ${clients.length} active`);

  // -- RoutineTemplate (Push/Pull/Legs simple) -------------------------------
  // Sólo si hay ejercicios seedeados; si no, salimos con warning.
  const exerciseCount = await prisma.exercise.count();
  if (exerciseCount === 0) {
    console.warn(
      "  warn  no hay ejercicios seedeados — saltando rutina demo",
    );
    return;
  }

  // First 12 exercises → PPL template.
  // Next batch (skip:12, take:32) → Upper/Lower + Full Body templates.
  const sampleExercises = await prisma.exercise.findMany({
    take: 12,
    orderBy: { slug: "asc" },
    select: { id: true, slug: true, primaryMuscle: true },
  });
  const extraExercises = await prisma.exercise.findMany({
    skip: 12,
    take: 32,
    orderBy: { slug: "asc" },
    select: { id: true, slug: true, primaryMuscle: true },
  });
  // Fallback: if the library has fewer than 44 exercises, reuse from sampleExercises
  // with wraparound so templates always get filled.
  function pickExercise(
    pool: typeof extraExercises,
    fallback: typeof sampleExercises,
    index: number,
  ) {
    const combined = pool.length > 0 ? pool : fallback;
    return combined[index % combined.length]!;
  }

  const existing = await prisma.routineTemplate.findFirst({
    where: { trainerId: trainer.id, name: "Demo PPL — 3 días" },
    select: { id: true },
  });

  const routine =
    existing ??
    (await prisma.routineTemplate.create({
      data: {
        trainerId: trainer.id,
        name: "Demo PPL — 3 días",
        description: "Push / Pull / Legs simplificado para datos demo.",
        goal: "HYPERTROPHY",
        splitDays: 3,
        durationWeeks: 8,
        days: {
          create: [
            { dayIndex: 1, name: "Empuje" },
            { dayIndex: 2, name: "Tirón" },
            { dayIndex: 3, name: "Pierna" },
          ],
        },
      },
    }));

  // Rellenar ejercicios solamente la primera vez (sin upsert es OK porque la
  // creación de RoutineTemplate es idempotente por nombre+trainer arriba).
  if (!existing && sampleExercises.length >= 12) {
    const days = await prisma.routineDay.findMany({
      where: { routineId: routine.id },
      orderBy: { dayIndex: "asc" },
    });
    const chunkSize = 4;
    for (let d = 0; d < days.length; d++) {
      const day = days[d];
      if (!day) continue;
      const slice = sampleExercises.slice(d * chunkSize, (d + 1) * chunkSize);
      for (let i = 0; i < slice.length; i++) {
        const ex = slice[i];
        if (!ex) continue;
        await prisma.routineExercise.create({
          data: {
            routineDayId: day.id,
            exerciseId: ex.id,
            order: i + 1,
            targetSets: 4,
            targetRepsMin: 8,
            targetRepsMax: 12,
            targetRpe: new Prisma.Decimal("8.0"),
            restSeconds: 90,
          },
        });
      }
    }
  }
  console.log("  ok  routine    Demo PPL — 3 días");

  // -- AssignedRoutine para AMBOS clientes -----------------------------------
  // Ana arrancó hace 28 días (4 semanas de historial), Bruno hace 21 días
  // (3 semanas) — perfiles deliberadamente desfasados para que el dashboard
  // del trainer muestre clientes en distintas fases del mesociclo.
  const fullTemplate = await prisma.routineTemplate.findUnique({
    where: { id: routine.id },
    include: { days: { include: { exercises: true } } },
  });

  const assignedByClientId = new Map<string, string>();
  for (const [idx, client] of clients.entries()) {
    const alreadyAssigned = await prisma.assignedRoutine.findFirst({
      where: {
        clientUserId: client.id,
        routineTemplateId: routine.id,
      },
      select: { id: true },
    });
    if (alreadyAssigned) {
      assignedByClientId.set(client.id, alreadyAssigned.id);
      continue;
    }
    const startsOn = new Date();
    // Ana: -28 días (4 semanas). Bruno: -21 días (3 semanas).
    startsOn.setDate(startsOn.getDate() - (idx === 0 ? 28 : 21));
    const created = await prisma.assignedRoutine.create({
      data: {
        clientUserId: client.id,
        routineTemplateId: routine.id,
        startsOn,
        status: "ACTIVE",
        // snapshotJson congela la prescripción al momento de asignar.
        snapshotJson: fullTemplate
          ? (fullTemplate as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
    assignedByClientId.set(client.id, created.id);
    console.log(`  ok  assigned   ${client.email}`);
  }

  // -- Demo BodyMetrics: 12 weekly snapshots for both clients ---------------
  // Progresión realista:
  //   Ana (MUSCLE_GAIN): peso sube levemente, grasa baja, masa muscular sube,
  //     circunferencias (pecho, brazo, muslo) suben; cintura baja un poco.
  //   Bruno (FAT_LOSS): peso baja (84→81 kg), grasa baja fuerte (21→18 %),
  //     masa muscular sube apenas (36.5→37.2 kg), cintura/cadera bajan,
  //     brazo/pecho casi planos (mantiene fuerza en déficit).
  for (const [idx, client] of clients.entries()) {
    const existingMetrics = await prisma.bodyMetric.count({
      where: { clientUserId: client.id },
    });
    if (existingMetrics > 0) continue;

    // Ambos clientes ahora tienen 12 mediciones semanales.
    const weekCount = 12;
    const isAna = idx === 0;

    for (let week = weekCount - 1; week >= 0; week--) {
      const recordedAt = new Date();
      recordedAt.setDate(recordedAt.getDate() - week * 7);
      // t va de 0 (medición más vieja) → 1 (medición más reciente).
      const t = (weekCount - 1 - week) / Math.max(weekCount - 1, 1);
      // Ruido ±1 % para que la gráfica no se vea sintética.
      const noise = () => 1 + (Math.random() - 0.5) * 0.01;

      let weightKg: number;
      let bodyFatPct: number;
      let muscleMassKg: number;
      let waistCm: number;
      let hipCm: number;
      let neckCm: number;
      let chestCm: number;
      let armCm: number;
      let thighCm: number;

      if (isAna) {
        // Ana: 71.5 → 73.0 kg, 26.5 → 24.0 %, 28.5 → 30.3 kg músculo.
        weightKg = (71.5 + t * 1.5) * noise();
        bodyFatPct = (26.5 - t * 2.5) * noise();
        muscleMassKg = (28.5 + t * 1.8) * noise();
        waistCm = (72.0 - t * 2.0) * noise();
        hipCm = (96.0 + t * 0.5) * noise();
        neckCm = (33.0 + t * 0.3) * noise();
        chestCm = (88.0 + t * 1.5) * noise();
        armCm = (28.0 + t * 1.5) * noise();
        thighCm = (56.0 + t * 1.2) * noise();
      } else {
        // Bruno: 84.0 → 81.0 kg, 21.0 → 18.0 %, 36.5 → 37.2 kg músculo.
        weightKg = (84.0 - t * 3.0) * noise();
        bodyFatPct = (21.0 - t * 3.0) * noise();
        muscleMassKg = (36.5 + t * 0.7) * noise();
        waistCm = (92.0 - t * 5.0) * noise(); // baja 5 cm en 12 semanas
        hipCm = (102.0 - t * 2.5) * noise();
        neckCm = (40.0 - t * 0.8) * noise();
        chestCm = (104.0 - t * 1.0) * noise();
        armCm = (36.5 - t * 0.3) * noise(); // casi se mantiene
        thighCm = (60.0 - t * 1.5) * noise();
      }

      await prisma.bodyMetric.create({
        data: {
          clientUserId: client.id,
          recordedAt,
          weightKg: new Prisma.Decimal(weightKg.toFixed(2)),
          bodyFatPct: new Prisma.Decimal(bodyFatPct.toFixed(1)),
          muscleMassKg: new Prisma.Decimal(muscleMassKg.toFixed(2)),
          waistCm: new Prisma.Decimal(waistCm.toFixed(1)),
          hipCm: new Prisma.Decimal(hipCm.toFixed(1)),
          neckCm: new Prisma.Decimal(neckCm.toFixed(1)),
          chestCm: new Prisma.Decimal(chestCm.toFixed(1)),
          armCm: new Prisma.Decimal(armCm.toFixed(1)),
          thighCm: new Prisma.Decimal(thighCm.toFixed(1)),
          source: "MANUAL",
          notes:
            week === 0
              ? isAna
                ? "Última medición — pecho y brazo suman 1.5 cm en 12 semanas. Muy buena adherencia."
                : "Última medición — bajó 3 kg manteniendo fuerza en banca. Cintura -5 cm."
              : null,
        },
      });
    }
    console.log(`  ok  metrics    ${client.email}: ${weekCount} mediciones`);
  }

  // -- Demo WorkoutSessions --------------------------------------------------
  // Ana: 8 sesiones en las últimas 4 semanas, mañana (07:30-09:30).
  // Bruno: 6 sesiones en las últimas 3 semanas, tarde (17:30-19:30).
  // Estructura: cada cliente tiene su propio array de offsets en días.
  // Los `dayIndex` rotan 0-1-2 (Push/Pull/Legs).
  interface SessionPlan {
    daysAgo: number;
    dayIndex: number;
    hour: number; // 24h
    minute: number;
  }

  const ANA_SESSIONS: SessionPlan[] = [
    { daysAgo: 26, dayIndex: 0, hour: 7, minute: 30 },
    { daysAgo: 23, dayIndex: 1, hour: 8, minute: 30 },
    { daysAgo: 19, dayIndex: 2, hour: 9, minute: 30 },
    { daysAgo: 16, dayIndex: 0, hour: 7, minute: 30 },
    { daysAgo: 12, dayIndex: 1, hour: 8, minute: 30 },
    { daysAgo: 9, dayIndex: 2, hour: 9, minute: 30 },
    { daysAgo: 5, dayIndex: 0, hour: 7, minute: 30 },
    { daysAgo: 2, dayIndex: 1, hour: 8, minute: 30 },
  ];

  const BRUNO_SESSIONS: SessionPlan[] = [
    { daysAgo: 20, dayIndex: 0, hour: 17, minute: 30 },
    { daysAgo: 17, dayIndex: 1, hour: 18, minute: 0 },
    { daysAgo: 13, dayIndex: 2, hour: 18, minute: 30 },
    { daysAgo: 10, dayIndex: 0, hour: 17, minute: 30 },
    { daysAgo: 6, dayIndex: 1, hour: 18, minute: 0 },
    { daysAgo: 3, dayIndex: 2, hour: 19, minute: 0 },
  ];

  const sessionPlansByClient: Array<{
    client: (typeof clients)[number];
    plans: SessionPlan[];
    bodyweightStart: number; // kg al inicio del bloque
    bodyweightEnd: number; // kg al final (última sesión)
    fatigueBase: number; // RPE-like baseline 1-10
    finalNote: string;
  }> = [
    {
      client: clients[0]!,
      plans: ANA_SESSIONS,
      bodyweightStart: 71.5,
      bodyweightEnd: 73.0,
      fatigueBase: 5,
      finalNote:
        "Sesión muy buena, press banca subió a 50 kg. Lista para subir carga la próxima semana.",
    },
    {
      client: clients[1]!,
      plans: BRUNO_SESSIONS,
      bodyweightStart: 84.0,
      bodyweightEnd: 81.0,
      fatigueBase: 6, // déficit calórico = más fatiga subjetiva
      finalNote:
        "Sentadilla mantuvo 90 kg pese al déficit. Buena señal — bajamos cardio mañana.",
    },
  ];

  // Guardamos sesiones creadas por cliente para poder seedear PerformedSets
  // después sin volver a consultar la DB.
  type SeededSession = {
    id: string;
    dayIndex: number;
    bodyweightKg: number;
    progressFactor: number; // 0 → primera sesión, 1 → última
  };
  const sessionsByClientId = new Map<string, SeededSession[]>();

  for (const block of sessionPlansByClient) {
    const { client, plans, bodyweightStart, bodyweightEnd, fatigueBase, finalNote } = block;
    const assignedId = assignedByClientId.get(client.id);
    if (!assignedId) continue;

    const existing = await prisma.workoutSession.count({
      where: { clientUserId: client.id },
    });
    if (existing > 0) {
      // Idempotencia: cargamos las que ya existían para que el bloque de
      // PerformedSets siguiente las vea.
      const prior = await prisma.workoutSession.findMany({
        where: { clientUserId: client.id },
        orderBy: { startedAt: "asc" },
        select: { id: true, dayIndex: true, bodyweightKg: true },
      });
      sessionsByClientId.set(
        client.id,
        prior.map((s, i) => ({
          id: s.id,
          dayIndex: s.dayIndex ?? 0,
          bodyweightKg: s.bodyweightKg ? Number(s.bodyweightKg) : bodyweightStart,
          progressFactor: prior.length > 1 ? i / (prior.length - 1) : 1,
        })),
      );
      continue;
    }

    const seeded: SeededSession[] = [];
    // Ordenamos cronológicamente (más viejas primero) para calcular progressFactor.
    const orderedPlans = [...plans].sort((a, b) => b.daysAgo - a.daysAgo);
    for (const [i, plan] of orderedPlans.entries()) {
      const startedAt = new Date();
      startedAt.setDate(startedAt.getDate() - plan.daysAgo);
      startedAt.setHours(plan.hour, plan.minute, 0, 0);
      const completedAt = new Date(startedAt);
      completedAt.setMinutes(completedAt.getMinutes() + 55 + Math.floor(Math.random() * 15));
      const durationSec = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

      const t = orderedPlans.length > 1 ? i / (orderedPlans.length - 1) : 1;
      const bodyweightKg = bodyweightStart + t * (bodyweightEnd - bodyweightStart);
      const isLast = i === orderedPlans.length - 1;

      const created = await prisma.workoutSession.create({
        data: {
          clientUserId: client.id,
          assignedRoutineId: assignedId,
          dayIndex: plan.dayIndex,
          status: "COMPLETED",
          startedAt,
          completedAt,
          totalDurationSec: durationSec,
          bodyweightKg: new Prisma.Decimal(bodyweightKg.toFixed(2)),
          subjectiveFatigue: fatigueBase + (i % 4),
          notes: isLast ? finalNote : null,
          isFreeWorkout: false,
        },
      });
      seeded.push({
        id: created.id,
        dayIndex: plan.dayIndex,
        bodyweightKg,
        progressFactor: t,
      });
    }
    sessionsByClientId.set(client.id, seeded);
    console.log(
      `  ok  sessions   ${client.email}: ${seeded.length} completadas`,
    );
  }

  // -- Demo PerformedSets ----------------------------------------------------
  // Para cada sesión completada, sembramos sets realistas de cada ejercicio
  // del día correspondiente.
  //
  // Reglas:
  //   - 4 sets por ejercicio: set 1 warmup, sets 2-3 working, set 4 drop set ocasional.
  //   - Reps en rango 8-12; cuando alcanza 12 con buen RPE → señal de subir carga.
  //   - RPE 7.0-9.0 (warmup más bajo, sets pesados más altos).
  //   - Sobrecarga progresiva: el peso sube ~1.5-2.5 kg cada 2-3 sesiones del mismo día.
  //   - Pesos base por grupo muscular del ejercicio (compound > isolation).
  //
  // PerformedSet usa `sessionId` y `exerciseId` directos (no routineExerciseId);
  // ver schema.prisma línea ~705. Por eso reutilizamos `routineExercise.exerciseId`.

  // Cargamos los días de la rutina con sus ejercicios (una sola query).
  const routineDays = await prisma.routineDay.findMany({
    where: { routineId: routine.id },
    orderBy: { dayIndex: "asc" },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: { select: { id: true, primaryMuscle: true } } },
      },
    },
  });

  // Mapa: dayIndex en WorkoutSession (0,1,2) → RoutineDay correspondiente.
  // Los RoutineDay están sembrados con dayIndex 1,2,3 (ver bloque arriba),
  // así que mapeamos por posición ordenada.
  const dayBySessionIndex = new Map<number, (typeof routineDays)[number]>();
  routineDays.forEach((day, i) => dayBySessionIndex.set(i, day));

  // Heurística de peso base (kg) por grupo muscular primario.
  // Valores razonables para cliente intermedio en gym de Costa Rica.
  function baseWeightFor(muscle: string, isAna: boolean): number {
    // Ana es FEMALE intermedia; Bruno es MALE intermedio. Bruno mueve más.
    const anaTable: Record<string, number> = {
      CHEST: 30,
      BACK: 35,
      SHOULDERS: 12,
      BICEPS: 10,
      TRICEPS: 12,
      QUADS: 50,
      HAMSTRINGS: 35,
      GLUTES: 60,
      CALVES: 40,
      ABS: 0,
      OBLIQUES: 0,
      FOREARMS: 8,
      NECK: 5,
      FULL_BODY: 25,
    };
    const brunoTable: Record<string, number> = {
      CHEST: 60,
      BACK: 65,
      SHOULDERS: 22,
      BICEPS: 18,
      TRICEPS: 22,
      QUADS: 90,
      HAMSTRINGS: 60,
      GLUTES: 100,
      CALVES: 70,
      ABS: 0,
      OBLIQUES: 0,
      FOREARMS: 14,
      NECK: 10,
      FULL_BODY: 45,
    };
    const table = isAna ? anaTable : brunoTable;
    return table[muscle] ?? (isAna ? 20 : 35);
  }

  for (const [clientId, sessions] of sessionsByClientId.entries()) {
    const isAna = clientId === clients[0]?.id;

    // Idempotencia: si ya hay PerformedSets para alguna sesión, salteamos cliente.
    const existingSets = await prisma.performedSet.count({
      where: { session: { clientUserId: clientId } },
    });
    if (existingSets > 0) {
      console.log(
        `  skip sets       ${isAna ? "Ana" : "Bruno"}: ${existingSets} sets ya existen`,
      );
      continue;
    }

    const allSets: Prisma.PerformedSetCreateManyInput[] = [];
    const prCandidatesByExercise = new Map<string, number>(); // mejor peso visto

    for (const sess of sessions) {
      const day = dayBySessionIndex.get(sess.dayIndex);
      if (!day) continue;

      for (const re of day.exercises) {
        const muscle = re.exercise.primaryMuscle;
        const base = baseWeightFor(muscle, isAna);
        if (base === 0) {
          // Bodyweight (abs/obliques): solo reps, sin peso.
          for (let setNum = 1; setNum <= re.targetSets; setNum++) {
            allSets.push({
              sessionId: sess.id,
              exerciseId: re.exerciseId,
              setNumber: setNum,
              weightKg: null,
              reps: 12 + Math.floor(Math.random() * 6), // 12-17
              rpe: new Prisma.Decimal((7.0 + Math.random() * 1.5).toFixed(1)),
              isWarmup: setNum === 1,
              isPr: false,
              failed: false,
              notes: null,
            });
          }
          continue;
        }

        // Sobrecarga progresiva: incremento del 0% (primera sesión) al ~6-8 %
        // (última sesión) sobre el peso base.
        const progressKg = base * (isAna ? 0.06 : 0.08) * sess.progressFactor;
        const workingWeight = base + progressKg;

        // 4 sets:
        //   set 1 = warmup ~60% del working, 12 reps, RPE 6.5-7.0
        //   set 2 = working, reps cerca del techo (10-12), RPE 8.0
        //   set 3 = working, reps medio (8-10), RPE 8.5-9.0
        //   set 4 = drop set ocasional (~80% del working) o backoff
        const setsToInsert = re.targetSets >= 4 ? 4 : re.targetSets;
        for (let setNum = 1; setNum <= setsToInsert; setNum++) {
          let weight: number;
          let reps: number;
          let rpe: number;
          let isWarmup = false;
          let notes: string | null = null;

          if (setNum === 1) {
            weight = workingWeight * 0.6;
            reps = 12;
            rpe = 6.5 + Math.random() * 0.5; // 6.5-7.0
            isWarmup = true;
          } else if (setNum === 2) {
            weight = workingWeight;
            // Si el cliente ya progresó (factor > 0.7), pega 12 (señal de subir).
            reps = sess.progressFactor > 0.7 ? 12 : 10 + Math.floor(Math.random() * 3);
            rpe = 7.5 + Math.random() * 0.5; // 7.5-8.0
            if (reps === 12 && sess.progressFactor > 0.7) {
              notes = "Tope de rango — subir carga la próxima.";
            }
          } else if (setNum === 3) {
            weight = workingWeight;
            reps = 8 + Math.floor(Math.random() * 3); // 8-10
            rpe = 8.0 + Math.random() * 1.0; // 8.0-9.0
          } else {
            // Set 4: 50% drop set, 50% backoff
            const isDrop = Math.random() < 0.5;
            weight = isDrop ? workingWeight * 0.8 : workingWeight * 0.9;
            reps = isDrop ? 10 + Math.floor(Math.random() * 3) : 8;
            rpe = 8.5 + Math.random() * 0.5;
            notes = isDrop ? "Drop set." : null;
          }

          // Redondeo a 0.5 kg (incremento típico en mancuernas/discos pequeños).
          weight = Math.round(weight * 2) / 2;

          // PR: si este peso supera lo histórico de este ejercicio para este
          // cliente (en working sets, no warmup).
          let isPr = false;
          if (!isWarmup) {
            const prior = prCandidatesByExercise.get(re.exerciseId) ?? 0;
            if (weight > prior) {
              isPr = true;
              prCandidatesByExercise.set(re.exerciseId, weight);
            }
          }

          allSets.push({
            sessionId: sess.id,
            exerciseId: re.exerciseId,
            setNumber: setNum,
            weightKg: new Prisma.Decimal(weight.toFixed(2)),
            reps,
            rpe: new Prisma.Decimal(rpe.toFixed(1)),
            restTakenSec: re.restSeconds + Math.floor((Math.random() - 0.5) * 30),
            isWarmup,
            isPr,
            failed: false,
            notes,
          });
        }
      }
    }

    if (allSets.length > 0) {
      await prisma.performedSet.createMany({ data: allSets });
      console.log(
        `  ok  sets        ${isAna ? "Ana" : "Bruno"}: ${allSets.length} sets en ${sessions.length} sesiones`,
      );
    }
  }

  // ==========================================================================
  // NEW ROUTINE TEMPLATES
  // ==========================================================================

  // Helper: fills a routine's days with exercises from a pool (wrap-around safe).
  async function fillRoutineDays(
    routineId: string,
    pool: Array<{ id: string; slug: string; primaryMuscle: string }>,
    exsPerDay: number,
    prescription: {
      targetSets: number;
      targetRepsMin: number;
      targetRepsMax: number;
      targetRpe: string;
      restSeconds: number;
    },
  ): Promise<void> {
    const days = await prisma.routineDay.findMany({
      where: { routineId },
      orderBy: { dayIndex: "asc" },
    });
    let globalIdx = 0;
    for (const day of days) {
      for (let i = 0; i < exsPerDay; i++) {
        const ex = pool[globalIdx % pool.length]!;
        globalIdx++;
        await prisma.routineExercise.create({
          data: {
            routineDayId: day.id,
            exerciseId: ex.id,
            order: i + 1,
            targetSets: prescription.targetSets,
            targetRepsMin: prescription.targetRepsMin,
            targetRepsMax: prescription.targetRepsMax,
            targetRpe: new Prisma.Decimal(prescription.targetRpe),
            restSeconds: prescription.restSeconds,
          },
        });
      }
    }
  }

  // -- Template: "Upper / Lower — 4 días" (STRENGTH) -------------------------
  const existingUL = await prisma.routineTemplate.findFirst({
    where: { trainerId: trainer.id, name: "Upper / Lower — 4 días" },
    select: { id: true },
  });

  const routineUL =
    existingUL ??
    (await prisma.routineTemplate.create({
      data: {
        trainerId: trainer.id,
        name: "Upper / Lower — 4 días",
        description:
          "Bloque de fuerza Upper/Lower de 4 días por semana. Énfasis en compuestos pesados y sobrecarga progresiva.",
        goal: "STRENGTH",
        splitDays: 4,
        durationWeeks: 10,
        days: {
          create: [
            { dayIndex: 1, name: "Upper A — Empuje pesado" },
            { dayIndex: 2, name: "Lower A — Sentadilla" },
            { dayIndex: 3, name: "Upper B — Jalón pesado" },
            { dayIndex: 4, name: "Lower B — Peso muerto" },
          ],
        },
      },
    }));

  if (!existingUL) {
    // Use extraExercises pool; wrap-around ensures 16 slots are filled regardless
    // of library size.
    const ulPool =
      extraExercises.length >= 16
        ? extraExercises.slice(0, 16)
        : Array.from({ length: 16 }, (_, i) =>
            pickExercise(extraExercises, sampleExercises, i),
          );
    await fillRoutineDays(routineUL.id, ulPool, 4, {
      targetSets: 5,
      targetRepsMin: 3,
      targetRepsMax: 6,
      targetRpe: "8.5",
      restSeconds: 180,
    });
  }
  console.log("  ok  routine    Upper / Lower — 4 días");

  // -- Template: "Full Body — 3x/semana" (FAT_LOSS) --------------------------
  const existingFB = await prisma.routineTemplate.findFirst({
    where: { trainerId: trainer.id, name: "Full Body — 3x/semana" },
    select: { id: true },
  });

  const routineFB =
    existingFB ??
    (await prisma.routineTemplate.create({
      data: {
        trainerId: trainer.id,
        name: "Full Body — 3x/semana",
        description:
          "Rutina full body 3 días por semana. Circuitos de compuestos para máximo gasto calórico y mantenimiento de músculo en déficit.",
        goal: "FAT_LOSS",
        splitDays: 3,
        durationWeeks: 6,
        days: {
          create: [
            { dayIndex: 1, name: "Full Body A" },
            { dayIndex: 2, name: "Full Body B" },
            { dayIndex: 3, name: "Full Body C" },
          ],
        },
      },
    }));

  if (!existingFB) {
    // 3 days × 5 exercises = 15 slots. Pull from extraExercises offset 16.
    const fbPool =
      extraExercises.length >= 31
        ? extraExercises.slice(16, 31)
        : Array.from({ length: 15 }, (_, i) =>
            pickExercise(extraExercises, sampleExercises, 16 + i),
          );
    await fillRoutineDays(routineFB.id, fbPool, 5, {
      targetSets: 3,
      targetRepsMin: 10,
      targetRepsMax: 15,
      targetRpe: "7.5",
      restSeconds: 60,
    });
  }
  console.log("  ok  routine    Full Body — 3x/semana");

  // ==========================================================================
  // ANA: COMPLETED "Full Body 3x" 2 months ago (routine history)
  // ==========================================================================

  const fullTemplateFB = await prisma.routineTemplate.findUnique({
    where: { id: routineFB.id },
    include: { days: { include: { exercises: true } } },
  });

  const anaUser = clients[0]!;
  const existingAnaFB = await prisma.assignedRoutine.findFirst({
    where: {
      clientUserId: anaUser.id,
      routineTemplateId: routineFB.id,
    },
    select: { id: true },
  });

  if (!existingAnaFB) {
    const fbStartsOn = new Date();
    fbStartsOn.setDate(fbStartsOn.getDate() - 70); // ~10 semanas atrás
    const fbEndsOn = new Date();
    fbEndsOn.setDate(fbEndsOn.getDate() - 28); // terminó hace 4 semanas
    await prisma.assignedRoutine.create({
      data: {
        clientUserId: anaUser.id,
        routineTemplateId: routineFB.id,
        startsOn: fbStartsOn,
        endsOn: fbEndsOn,
        status: "COMPLETED",
        trainerNotes:
          "Bloque completado. Ana completó las 6 semanas sin interrupciones. Buena base para transicionar a PPL.",
        snapshotJson: fullTemplateFB
          ? (fullTemplateFB as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
    console.log("  ok  assigned   Ana — Full Body COMPLETED (historial)");
  }

  // ==========================================================================
  // NEW CLIENTS: Carlos (demo.cliente3) y Diana (demo.cliente4)
  // ==========================================================================

  // -- Carlos Demo -----------------------------------------------------------
  const carlos = await prisma.user.upsert({
    where: { email: DEMO_CLIENT_EMAIL_3 },
    create: {
      email: DEMO_CLIENT_EMAIL_3,
      name: "Carlos Demo",
      role: UserRole.CLIENT,
      gender: "MALE",
      dateOfBirth: new Date("1989-11-03"),
      emailVerified: new Date(),
      pushOptIn: false,
      passwordHash,
      clientProfile: {
        create: {
          parqStatus: "GREEN",
          goal: "FAT_LOSS",
          locationCity: "San José",
          weightKg: new Prisma.Decimal("92.00"),
          heightCm: new Prisma.Decimal("175.0"),
        },
      },
    },
    update: { passwordHash },
  });
  console.log(`  ok  client     ${carlos.email} (FAT_LOSS)`);

  // -- Diana Demo ------------------------------------------------------------
  const diana = await prisma.user.upsert({
    where: { email: DEMO_CLIENT_EMAIL_4 },
    create: {
      email: DEMO_CLIENT_EMAIL_4,
      name: "Diana Demo",
      role: UserRole.CLIENT,
      gender: "FEMALE",
      dateOfBirth: new Date("2000-05-18"),
      emailVerified: new Date(),
      pushOptIn: false,
      passwordHash,
      clientProfile: {
        create: {
          parqStatus: "GREEN",
          goal: "GENERAL_HEALTH",
          locationCity: "San José",
          weightKg: new Prisma.Decimal("55.00"),
          heightCm: new Prisma.Decimal("158.0"),
        },
      },
    },
    update: { passwordHash },
  });
  console.log(`  ok  client     ${diana.email} (GENERAL_HEALTH)`);

  // -- TrainerClient links for new clients ------------------------------------
  await prisma.trainerClient.upsert({
    where: {
      trainerId_clientId: { trainerId: trainer.id, clientId: carlos.id },
    },
    create: {
      trainerId: trainer.id,
      clientId: carlos.id,
      status: "ACTIVE",
      monthlyPriceCRC: new Prisma.Decimal("20000.00"),
    },
    update: {},
  });
  await prisma.trainerClient.upsert({
    where: {
      trainerId_clientId: { trainerId: trainer.id, clientId: diana.id },
    },
    create: {
      trainerId: trainer.id,
      clientId: diana.id,
      status: "ACTIVE",
      monthlyPriceCRC: new Prisma.Decimal("20000.00"),
    },
    update: {},
  });
  console.log("  ok  links      Carlos + Diana active");

  // -- Assign Upper/Lower to Carlos ------------------------------------------
  const fullTemplateUL = await prisma.routineTemplate.findUnique({
    where: { id: routineUL.id },
    include: { days: { include: { exercises: true } } },
  });

  const existingCarlosUL = await prisma.assignedRoutine.findFirst({
    where: {
      clientUserId: carlos.id,
      routineTemplateId: routineUL.id,
    },
    select: { id: true },
  });

  let carlosAssignedId: string;
  if (existingCarlosUL) {
    carlosAssignedId = existingCarlosUL.id;
  } else {
    const carlosStart = new Date();
    carlosStart.setDate(carlosStart.getDate() - 14);
    const carlosAssigned = await prisma.assignedRoutine.create({
      data: {
        clientUserId: carlos.id,
        routineTemplateId: routineUL.id,
        startsOn: carlosStart,
        status: "ACTIVE",
        trainerNotes:
          "Primer mesociclo de Carlos. Priorizar técnica sobre carga. Revisión de sentadilla semana 3.",
        snapshotJson: fullTemplateUL
          ? (fullTemplateUL as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
    carlosAssignedId = carlosAssigned.id;
    console.log(`  ok  assigned   ${carlos.email}`);
  }

  // -- Assign Full Body 3x to Diana ------------------------------------------
  const existingDianaFB = await prisma.assignedRoutine.findFirst({
    where: {
      clientUserId: diana.id,
      routineTemplateId: routineFB.id,
    },
    select: { id: true },
  });

  let dianaAssignedId: string;
  if (existingDianaFB) {
    dianaAssignedId = existingDianaFB.id;
  } else {
    const dianaStart = new Date();
    dianaStart.setDate(dianaStart.getDate() - 10);
    const dianaAssigned = await prisma.assignedRoutine.create({
      data: {
        clientUserId: diana.id,
        routineTemplateId: routineFB.id,
        startsOn: dianaStart,
        status: "ACTIVE",
        trainerNotes:
          "Enfoque en salud general. Incluir movilidad torácica en warmup. Ritmo moderado — no buscar fatiga excesiva.",
        snapshotJson: fullTemplateFB
          ? (fullTemplateFB as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
    dianaAssignedId = dianaAssigned.id;
    console.log(`  ok  assigned   ${diana.email}`);
  }

  // ==========================================================================
  // BODY METRICS — Carlos (6 semanas) y Diana (4 semanas)
  // ==========================================================================

  // Carlos: 92→90 kg, bodyfat 28→27 %, muscle 33→33.5 kg
  const existingCarlosMetrics = await prisma.bodyMetric.count({
    where: { clientUserId: carlos.id },
  });
  if (existingCarlosMetrics === 0) {
    const carlosWeeks = 6;
    for (let week = carlosWeeks - 1; week >= 0; week--) {
      const recordedAt = new Date();
      recordedAt.setDate(recordedAt.getDate() - week * 7);
      const t = (carlosWeeks - 1 - week) / Math.max(carlosWeeks - 1, 1);
      const noise = () => 1 + (Math.random() - 0.5) * 0.01;
      await prisma.bodyMetric.create({
        data: {
          clientUserId: carlos.id,
          recordedAt,
          weightKg: new Prisma.Decimal(((92.0 - t * 2.0) * noise()).toFixed(2)),
          bodyFatPct: new Prisma.Decimal(((28.0 - t * 1.0) * noise()).toFixed(1)),
          muscleMassKg: new Prisma.Decimal(((33.0 + t * 0.5) * noise()).toFixed(2)),
          waistCm: new Prisma.Decimal(((98.0 - t * 2.5) * noise()).toFixed(1)),
          hipCm: new Prisma.Decimal(((106.0 - t * 1.0) * noise()).toFixed(1)),
          neckCm: new Prisma.Decimal(((42.0 - t * 0.3) * noise()).toFixed(1)),
          chestCm: new Prisma.Decimal(((110.0 - t * 1.5) * noise()).toFixed(1)),
          armCm: new Prisma.Decimal(((37.0 + t * 0.2) * noise()).toFixed(1)),
          thighCm: new Prisma.Decimal(((62.0 - t * 1.0) * noise()).toFixed(1)),
          source: "MANUAL",
          notes:
            week === 0
              ? "Primer mes completado. Peso bajó 2 kg. Técnica de sentadilla mejorando notablemente."
              : null,
        },
      });
    }
    console.log(`  ok  metrics    ${carlos.email}: ${carlosWeeks} mediciones`);
  }

  // Diana: peso estable 55 kg, bodyfat 22→21.5 %, músculo leve ganancia
  const existingDianaMetrics = await prisma.bodyMetric.count({
    where: { clientUserId: diana.id },
  });
  if (existingDianaMetrics === 0) {
    const dianaWeeks = 4;
    for (let week = dianaWeeks - 1; week >= 0; week--) {
      const recordedAt = new Date();
      recordedAt.setDate(recordedAt.getDate() - week * 7);
      const t = (dianaWeeks - 1 - week) / Math.max(dianaWeeks - 1, 1);
      const noise = () => 1 + (Math.random() - 0.5) * 0.01;
      await prisma.bodyMetric.create({
        data: {
          clientUserId: diana.id,
          recordedAt,
          weightKg: new Prisma.Decimal(((55.0 + t * 0.1) * noise()).toFixed(2)),
          bodyFatPct: new Prisma.Decimal(((22.0 - t * 0.5) * noise()).toFixed(1)),
          muscleMassKg: new Prisma.Decimal(((19.5 + t * 0.3) * noise()).toFixed(2)),
          waistCm: new Prisma.Decimal(((68.0 - t * 0.5) * noise()).toFixed(1)),
          hipCm: new Prisma.Decimal(((93.0 - t * 0.2) * noise()).toFixed(1)),
          neckCm: new Prisma.Decimal(((32.0) * noise()).toFixed(1)),
          chestCm: new Prisma.Decimal(((84.0 + t * 0.3) * noise()).toFixed(1)),
          armCm: new Prisma.Decimal(((26.0 + t * 0.3) * noise()).toFixed(1)),
          thighCm: new Prisma.Decimal(((53.0 + t * 0.2) * noise()).toFixed(1)),
          source: "MANUAL",
          notes:
            week === 0
              ? "Composición corporal estable. Leve ganancia muscular, excelente. Continuar con el plan."
              : null,
        },
      });
    }
    console.log(`  ok  metrics    ${diana.email}: ${dianaWeeks} mediciones`);
  }

  // ==========================================================================
  // WORKOUT SESSIONS — Carlos (4) y Diana (3)
  // ==========================================================================

  // Load Upper/Lower days para Carlos (dayIndex 0-3 → RoutineDay 1-4).
  const ulDays = await prisma.routineDay.findMany({
    where: { routineId: routineUL.id },
    orderBy: { dayIndex: "asc" },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: { select: { id: true, primaryMuscle: true } } },
      },
    },
  });

  // Load Full Body days para Diana (dayIndex 0-2 → RoutineDay 1-3).
  const fbDays = await prisma.routineDay.findMany({
    where: { routineId: routineFB.id },
    orderBy: { dayIndex: "asc" },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: { select: { id: true, primaryMuscle: true } } },
      },
    },
  });

  // Same mapping logic: session dayIndex (0-based position) → RoutineDay.
  const ulDayByIdx = new Map<number, (typeof ulDays)[number]>();
  ulDays.forEach((d, i) => ulDayByIdx.set(i, d));
  const fbDayByIdx = new Map<number, (typeof fbDays)[number]>();
  fbDays.forEach((d, i) => fbDayByIdx.set(i, d));

  // Weight tables for Carlos (obese beginner male) and Diana (wellness female).
  function baseWeightForCarlos(muscle: string): number {
    const table: Record<string, number> = {
      CHEST: 50, BACK: 55, SHOULDERS: 18, BICEPS: 14, TRICEPS: 18,
      QUADS: 70, HAMSTRINGS: 50, GLUTES: 80, CALVES: 60, ABS: 0,
      OBLIQUES: 0, FOREARMS: 12, NECK: 8, FULL_BODY: 35,
    };
    return table[muscle] ?? 30;
  }
  function baseWeightForDiana(muscle: string): number {
    const table: Record<string, number> = {
      CHEST: 20, BACK: 22, SHOULDERS: 8, BICEPS: 7, TRICEPS: 8,
      QUADS: 35, HAMSTRINGS: 25, GLUTES: 45, CALVES: 30, ABS: 0,
      OBLIQUES: 0, FOREARMS: 6, NECK: 4, FULL_BODY: 16,
    };
    return table[muscle] ?? 12;
  }

  // Seed sessions for a new client, then seed their PerformedSets.
  // Extracted as a local async block to avoid repeating the pattern.
  interface NewClientSessionPlan {
    daysAgo: number;
    dayIndex: number; // 0-based position into the template's days array
    hour: number;
    minute: number;
  }

  async function seedNewClientSessions(opts: {
    clientId: string;
    clientLabel: string;
    assignedId: string;
    plans: NewClientSessionPlan[];
    bodyweightStart: number;
    bodyweightEnd: number;
    fatigueBase: number;
    finalNote: string;
    dayMap: Map<number, (typeof ulDays)[number]>;
    baseWeightFn: (muscle: string) => number;
    progressMultiplier: number; // how fast they progress (0.04 = 4% max)
  }): Promise<void> {
    const {
      clientId, clientLabel, assignedId, plans,
      bodyweightStart, bodyweightEnd, fatigueBase, finalNote,
      dayMap, baseWeightFn, progressMultiplier,
    } = opts;

    const existingCount = await prisma.workoutSession.count({
      where: { clientUserId: clientId },
    });
    if (existingCount > 0) {
      console.log(`  skip sessions  ${clientLabel}: ${existingCount} ya existen`);
      return;
    }

    const existingSetsCount = await prisma.performedSet.count({
      where: { session: { clientUserId: clientId } },
    });
    if (existingSetsCount > 0) {
      console.log(`  skip sets      ${clientLabel}: ${existingSetsCount} sets ya existen`);
      return;
    }

    const ordered = [...plans].sort((a, b) => b.daysAgo - a.daysAgo);
    const allSets: Prisma.PerformedSetCreateManyInput[] = [];
    const prTracker = new Map<string, number>();

    for (const [i, plan] of ordered.entries()) {
      const startedAt = new Date();
      startedAt.setDate(startedAt.getDate() - plan.daysAgo);
      startedAt.setHours(plan.hour, plan.minute, 0, 0);
      const completedAt = new Date(startedAt);
      completedAt.setMinutes(completedAt.getMinutes() + 50 + Math.floor(Math.random() * 20));
      const durationSec = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

      const t = ordered.length > 1 ? i / (ordered.length - 1) : 1;
      const bodyweightKg = bodyweightStart + t * (bodyweightEnd - bodyweightStart);
      const isLast = i === ordered.length - 1;

      const session = await prisma.workoutSession.create({
        data: {
          clientUserId: clientId,
          assignedRoutineId: assignedId,
          dayIndex: plan.dayIndex,
          status: "COMPLETED",
          startedAt,
          completedAt,
          totalDurationSec: durationSec,
          bodyweightKg: new Prisma.Decimal(bodyweightKg.toFixed(2)),
          subjectiveFatigue: fatigueBase + (i % 3),
          notes: isLast ? finalNote : null,
          isFreeWorkout: false,
        },
      });

      const day = dayMap.get(plan.dayIndex);
      if (!day) continue;

      for (const re of day.exercises) {
        const muscle = re.exercise.primaryMuscle;
        const base = baseWeightFn(muscle);

        if (base === 0) {
          // Bodyweight exercise
          for (let setNum = 1; setNum <= re.targetSets; setNum++) {
            allSets.push({
              sessionId: session.id,
              exerciseId: re.exerciseId,
              setNumber: setNum,
              weightKg: null,
              reps: 12 + Math.floor(Math.random() * 5),
              rpe: new Prisma.Decimal((7.0 + Math.random() * 1.5).toFixed(1)),
              isWarmup: setNum === 1,
              isPr: false,
              failed: false,
              notes: null,
            });
          }
          continue;
        }

        const progressKg = base * progressMultiplier * t;
        const workingWeight = base + progressKg;
        const setsToInsert = Math.min(re.targetSets, 4);

        for (let setNum = 1; setNum <= setsToInsert; setNum++) {
          let weight: number;
          let reps: number;
          let rpe: number;
          let isWarmup = false;
          let notes: string | null = null;

          if (setNum === 1) {
            weight = workingWeight * 0.6;
            reps = 12;
            rpe = 6.5 + Math.random() * 0.5;
            isWarmup = true;
          } else if (setNum === 2) {
            weight = workingWeight;
            reps = t > 0.6 ? re.targetRepsMax : re.targetRepsMin + Math.floor(Math.random() * 3);
            rpe = 7.5 + Math.random() * 0.5;
            if (reps === re.targetRepsMax && t > 0.6) {
              notes = "Tope de rango — subir carga próxima sesión.";
            }
          } else if (setNum === 3) {
            weight = workingWeight;
            reps = re.targetRepsMin + Math.floor(Math.random() * 2);
            rpe = 8.0 + Math.random() * 1.0;
          } else {
            const isDrop = Math.random() < 0.5;
            weight = isDrop ? workingWeight * 0.8 : workingWeight * 0.9;
            reps = isDrop ? re.targetRepsMin + Math.floor(Math.random() * 3) : re.targetRepsMin;
            rpe = 8.0 + Math.random() * 0.8;
            notes = isDrop ? "Drop set." : null;
          }

          weight = Math.round(weight * 2) / 2;

          let isPr = false;
          if (!isWarmup) {
            const prior = prTracker.get(re.exerciseId) ?? 0;
            if (weight > prior) {
              isPr = true;
              prTracker.set(re.exerciseId, weight);
            }
          }

          allSets.push({
            sessionId: session.id,
            exerciseId: re.exerciseId,
            setNumber: setNum,
            weightKg: new Prisma.Decimal(weight.toFixed(2)),
            reps,
            rpe: new Prisma.Decimal(rpe.toFixed(1)),
            restTakenSec: re.restSeconds + Math.floor((Math.random() - 0.5) * 30),
            isWarmup,
            isPr,
            failed: false,
            notes,
          });
        }
      }
    }

    if (allSets.length > 0) {
      await prisma.performedSet.createMany({ data: allSets });
    }
    console.log(
      `  ok  sessions   ${clientLabel}: ${ordered.length} sesiones, ${allSets.length} sets`,
    );
  }

  // Carlos: 4 sessions (Upper/Lower 14 days) — mañana temprano
  await seedNewClientSessions({
    clientId: carlos.id,
    clientLabel: "Carlos",
    assignedId: carlosAssignedId,
    plans: [
      { daysAgo: 13, dayIndex: 0, hour: 6, minute: 30 },
      { daysAgo: 11, dayIndex: 1, hour: 6, minute: 30 },
      { daysAgo: 7, dayIndex: 2, hour: 6, minute: 30 },
      { daysAgo: 4, dayIndex: 3, hour: 6, minute: 30 },
    ],
    bodyweightStart: 92.0,
    bodyweightEnd: 91.0,
    fatigueBase: 7, // beginner — fatiga subjetiva alta
    finalNote:
      "Primera semana de peso muerto completada. Técnica mejorando pero sigue levantando talones. Recordar zapatos de halterofilia.",
    dayMap: ulDayByIdx,
    baseWeightFn: baseWeightForCarlos,
    progressMultiplier: 0.05,
  });

  // Diana: 3 sessions (Full Body 10 days) — mediodía
  await seedNewClientSessions({
    clientId: diana.id,
    clientLabel: "Diana",
    assignedId: dianaAssignedId,
    plans: [
      { daysAgo: 9, dayIndex: 0, hour: 12, minute: 0 },
      { daysAgo: 6, dayIndex: 1, hour: 12, minute: 0 },
      { daysAgo: 3, dayIndex: 2, hour: 12, minute: 0 },
    ],
    bodyweightStart: 55.0,
    bodyweightEnd: 55.0,
    fatigueBase: 4, // wellness focus — cargas moderadas
    finalNote:
      "Diana completó los 3 días de la semana sin faltas. Muy disciplinada. Evaluar agregar clase de yoga los sábados.",
    dayMap: fbDayByIdx,
    baseWeightFn: baseWeightForDiana,
    progressMultiplier: 0.04,
  });

  // ==========================================================================
  // TRAINER NOTES — Carlos y Diana
  // ==========================================================================

  const newClientNotes: Record<string, string> = {
    [carlos.id]:
      "Carlos es nuevo, primer mesociclo. Ojo con técnica de sentadilla — tendencia a levantar talones. Necesita zapatos de halterofilia.",
    [diana.id]:
      "Diana entrena por salud general, no busca hipertrofia agresiva. Incluir movilidad torácica en warmup. Le gusta yoga — evaluar clase los sábados.",
  };

  for (const [clientId, note] of Object.entries(newClientNotes)) {
    await prisma.trainerClient.updateMany({
      where: { trainerId: trainer.id, clientId, notesPrivate: null },
      data: { notesPrivate: note },
    });
  }
  console.log("  ok  notes      Carlos + Diana con notas demo");

  // ==========================================================================
  // TRAINER PROFILE ENHANCEMENT
  // ==========================================================================

  await prisma.trainerProfile.updateMany({
    where: { userId: trainer.id },
    data: {
      specialty: "Hipertrofia, fuerza y recomposición corporal",
      bio: "Entrenador certificado con 6 años de experiencia en entrenamiento personalizado. Especialista en hipertrofia y powerlifting. Coach Demo es una cuenta de demostración.",
    },
  });
  console.log("  ok  profile    TrainerProfile actualizado");

  // -- Trainer notes for both clients ----------------------------------------
  // Notas privadas (sólo trainer las ve, ver TrainerClient.notesPrivate).
  // Personalizadas por cliente — Ana hipertrofia, Bruno cutting.
  const trainerNotesByClient: Record<string, string> = {
    [clients[0]!.id]:
      "Ana es comprometida, llega temprano siempre. Cuidado con técnica de sentadilla — tendencia a valgo en rodilla derecha; meterle banda elástica arriba del muslo en warmup. Próxima medición: pliegues + cintura.",
    [clients[1]!.id]:
      "Bruno está en déficit calórico (~400 kcal). Buena adherencia, pero ojo con fatiga acumulada en pierna. Si el press banca baja 2 sesiones seguidas, recortar volumen 20% y subir kcal mantenimiento por una semana.",
  };

  for (const client of clients) {
    await prisma.trainerClient.updateMany({
      where: {
        trainerId: trainer.id,
        clientId: client.id,
        notesPrivate: null,
      },
      data: {
        notesPrivate: trainerNotesByClient[client.id] ?? null,
      },
    });
  }
  console.log(`  ok  notes      ${clients.length} clientes con notas demo`);
}

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------
async function main(): Promise<void> {
  const start = Date.now();
  console.log("=== BLACKLINE FITNESS seed ===");
  console.log(`node_env: ${process.env.NODE_ENV ?? "development"}`);
  console.log(`seed_demo: ${process.env.SEED_DEMO ?? "false"}`);

  await seedSubscriptionPlans();

  // Free Exercise DB import — owned by python-data-engineer.
  console.log("[seed] Exercises (Free Exercise DB)...");
  const exResult = await seedExercises(prisma);
  console.log(
    `  ok  exercises  ${exResult.created} created, ${exResult.skipped} skipped`,
  );

  // Knowledge base for the AI assistant — RAG corpus.
  console.log("[seed] Knowledge chunks (RAG corpus)...");
  const kbResult = await seedKnowledge(prisma);
  console.log(
    `  ok  knowledge  ${kbResult.created} created, ${kbResult.updated} updated, ${kbResult.skipped} skipped`,
  );

  if (process.env.SEED_DEMO === "true") {
    await seedDemoData();
  }

  const ms = Date.now() - start;
  console.log(`=== done in ${ms} ms ===`);
}

main()
  .catch((err: unknown) => {
    console.error("[seed] FAILED");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
