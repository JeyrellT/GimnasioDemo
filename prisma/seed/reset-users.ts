// =============================================================================
// BLACKLINE FITNESS — DESTRUCTIVE: reset users + all their data
// Owner: backend-api.
//
// ⚠️  ESTE SCRIPT BORRA DATOS DE FORMA PERMANENTE.  ⚠️
//
// Vacía todas las tablas que contienen datos de usuarios y sus relaciones, para
// que la app vuelva a un estado "fresh install" donde podés registrar de cero
// un trainer / cliente / super-admin.
//
// Qué CONSERVA (catálogo seed, sin datos de cliente):
//   - Exercise donde createdById IS NULL (catálogo público del seed).
//   - _prisma_migrations (estado de la DB).
//
// Qué BORRA:
//   - User + Account + Session + VerificationToken + Consent.
//   - TrainerProfile + ClientProfile + TrainerClient + Invitation + OnboardingDraft.
//   - InitialAssessment + ParqAnswer + MedicalCondition + BodyMetric + ProgressPhoto.
//   - RoutineTemplate + RoutineDay + RoutineExercise + AssignedRoutine
//     + RoutineComment + WorkoutSession + PerformedSet + CustomGoal.
//   - TrainerSubscription + ClientCharge + Invoice + PaymentEvent.
//   - TrainerLocation + LocationVisit + TrainerExpense + OneOffSale.
//   - Referral + Notification + LpdpRequest + AuditLog.
//   - Exercise donde createdById IS NOT NULL (ejercicios custom de trainers).
//   - KnowledgeChunk (re-seedeable con `pnpm seed`).
//   - SubscriptionPlan (re-seedeable con `pnpm seed`).
//
// Tras el reset corré, en orden:
//   1. pnpm seed                  → re-puebla catálogos (Knowledge + SubscriptionPlan).
//   2. pnpm db:create-super-admin → crea tu primer SUPER_ADMIN.
//
// Confirmación obligatoria por env var (doble guard contra ejecución accidental):
//
//   CONFIRM=YES_DELETE_ALL_USERS \
//     pnpm db:reset-users
//
// Si CONFIRM no está set o no matchea exactamente, el script aborta sin tocar nada.
//
// Idempotencia: re-correrlo sobre una DB ya vacía es no-op (deleteMany sin filas
// no falla).
// =============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["warn", "error"] });

const REQUIRED_CONFIRM = "YES_DELETE_ALL_USERS";

interface CountSnapshot {
  user: number;
  trainerProfile: number;
  clientProfile: number;
  trainerSubscription: number;
  clientCharge: number;
  invoice: number;
  paymentEvent: number;
  trainerClient: number;
  invitation: number;
  onboardingDraft: number;
  initialAssessment: number;
  parqAnswer: number;
  medicalCondition: number;
  bodyMetric: number;
  progressPhoto: number;
  routineTemplate: number;
  routineDay: number;
  routineExercise: number;
  assignedRoutine: number;
  routineComment: number;
  workoutSession: number;
  performedSet: number;
  customGoal: number;
  trainerLocation: number;
  locationVisit: number;
  trainerExpense: number;
  oneOffSale: number;
  referral: number;
  notification: number;
  lpdpRequest: number;
  auditLog: number;
  consent: number;
  account: number;
  session: number;
  verificationToken: number;
  exerciseCustom: number; // Exercise con createdById != null
  exerciseSeed: number;   // Exercise del catálogo (preserva)
  knowledgeChunk: number;
  subscriptionPlan: number;
}

async function snapshotCounts(): Promise<CountSnapshot> {
  const [
    user,
    trainerProfile,
    clientProfile,
    trainerSubscription,
    clientCharge,
    invoice,
    paymentEvent,
    trainerClient,
    invitation,
    onboardingDraft,
    initialAssessment,
    parqAnswer,
    medicalCondition,
    bodyMetric,
    progressPhoto,
    routineTemplate,
    routineDay,
    routineExercise,
    assignedRoutine,
    routineComment,
    workoutSession,
    performedSet,
    customGoal,
    trainerLocation,
    locationVisit,
    trainerExpense,
    oneOffSale,
    referral,
    notification,
    lpdpRequest,
    auditLog,
    consent,
    account,
    session,
    verificationToken,
    exerciseCustom,
    exerciseSeed,
    knowledgeChunk,
    subscriptionPlan,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.trainerProfile.count(),
    prisma.clientProfile.count(),
    prisma.trainerSubscription.count(),
    prisma.clientCharge.count(),
    prisma.invoice.count(),
    prisma.paymentEvent.count(),
    prisma.trainerClient.count(),
    prisma.invitation.count(),
    prisma.onboardingDraft.count(),
    prisma.initialAssessment.count(),
    prisma.parqAnswer.count(),
    prisma.medicalCondition.count(),
    prisma.bodyMetric.count(),
    prisma.progressPhoto.count(),
    prisma.routineTemplate.count(),
    prisma.routineDay.count(),
    prisma.routineExercise.count(),
    prisma.assignedRoutine.count(),
    prisma.routineComment.count(),
    prisma.workoutSession.count(),
    prisma.performedSet.count(),
    prisma.customGoal.count(),
    prisma.trainerLocation.count(),
    prisma.locationVisit.count(),
    prisma.trainerExpense.count(),
    prisma.oneOffSale.count(),
    prisma.referral.count(),
    prisma.notification.count(),
    prisma.lpdpRequest.count(),
    prisma.auditLog.count(),
    prisma.consent.count(),
    prisma.account.count(),
    prisma.session.count(),
    prisma.verificationToken.count(),
    prisma.exercise.count({ where: { createdById: { not: null } } }),
    prisma.exercise.count({ where: { createdById: null } }),
    prisma.knowledgeChunk.count(),
    prisma.subscriptionPlan.count(),
  ]);

  return {
    user,
    trainerProfile,
    clientProfile,
    trainerSubscription,
    clientCharge,
    invoice,
    paymentEvent,
    trainerClient,
    invitation,
    onboardingDraft,
    initialAssessment,
    parqAnswer,
    medicalCondition,
    bodyMetric,
    progressPhoto,
    routineTemplate,
    routineDay,
    routineExercise,
    assignedRoutine,
    routineComment,
    workoutSession,
    performedSet,
    customGoal,
    trainerLocation,
    locationVisit,
    trainerExpense,
    oneOffSale,
    referral,
    notification,
    lpdpRequest,
    auditLog,
    consent,
    account,
    session,
    verificationToken,
    exerciseCustom,
    exerciseSeed,
    knowledgeChunk,
    subscriptionPlan,
  };
}

