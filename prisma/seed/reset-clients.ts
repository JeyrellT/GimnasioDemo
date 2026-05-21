// =============================================================================
// BLACKLINE FITNESS — DESTRUCTIVE: reset CLIENT users + their data only
// Owner: backend-api.
//
// ⚠️  ESTE SCRIPT BORRA DATOS DE CLIENTES DE FORMA PERMANENTE.  ⚠️
//
// Pensado para el caso "limpiá los clientes pero dejá la app armada":
// borra todo perfil de cliente y todo lo que orbita alrededor (mediciones,
// rutinas asignadas, sesiones, facturas, notificaciones), pero CONSERVA
// trainers, super-admin, planes de subscripción, catálogos y la
// configuración financiera del trainer (locations, expenses).
//
// Si en cambio querés un reset full (también trainers y catálogos), usá
// `pnpm db:reset-users`.
//
// Qué CONSERVA:
//   - Users con role TRAINER / ADMIN / SUPER_ADMIN (+ sus profiles).
//   - TrainerSubscription, SubscriptionPlan.
//   - RoutineTemplate / RoutineDay / RoutineExercise (templates del trainer
//     — solo se desasigna a los clientes, no se borran).
//   - Exercise (catálogo seed + ejercicios custom de trainers).
//   - KnowledgeChunk.
//   - TrainerLocation, LocationVisit, TrainerExpense, OneOffSale (se conservan;
//     OneOffSale.clientUserId queda NULL automáticamente por onDelete: SetNull).
//   - CustomGoal (del trainer).
//   - PaymentEvent (append-only audit-style).
//   - AuditLog (actorUserId queda NULL automáticamente por onDelete: SetNull).
//   - Referral (referredUserId queda NULL automáticamente por onDelete: SetNull).
//
// Qué BORRA:
//   - User donde role = CLIENT (incluye soft-deleted).
//   - ClientProfile + Account + Session + Consent + LpdpRequest del cliente.
//   - InitialAssessment + ParqAnswer (cascade) + MedicalCondition.
//   - BodyMetric + ProgressPhoto.
//   - AssignedRoutine + RoutineComment (cascade) + WorkoutSession + PerformedSet (cascade).
//   - ClientCharge + Invoice del cliente.
//   - TrainerClient (la relación trainer↔cliente).
//   - Notification del cliente.
//   - Invitation pendientes (sin importar a quién apunten — son para crear clientes).
//   - OnboardingDraft pendientes (idem).
//
// Confirmación obligatoria por env var (doble guard contra ejecución accidental):
//
//   CONFIRM=YES_DELETE_ALL_CLIENTS \
//     pnpm db:reset-clients
//
// Si CONFIRM no está set o no matchea exactamente, el script aborta sin tocar nada.
//
// Idempotencia: re-correrlo sobre una DB sin clientes es no-op (deleteMany sin
// filas no falla).
// =============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["warn", "error"] });

const REQUIRED_CONFIRM = "YES_DELETE_ALL_CLIENTS";

interface CountSnapshot {
  // Cliente core
  userClient: number;
  clientProfile: number;
  // Auth & consent del cliente
  account: number;
  session: number;
  consent: number;
  lpdpRequest: number;
  // Linking
  trainerClient: number;
  invitation: number;
  onboardingDraft: number;
  // Assessment
  initialAssessment: number;
  parqAnswer: number;
  medicalCondition: number;
  // Body data
  bodyMetric: number;
  progressPhoto: number;
  // Routines / execution
  assignedRoutine: number;
  routineComment: number;
  workoutSession: number;
  performedSet: number;
  // Billing del cliente
  clientCharge: number;
  invoice: number;
  // Notifs
  notification: number;
  // Preservados (informativos — deberían quedar iguales)
  userTrainer: number;
  userAdmin: number;
  userSuperAdmin: number;
  trainerProfile: number;
  trainerSubscription: number;
  subscriptionPlan: number;
  routineTemplate: number;
  exercise: number;
  knowledgeChunk: number;
  trainerLocation: number;
  trainerExpense: number;
  oneOffSale: number;
  auditLog: number;
  referral: number;
}

