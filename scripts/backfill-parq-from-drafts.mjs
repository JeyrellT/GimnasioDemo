// =============================================================================
// Recupera PAR-Q de OnboardingDraft.dataJson y lo persiste en
// ClientProfile.parqStatus + ParqAnswer rows. Esta data se perdía hasta el fix
// en completeOnboarding — todo cliente onboardeado por wizard arrastra esto.
//
// Uso (dry-run por defecto):
//   node --env-file=.env.local scripts/backfill-parq-from-drafts.mjs
//
// Para aplicar cambios:
//   node --env-file=.env.local scripts/backfill-parq-from-drafts.mjs --apply
//
// Filtrar a un cliente específico (por email):
//   node --env-file=.env.local scripts/backfill-parq-from-drafts.mjs --email=jeyrell16@gmail.com --apply
// =============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const emailArg = args.find((a) => a.startsWith("--email="));
const EMAIL_FILTER = emailArg ? emailArg.slice("--email=".length).toLowerCase() : null;

const PARQ_STATUS_VALUES = new Set(["NOT_COMPLETED", "GREEN", "REVIEW", "RED"]);

function isParqStatus(v) {
  return typeof v === "string" && PARQ_STATUS_VALUES.has(v);
}

function isParqAnswersRecord(v) {
  if (!v || typeof v !== "object") return false;
  const entries = Object.entries(v);
  if (entries.length === 0) return false;
  return entries.every(([, val]) => val === "yes" || val === "no");
}

function buildParqAnswerRows(parqAnswers) {
  return Object.entries(parqAnswers).map(([questionCode, answer]) => ({
    questionCode,
    question: questionCode,
    answer: answer === "yes",
  }));
}

// Extrae step4 desde dataJson (formato {step4: {...}} producido por updateOnboardingStep).
function extractStep4(dataJson) {
  if (!dataJson || typeof dataJson !== "object") return null;
  const allData = {};
  for (const v of Object.values(dataJson)) {
    if (v && typeof v === "object") Object.assign(allData, v);
  }
  return allData;
}

const drafts = await prisma.onboardingDraft.findMany({
  where: {
    completedAt: { not: null },
    clientUserId: { not: null },
  },
  select: {
    id: true,
    clientUserId: true,
    completedAt: true,
    dataJson: true,
  },
});

console.log(`[backfill-parq] Drafts completados: ${drafts.length}`);

const stats = {
  scanned: 0,
  skippedNoStep4: 0,
  skippedAlreadySet: 0,
  skippedEmailFilter: 0,
  updated: 0,
  errors: 0,
};

for (const draft of drafts) {
  if (!draft.clientUserId) continue;
  stats.scanned++;

  const allData = extractStep4(draft.dataJson);
  if (!allData) {
    stats.skippedNoStep4++;
    continue;
  }

  const parqStatus = isParqStatus(allData["parqStatus"]) ? allData["parqStatus"] : null;
  const parqAnswers = isParqAnswersRecord(allData["parqAnswers"]) ? allData["parqAnswers"] : null;

  if (!parqStatus && !parqAnswers) {
    stats.skippedNoStep4++;
    continue;
  }

  const client = await prisma.user.findUnique({
    where: { id: draft.clientUserId },
    select: { id: true, email: true, name: true },
  });
  if (!client) continue;

  if (EMAIL_FILTER && client.email.toLowerCase() !== EMAIL_FILTER) {
    stats.skippedEmailFilter++;
    continue;
  }

  const profile = await prisma.clientProfile.findUnique({
    where: { userId: client.id },
    select: { parqStatus: true },
  });

  const assessment = await prisma.initialAssessment.findUnique({
    where: { clientUserId: client.id },
    select: { id: true },
  });

  const existingAnswerCount = assessment
    ? await prisma.parqAnswer.count({
        where: { assessmentId: assessment.id, deletedAt: null },
      })
    : 0;

  const needsProfileUpdate =
    parqStatus && profile && profile.parqStatus === "NOT_COMPLETED" && parqStatus !== "NOT_COMPLETED";
  const needsAnswersInsert = !!(parqAnswers && assessment && existingAnswerCount === 0);

  if (!needsProfileUpdate && !needsAnswersInsert) {
    stats.skippedAlreadySet++;
    continue;
  }

  console.log(
    `\n[${client.email}] cliente=${client.id} draft=${draft.id}`,
  );
  console.log(
    `  status actual=${profile?.parqStatus ?? "(sin profile)"} → ${parqStatus ?? "(sin status en draft)"}`,
  );
  console.log(
    `  answers actual=${existingAnswerCount} → ${parqAnswers ? Object.keys(parqAnswers).length : 0}` +
      (assessment ? "" : "  [SIN InitialAssessment — no se crean rows]"),
  );

  if (!APPLY) continue;

  try {
    await prisma.$transaction(async (tx) => {
      if (needsProfileUpdate) {
        await tx.clientProfile.update({
          where: { userId: client.id },
          data: { parqStatus },
        });
      }
      if (needsAnswersInsert) {
        const rows = buildParqAnswerRows(parqAnswers).map((r) => ({
          ...r,
          assessmentId: assessment.id,
        }));
        if (rows.length > 0) {
          await tx.parqAnswer.createMany({ data: rows });
        }
      }
    });
    stats.updated++;
    console.log(`  -> aplicado.`);
  } catch (err) {
    stats.errors++;
    console.error(`  -> ERROR:`, err.message);
  }
}

console.log("\n[backfill-parq] Resumen:");
console.log(stats);
if (!APPLY) {
  console.log("\n(dry-run) Pasá --apply para escribir.");
}
await prisma.$disconnect();