function printSnapshot(label: string, snap: CountSnapshot): void {
  console.log(`\n[reset-users] ${label}:`);
  const entries = Object.entries(snap) as Array<[keyof CountSnapshot, number]>;
  const maxLen = Math.max(...entries.map(([k]) => k.length));
  for (const [k, v] of entries) {
    const pad = " ".repeat(maxLen - k.length);
    const marker = k === "exerciseSeed" ? " ← preserved" : "";
    console.log(`  ${k}${pad}  ${v.toString().padStart(7)}${marker}`);
  }
}

async function main(): Promise<void> {
  const confirm = process.env.CONFIRM?.trim();

  if (confirm !== REQUIRED_CONFIRM) {
    console.error(
      `[reset-users] REFUSING TO RUN.\n  This script PERMANENTLY DELETES all user data.\n  Set CONFIRM=${REQUIRED_CONFIRM} to proceed.\n\n  Example:\n    CONFIRM=${REQUIRED_CONFIRM} pnpm db:reset-users\n`,
    );
    process.exit(1);
  }

  console.log(
    "[reset-users] ⚠️  Starting destructive reset.\n" +
      "  All users + their data will be deleted.\n" +
      "  Only the seed exercise catalog (createdById = null) is preserved.",
  );

  const before = await snapshotCounts();
  printSnapshot("Counts BEFORE", before);

  // ── Delete in dependency order (leaves first, roots last) ─────────────────
  // Prisma deleteMany() inside a $transaction is atomic — if any step fails,
  // the whole reset is rolled back.

  console.log("\n[reset-users] Deleting rows...");

  await prisma.$transaction([
    // 1. Workout execution leaves
    prisma.performedSet.deleteMany({}),
    prisma.routineComment.deleteMany({}),
    prisma.workoutSession.deleteMany({}),
    prisma.assignedRoutine.deleteMany({}),

    // 2. Routine authoring leaves → root
    prisma.routineExercise.deleteMany({}),
    prisma.routineDay.deleteMany({}),
    prisma.routineTemplate.deleteMany({}),
    prisma.customGoal.deleteMany({}),

    // 3. Billing chain
    prisma.invoice.deleteMany({}),
    prisma.clientCharge.deleteMany({}),
    prisma.trainerSubscription.deleteMany({}),
    prisma.paymentEvent.deleteMany({}),

    // 4. Finance
    prisma.oneOffSale.deleteMany({}),
    prisma.trainerExpense.deleteMany({}),
    prisma.locationVisit.deleteMany({}),
    prisma.trainerLocation.deleteMany({}),

    // 5. Body data
    prisma.progressPhoto.deleteMany({}),
    prisma.bodyMetric.deleteMany({}),
    prisma.medicalCondition.deleteMany({}),
    prisma.parqAnswer.deleteMany({}),
    prisma.initialAssessment.deleteMany({}),

    // 6. Onboarding / linking
    prisma.onboardingDraft.deleteMany({}),
    prisma.invitation.deleteMany({}),
    prisma.trainerClient.deleteMany({}),
    prisma.referral.deleteMany({}),

    // 7. Notifications / privacy / audit
    prisma.notification.deleteMany({}),
    prisma.lpdpRequest.deleteMany({}),
    prisma.auditLog.deleteMany({}),
    prisma.consent.deleteMany({}),

    // 8. Profiles + auth
    prisma.trainerProfile.deleteMany({}),
    prisma.clientProfile.deleteMany({}),
    prisma.account.deleteMany({}),
    prisma.session.deleteMany({}),
    prisma.verificationToken.deleteMany({}),

    // 9. User custom exercises (preserve seed: createdById = null)
    prisma.exercise.deleteMany({ where: { createdById: { not: null } } }),

    // 10. Re-seedable catalogs
    prisma.knowledgeChunk.deleteMany({}),
    prisma.subscriptionPlan.deleteMany({}),

    // 11. Finally the users themselves
    prisma.user.deleteMany({}),
  ]);

  const after = await snapshotCounts();
  printSnapshot("Counts AFTER", after);

  console.log(
    "\n[reset-users] ok  Reset complete.\n" +
      "  Next steps:\n" +
      "    1. pnpm seed                  # re-populate catálogos (Knowledge, SubscriptionPlan)\n" +
      "    2. pnpm db:create-super-admin # crear tu SUPER_ADMIN\n",
  );
}

main()
  .catch((err: unknown) => {
    console.error("\n[reset-users] FAILED");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