async function snapshotCounts(): Promise<CountSnapshot> {
  const [
    userClient,
    clientProfile,
    account,
    session,
    consent,
    lpdpRequest,
    trainerClient,
    invitation,
    onboardingDraft,
    initialAssessment,
    parqAnswer,
    medicalCondition,
    bodyMetric,
    progressPhoto,
    assignedRoutine,
    routineComment,
    workoutSession,
    performedSet,
    clientCharge,
    invoice,
    notification,
    userTrainer,
    userAdmin,
    userSuperAdmin,
    trainerProfile,
    trainerSubscription,
    subscriptionPlan,
    routineTemplate,
    exercise,
    knowledgeChunk,
    trainerLocation,
    trainerExpense,
    oneOffSale,
    auditLog,
    referral,
  ] = await prisma.$transaction([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.clientProfile.count(),
    prisma.account.count({ where: { user: { role: "CLIENT" } } }),
    prisma.session.count({ where: { user: { role: "CLIENT" } } }),
    prisma.consent.count({ where: { user: { role: "CLIENT" } } }),
    prisma.lpdpRequest.count({ where: { user: { role: "CLIENT" } } }),
    prisma.trainerClient.count(),
    prisma.invitation.count(),
    prisma.onboardingDraft.count(),
    prisma.initialAssessment.count(),
    prisma.parqAnswer.count(),
    prisma.medicalCondition.count(),
    prisma.bodyMetric.count(),
    prisma.progressPhoto.count(),
    prisma.assignedRoutine.count(),
    prisma.routineComment.count(),
    prisma.workoutSession.count(),
    prisma.performedSet.count(),
    prisma.clientCharge.count(),
    prisma.invoice.count(),
    prisma.notification.count({ where: { user: { role: "CLIENT" } } }),
    prisma.user.count({ where: { role: "TRAINER" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
    prisma.trainerProfile.count(),
    prisma.trainerSubscription.count(),
    prisma.subscriptionPlan.count(),
    prisma.routineTemplate.count(),
    prisma.exercise.count(),
    prisma.knowledgeChunk.count(),
    prisma.trainerLocation.count(),
    prisma.trainerExpense.count(),
    prisma.oneOffSale.count(),
    prisma.auditLog.count(),
    prisma.referral.count(),
  ]);

  return {
    userClient,
    clientProfile,
    account,
    session,
    consent,
    lpdpRequest,
    trainerClient,
    invitation,
    onboardingDraft,
    initialAssessment,
    parqAnswer,
    medicalCondition,
    bodyMetric,
    progressPhoto,
    assignedRoutine,
    routineComment,
    workoutSession,
    performedSet,
    clientCharge,
    invoice,
    notification,
    userTrainer,
    userAdmin,
    userSuperAdmin,
    trainerProfile,
    trainerSubscription,
    subscriptionPlan,
    routineTemplate,
    exercise,
    knowledgeChunk,
    trainerLocation,
    trainerExpense,
    oneOffSale,
    auditLog,
    referral,
  };
}

function printSnapshot(label: string, snap: CountSnapshot): void {
  console.log(`\n[reset-clients] ${label}:`);
  const entries = Object.entries(snap) as Array<[keyof CountSnapshot, number]>;
  const maxLen = Math.max(...entries.map(([k]) => k.length));
  const preserved = new Set<keyof CountSnapshot>([
    "userTrainer",
    "userAdmin",
    "userSuperAdmin",
    "trainerProfile",
    "trainerSubscription",
    "subscriptionPlan",
    "routineTemplate",
    "exercise",
    "knowledgeChunk",
    "trainerLocation",
    "trainerExpense",
    "oneOffSale",
    "auditLog",
    "referral",
  ]);
  for (const [k, v] of entries) {
    const pad = " ".repeat(maxLen - k.length);
    const marker = preserved.has(k) ? " ← preserved" : "";
    console.log(`  ${k}${pad}  ${v.toString().padStart(7)}${marker}`);
  }
}

async function main(): Promise<void> {
  const confirm = process.env.CONFIRM?.trim();

  if (confirm !== REQUIRED_CONFIRM) {
    console.error(
      `[reset-clients] REFUSING TO RUN.\n  This script PERMANENTLY DELETES all CLIENT data.\n  Set CONFIRM=${REQUIRED_CONFIRM} to proceed.\n\n  Example:\n    CONFIRM=${REQUIRED_CONFIRM} pnpm db:reset-clients\n`,
    );
    process.exit(1);
  }

  console.log(
    "[reset-clients] ⚠️  Starting destructive client-only reset.\n" +
      "  All CLIENT users + their data will be deleted.\n" +
      "  Trainers, super-admins, subscription plans, exercise catalog and\n" +
      "  knowledge base are preserved.",
  );

  const before = await snapshotCounts();
  printSnapshot("Counts BEFORE", before);

  // Resolve the set of CLIENT user IDs once. We use it everywhere instead of
  // a nested `where: { user: { role: "CLIENT" } }` so each deleteMany stays
  // an indexed lookup on userId.
  const clientUsers = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: { id: true },
  });
  const clientIds = clientUsers.map((u) => u.id);

  console.log(
    `\n[reset-clients] Found ${clientIds.length} CLIENT user(s) (including soft-deleted).`,
  );

  if (clientIds.length === 0) {
    // Even with zero clients, we still flush pending invitations and onboarding
    // drafts — they represent client-creates-in-progress that the user wants
    // wiped per the "no queden perfiles ni creados" requirement.
    console.log(
      "[reset-clients] No CLIENT users to delete. Will still clear pending invitations and onboarding drafts.",
    );
  }

  // ── Delete in dependency order (leaves first, roots last) ─────────────────
  // Prisma deleteMany() inside a $transaction is atomic — if any step fails,
  // the whole reset is rolled back.

  console.log("\n[reset-clients] Deleting rows...");

  await prisma.$transaction([
    // 1. Workout execution leaves
    //    performedSet → cascade from workoutSession; routineComment → cascade
    //    from assignedRoutine. We delete the parents and let the cascades fire,
    //    but we also delete explicitly for any orphans (defensive).
    prisma.performedSet.deleteMany({
      where: { session: { clientUserId: { in: clientIds } } },
    }),
    prisma.workoutSession.deleteMany({
      where: { clientUserId: { in: clientIds } },
    }),
    prisma.routineComment.deleteMany({
      where: { assignedRoutine: { clientUserId: { in: clientIds } } },
    }),
    prisma.assignedRoutine.deleteMany({
      where: { clientUserId: { in: clientIds } },
    }),

    // 2. Body data
    prisma.progressPhoto.deleteMany({
      where: { clientUserId: { in: clientIds } },
    }),
    prisma.bodyMetric.deleteMany({
      where: { clientUserId: { in: clientIds } },
    }),
    prisma.medicalCondition.deleteMany({
      where: { clientUserId: { in: clientIds } },
    }),

    // 3. Assessment (parqAnswer cascades from assessment)
    prisma.parqAnswer.deleteMany({
      where: { assessment: { clientUserId: { in: clientIds } } },
    }),
    prisma.initialAssessment.deleteMany({
      where: { clientUserId: { in: clientIds } },
    }),

    // 4. Billing — invoice depends on charge
    prisma.invoice.deleteMany({
      where: { charge: { clientUserId: { in: clientIds } } },
    }),
    prisma.clientCharge.deleteMany({
      where: { clientUserId: { in: clientIds } },
    }),

    // 5. Linking — trainer↔client + pending creates
    prisma.trainerClient.deleteMany({
      where: { clientId: { in: clientIds } },
    }),
    // Invitations and OnboardingDrafts are wiped in full — they represent
    // pending client-creates regardless of which trainer owns them.
    prisma.onboardingDraft.deleteMany({}),
    prisma.invitation.deleteMany({}),

    // 6. Notifications + privacy
    prisma.notification.deleteMany({
      where: { userUserId: { in: clientIds } },
    }),
    prisma.lpdpRequest.deleteMany({
      where: { userId: { in: clientIds } },
    }),
    prisma.consent.deleteMany({
      where: { userId: { in: clientIds } },
    }),

    // 7. Profile + auth
    prisma.clientProfile.deleteMany({
      where: { userId: { in: clientIds } },
    }),
    prisma.account.deleteMany({
      where: { userId: { in: clientIds } },
    }),
    prisma.session.deleteMany({
      where: { userId: { in: clientIds } },
    }),

    // 8. Finally the CLIENT users themselves.
    //    These references stay alive thanks to onDelete: SetNull:
    //    - OneOffSale.clientUserId → NULL (preserves trainer income history)
    //    - AuditLog.actorUserId    → NULL (preserves audit trail)
    //    - Referral.referredUserId → NULL (preserves referral history)
    prisma.user.deleteMany({
      where: { role: "CLIENT" },
    }),
  ]);

  const after = await snapshotCounts();
  printSnapshot("Counts AFTER", after);

  console.log(
    "\n[reset-clients] ok  Client reset complete.\n" +
      "  Trainers and super-admin accounts are intact — you can keep using the\n" +
      "  app and onboard new clients from scratch.\n",
  );
}

main()
  .catch((err: unknown) => {
    console.error("\n[reset-clients] FAILED");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
