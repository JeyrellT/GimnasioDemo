"use server";

// =============================================================================
// BLACKLINE FITNESS — Server Actions: Client Portal (client-facing reads + metric write)
// Owner: backend-api.
//
// All actions use requireClient() — only authenticated users with a CLIENT role
// and a ClientProfile can call these. Data is scoped to the calling user's id;
// there is no trainer-proxy path here.
//
// Soft-delete: all queries filter `deletedAt: null` (auto-injected by `prisma`
// singleton extension for findMany/findFirst/findUnique, explicit for mutations).
//
// Decimal → number: Prisma returns Decimal objects for columns declared
// `Decimal` in the schema. Every such field is cast with `.toNumber()` before
// returning so client pages receive plain numbers without Prisma types.
// =============================================================================

import { prisma } from "@/server/db";
import { requireClient } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { logInfo } from "@/lib/logger";
import { deriveVideoThumbnail, toClientMediaUrl } from "@/lib/media/video-url";
import type { ActionResult } from "@/types/api";

// =============================================================================
// Local return types
// =============================================================================

export interface MyTrainerInfo {
  trainerId: string;
  trainerName: string;
  trainerEmail: string;
  trainerAvatar: string | null;
  tradeName: string;
  specialty: string;
  bio: string;
  status: string;
  startedAt: Date;
  monthlyPriceCRC: number | null;
}

export interface MyAssignedRoutine {
  id: string;
  routineTemplateId: string;
  // snapshotJson is already parsed JSON from Prisma — returned as-is.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshotJson: any;
  assignedAt: Date;
  startsOn: Date;
  endsOn: Date | null;
  status: string;
  trainerNotes: string | null;
}

export interface MySessionSummary {
  id: string;
  assignedRoutineId: string | null;
  dayIndex: number | null;
  startedAt: Date;
  completedAt: Date | null;
  totalDurationSec: number | null;
  isFreeWorkout: boolean;
  _count: { performedSets: number };
}

export interface PerformedSetDetail {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  restTakenSec: number | null;
  isWarmup: boolean;
  isPr: boolean;
  failed: boolean;
  notes: string | null;
  exercise: {
    id: string;
    nameEs: string;
    nameEn: string | null;
    primaryMuscle: string;
    equipment: string;
    slug: string;
    thumbnailUrl: string | null;
  };
}

export interface MySessionDetail {
  id: string;
  clientUserId: string;
  assignedRoutineId: string | null;
  dayIndex: number | null;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  totalDurationSec: number | null;
  bodyweightKg: number | null;
  subjectiveFatigue: number | null;
  notes: string | null;
  isFreeWorkout: boolean;
  performedSets: PerformedSetDetail[];
}

export interface MyBodyMetric {
  id: string;
  clientUserId: string;
  recordedAt: Date;

  // Composición
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  visceralFat: number | null;
  basalMetabolicRate: number | null;

  // Tronco
  neckCm: number | null;
  shoulderLeftCm: number | null;
  shoulderRightCm: number | null;
  chestCm: number | null;
  abdomenCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  gluteLeftCm: number | null;
  gluteRightCm: number | null;

  // Brazos
  /** Legacy single-arm value. Espejado desde bicepLeft/bicepRight. */
  armCm: number | null;
  bicepLeftCm: number | null;
  bicepRightCm: number | null;
  forearmLeftCm: number | null;
  forearmRightCm: number | null;

  // Piernas
  /** Legacy single-thigh value. Espejado desde quadLeft/quadRight. */
  thighCm: number | null;
  quadLeftCm: number | null;
  quadRightCm: number | null;
  hamstringLeftCm: number | null;
  hamstringRightCm: number | null;
  calfLeftCm: number | null;
  calfRightCm: number | null;

  source: string;
  notes: string | null;
}

export interface RecordBodyMetricInput {
  // Composición
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  visceralFat?: number;
  basalMetabolicRate?: number;

  // Tronco
  neckCm?: number;
  shoulderLeftCm?: number;
  shoulderRightCm?: number;
  chestCm?: number;
  abdomenCm?: number;
  waistCm?: number;
  hipCm?: number;
  gluteLeftCm?: number;
  gluteRightCm?: number;

  // Brazos
  /** Legacy. Si no se envía pero llegan bicepLeft/Right, se espeja. */
  armCm?: number;
  bicepLeftCm?: number;
  bicepRightCm?: number;
  forearmLeftCm?: number;
  forearmRightCm?: number;

  // Piernas
  /** Legacy. Si no se envía pero llegan quadLeft/Right, se espeja. */
  thighCm?: number;
  quadLeftCm?: number;
  quadRightCm?: number;
  hamstringLeftCm?: number;
  hamstringRightCm?: number;
  calfLeftCm?: number;
  calfRightCm?: number;

  notes?: string;
}

// =============================================================================
// 1. getMyTrainerInfo
// =============================================================================

/**
 * Return the active trainer linked to the calling client.
 * Returns null (not an error) when no ACTIVE TrainerClient link exists.
 */
export async function getMyTrainerInfo(): Promise<ActionResult<MyTrainerInfo | null>> {
  return tryCatch(async () => {
    const user = await requireClient();

    const link = await prisma.trainerClient.findFirst({
      where: {
        clientId: user.id,
        status: "ACTIVE",
        deletedAt: null,
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            trainerProfile: {
              select: {
                tradeName: true,
                specialty: true,
                bio: true,
              },
            },
          },
        },
      },
    });

    if (!link) {
      return null;
    }

    const { trainer } = link;

    // TrainerProfile is required for a trainer, but guard defensively.
    if (!trainer.trainerProfile) {
      return null;
    }

    return {
      trainerId: trainer.id,
      trainerName: trainer.name,
      trainerEmail: trainer.email,
      trainerAvatar: trainer.avatarUrl,
      tradeName: trainer.trainerProfile.tradeName,
      specialty: trainer.trainerProfile.specialty,
      bio: trainer.trainerProfile.bio,
      status: link.status,
      startedAt: link.startedAt,
      monthlyPriceCRC: link.monthlyPriceCRC ? Number(link.monthlyPriceCRC) : null,
    };
  });
}

// =============================================================================
// Snapshot media enrichment
//
// Routine snapshots freeze the prescription (sets/reps/rest) but media URLs
// live on the shared Exercise catalog and can be edited by the trainer after
// the routine was assigned. We overlay the live `mediaUrl` / `gifUrl` /
// `thumbnailUrl` on each snapshot exercise so the client immediately sees the
// trainer's latest video without needing the routine to be re-assigned.
// =============================================================================

/**
 * Walk every exercise in a snapshot JSON, collect their exerciseIds, fetch
 * the live media columns from Exercise + the assigning trainer's per-exercise
 * overrides (TrainerExerciseMedia), and overlay them onto the snapshot.
 *
 * Resolution order (highest precedence first):
 *   1. Per-routine snapshot value (RoutineExercise.mediaUrl, frozen)
 *   2. Per-trainer override (TrainerExerciseMedia, by `trainerUserId`)
 *   3. Catalog default (Exercise.mediaUrl)
 *
 * `trainerUserId` is the coach who assigned the routine; when null we skip
 * step 2 (older callers / edge cases).
 */
async function overlayExerciseMedia(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshotJson: any,
  trainerUserId: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (!snapshotJson || typeof snapshotJson !== "object") return snapshotJson;
  const days = Array.isArray(snapshotJson.days) ? snapshotJson.days : [];
  const ids = new Set<string>();
  for (const day of days) {
    const exercises = Array.isArray(day?.exercises) ? day.exercises : [];
    for (const ex of exercises) {
      if (typeof ex?.exerciseId === "string") ids.add(ex.exerciseId);
    }
  }
  if (ids.size === 0) return snapshotJson;

  const idList = [...ids];
  const [rows, overrideRows] = await Promise.all([
    prisma.exercise.findMany({
      where: { id: { in: idList }, deletedAt: null },
      select: { id: true, mediaUrl: true, gifUrl: true, thumbnailUrl: true },
    }),
    trainerUserId
      ? prisma.trainerExerciseMedia.findMany({
          where: {
            trainerUserId,
            exerciseId: { in: idList },
            deletedAt: null,
          },
          select: { exerciseId: true, mediaUrl: true },
        })
      : Promise.resolve([] as Array<{ exerciseId: string; mediaUrl: string }>),
  ]);
  const live = new Map(rows.map((r) => [r.id, r]));
  const overrides = new Map(overrideRows.map((r) => [r.exerciseId, r.mediaUrl]));

  return {
    ...snapshotJson,
    days: days.map((day: unknown) => {
      const d = day as { exercises?: unknown[] };
      const exercises = Array.isArray(d.exercises) ? d.exercises : [];
      return {
        ...(day as object),
        exercises: exercises.map((ex) => {
          const e = ex as { exerciseId?: string };
          const liveRow = e.exerciseId ? live.get(e.exerciseId) : null;
          if (!liveRow) return ex;
          const snap = ex as {
            mediaUrl?: string | null;
            gifUrl?: string | null;
            thumbnailUrl?: string | null;
          };
          const overrideMediaUrl = e.exerciseId ? overrides.get(e.exerciseId) ?? null : null;
          // Snapshot (per-routine) > trainer override > catalog default.
          const effectiveMediaUrl =
            snap.mediaUrl ?? overrideMediaUrl ?? liveRow.mediaUrl ?? null;
          // Derive a thumb from the effective video URL so the player and
          // "next exercise" preview show the Drive/YouTube poster instead of
          // the frozen seed image.
          const derivedThumb = deriveVideoThumbnail(effectiveMediaUrl);
          return {
            ...(ex as object),
            // Drive URLs are rewritten to /api/exercise/{id}/video so the
            // client player never sees a Drive ID; backend proxies on demand.
            mediaUrl: toClientMediaUrl(effectiveMediaUrl, e.exerciseId ?? null),
            gifUrl: snap.gifUrl ?? liveRow.gifUrl ?? null,
            thumbnailUrl:
              derivedThumb ?? snap.thumbnailUrl ?? liveRow.thumbnailUrl ?? null,
          };
        }),
      };
    }),
  };
}

// =============================================================================
// 2. getMyAssignedRoutines
// =============================================================================

/**
 * Return all assigned routines for the calling client (not soft-deleted).
 * Ordered: ACTIVE first (ASC on enum string), then by assignedAt DESC.
 */
export async function getMyAssignedRoutines(): Promise<ActionResult<MyAssignedRoutine[]>> {
  return tryCatch(async () => {
    const user = await requireClient();

    const rows = await prisma.assignedRoutine.findMany({
      where: {
        clientUserId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        routineTemplateId: true,
        snapshotJson: true,
        assignedAt: true,
        startsOn: true,
        endsOn: true,
        status: true,
        trainerNotes: true,
        routineTemplate: { select: { trainerId: true } },
      },
      orderBy: [
        { status: "asc" },
        { assignedAt: "desc" },
      ],
    });

    const enriched = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        routineTemplateId: r.routineTemplateId,
        snapshotJson: await overlayExerciseMedia(
          r.snapshotJson,
          r.routineTemplate?.trainerId ?? null,
        ),
        assignedAt: r.assignedAt,
        startsOn: r.startsOn,
        endsOn: r.endsOn,
        status: r.status,
        trainerNotes: r.trainerNotes,
      })),
    );
    return enriched;
  });
}

// =============================================================================
// 3. getMyActiveRoutine
// =============================================================================

/**
 * Return the first ACTIVE assigned routine for the calling client, or null.
 * Uses assignedAt DESC as tiebreaker (should be at most one ACTIVE per client
 * after the assign action cancels previous ones, but defensive ordering is safe).
 */
export async function getMyActiveRoutine(): Promise<ActionResult<MyAssignedRoutine | null>> {
  return tryCatch(async () => {
    const user = await requireClient();

    const row = await prisma.assignedRoutine.findFirst({
      where: {
        clientUserId: user.id,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: {
        id: true,
        routineTemplateId: true,
        snapshotJson: true,
        assignedAt: true,
        startsOn: true,
        endsOn: true,
        status: true,
        trainerNotes: true,
        routineTemplate: { select: { trainerId: true } },
      },
      orderBy: { assignedAt: "desc" },
    });

    if (!row) return null;

    return {
      id: row.id,
      routineTemplateId: row.routineTemplateId,
      snapshotJson: await overlayExerciseMedia(
        row.snapshotJson,
        row.routineTemplate?.trainerId ?? null,
      ),
      assignedAt: row.assignedAt,
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      status: row.status,
      trainerNotes: row.trainerNotes,
    };
  });
}

// =============================================================================
// 4. getMySessionHistory
// =============================================================================

/**
 * Return the last 50 completed workout sessions for the calling client.
 * Includes the count of performed sets per session.
 */
export async function getMySessionHistory(): Promise<ActionResult<MySessionSummary[]>> {
  return tryCatch(async () => {
    const user = await requireClient();

    const rows = await prisma.workoutSession.findMany({
      where: {
        clientUserId: user.id,
        status: "COMPLETED",
        deletedAt: null,
      },
      select: {
        id: true,
        assignedRoutineId: true,
        dayIndex: true,
        startedAt: true,
        completedAt: true,
        totalDurationSec: true,
        isFreeWorkout: true,
        _count: {
          select: { performedSets: true },
        },
      },
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    return rows.map((r) => ({
      id: r.id,
      assignedRoutineId: r.assignedRoutineId,
      dayIndex: r.dayIndex,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      totalDurationSec: r.totalDurationSec,
      isFreeWorkout: r.isFreeWorkout,
      _count: { performedSets: r._count.performedSets },
    }));
  });
}

// =============================================================================
// 5. getSessionDetail
// =============================================================================

/**
 * Return a single completed (or any status) workout session with all performed
 * sets and exercise info. Throws NotFoundError when not found or not owned by
 * the calling client.
 */
export async function getSessionDetail(
  sessionId: string,
): Promise<ActionResult<MySessionDetail>> {
  return tryCatch(async () => {
    const user = await requireClient();

    const session = await prisma.workoutSession.findUnique({
      where: {
        id: sessionId,
        clientUserId: user.id,
        deletedAt: null,
      },
      include: {
        performedSets: {
          where: { deletedAt: null },
          include: {
            exercise: {
              select: {
                id: true,
                nameEs: true,
                nameEn: true,
                primaryMuscle: true,
                equipment: true,
                slug: true,
                thumbnailUrl: true,
              },
            },
          },
          orderBy: { setNumber: "asc" },
        },
      },
    });

    if (!session) {
      throw new NotFoundError(
        "SESSION_NOT_FOUND",
        "Sesión de entrenamiento no encontrada.",
      );
    }

    const sets: PerformedSetDetail[] = session.performedSets.map((s) => ({
      id: s.id,
      sessionId: s.sessionId,
      exerciseId: s.exerciseId,
      setNumber: s.setNumber,
      weightKg: s.weightKg !== null ? Number(s.weightKg) : null,
      reps: s.reps,
      rpe: s.rpe !== null ? Number(s.rpe) : null,
      restTakenSec: s.restTakenSec,
      isWarmup: s.isWarmup,
      isPr: s.isPr,
      failed: s.failed,
      notes: s.notes,
      exercise: {
        id: s.exercise.id,
        nameEs: s.exercise.nameEs,
        nameEn: s.exercise.nameEn || null,
        primaryMuscle: s.exercise.primaryMuscle,
        equipment: s.exercise.equipment,
        slug: s.exercise.slug,
        thumbnailUrl: s.exercise.thumbnailUrl,
      },
    }));

    return {
      id: session.id,
      clientUserId: session.clientUserId,
      assignedRoutineId: session.assignedRoutineId,
      dayIndex: session.dayIndex,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      totalDurationSec: session.totalDurationSec,
      bodyweightKg: session.bodyweightKg !== null ? Number(session.bodyweightKg) : null,
      subjectiveFatigue: session.subjectiveFatigue,
      notes: session.notes,
      isFreeWorkout: session.isFreeWorkout,
      performedSets: sets,
    };
  });
}

// =============================================================================
// 6. getMyMetrics — shared select + mapper
// =============================================================================

/**
 * Columnas seleccionadas para los reads de BodyMetric expuestos al cliente.
 * Centralizado para que `getMyMetrics` y `recordBodyMetric` devuelvan
 * exactamente el mismo shape.
 */
const BODY_METRIC_SELECT = {
  id: true,
  clientUserId: true,
  recordedAt: true,

  // Composición
  weightKg: true,
  bodyFatPct: true,
  muscleMassKg: true,
  visceralFat: true,
  basalMetabolicRate: true,

  // Tronco
  neckCm: true,
  shoulderLeftCm: true,
  shoulderRightCm: true,
  chestCm: true,
  abdomenCm: true,
  waistCm: true,
  hipCm: true,
  gluteLeftCm: true,
  gluteRightCm: true,

  // Brazos
  armCm: true,
  bicepLeftCm: true,
  bicepRightCm: true,
  forearmLeftCm: true,
  forearmRightCm: true,

  // Piernas
  thighCm: true,
  quadLeftCm: true,
  quadRightCm: true,
  hamstringLeftCm: true,
  hamstringRightCm: true,
  calfLeftCm: true,
  calfRightCm: true,

  source: true,
  notes: true,
} as const;

type BodyMetricRow = {
  id: string;
  clientUserId: string;
  recordedAt: Date;
  weightKg: import("@prisma/client/runtime/library").Decimal | null;
  bodyFatPct: import("@prisma/client/runtime/library").Decimal | null;
  muscleMassKg: import("@prisma/client/runtime/library").Decimal | null;
  visceralFat: number | null;
  basalMetabolicRate: number | null;
  neckCm: import("@prisma/client/runtime/library").Decimal | null;
  shoulderLeftCm: import("@prisma/client/runtime/library").Decimal | null;
  shoulderRightCm: import("@prisma/client/runtime/library").Decimal | null;
  chestCm: import("@prisma/client/runtime/library").Decimal | null;
  abdomenCm: import("@prisma/client/runtime/library").Decimal | null;
  waistCm: import("@prisma/client/runtime/library").Decimal | null;
  hipCm: import("@prisma/client/runtime/library").Decimal | null;
  gluteLeftCm: import("@prisma/client/runtime/library").Decimal | null;
  gluteRightCm: import("@prisma/client/runtime/library").Decimal | null;
  armCm: import("@prisma/client/runtime/library").Decimal | null;
  bicepLeftCm: import("@prisma/client/runtime/library").Decimal | null;
  bicepRightCm: import("@prisma/client/runtime/library").Decimal | null;
  forearmLeftCm: import("@prisma/client/runtime/library").Decimal | null;
  forearmRightCm: import("@prisma/client/runtime/library").Decimal | null;
  thighCm: import("@prisma/client/runtime/library").Decimal | null;
  quadLeftCm: import("@prisma/client/runtime/library").Decimal | null;
  quadRightCm: import("@prisma/client/runtime/library").Decimal | null;
  hamstringLeftCm: import("@prisma/client/runtime/library").Decimal | null;
  hamstringRightCm: import("@prisma/client/runtime/library").Decimal | null;
  calfLeftCm: import("@prisma/client/runtime/library").Decimal | null;
  calfRightCm: import("@prisma/client/runtime/library").Decimal | null;
  source: string;
  notes: string | null;
};

function mapBodyMetricRow(r: BodyMetricRow): MyBodyMetric {
  const dec = (v: BodyMetricRow["weightKg"]) => (v !== null ? Number(v) : null);
  return {
    id: r.id,
    clientUserId: r.clientUserId,
    recordedAt: r.recordedAt,

    // Composición
    weightKg: dec(r.weightKg),
    bodyFatPct: dec(r.bodyFatPct),
    muscleMassKg: dec(r.muscleMassKg),
    visceralFat: r.visceralFat,
    basalMetabolicRate: r.basalMetabolicRate,

    // Tronco
    neckCm: dec(r.neckCm),
    shoulderLeftCm: dec(r.shoulderLeftCm),
    shoulderRightCm: dec(r.shoulderRightCm),
    chestCm: dec(r.chestCm),
    abdomenCm: dec(r.abdomenCm),
    waistCm: dec(r.waistCm),
    hipCm: dec(r.hipCm),
    gluteLeftCm: dec(r.gluteLeftCm),
    gluteRightCm: dec(r.gluteRightCm),

    // Brazos
    armCm: dec(r.armCm),
    bicepLeftCm: dec(r.bicepLeftCm),
    bicepRightCm: dec(r.bicepRightCm),
    forearmLeftCm: dec(r.forearmLeftCm),
    forearmRightCm: dec(r.forearmRightCm),

    // Piernas
    thighCm: dec(r.thighCm),
    quadLeftCm: dec(r.quadLeftCm),
    quadRightCm: dec(r.quadRightCm),
    hamstringLeftCm: dec(r.hamstringLeftCm),
    hamstringRightCm: dec(r.hamstringRightCm),
    calfLeftCm: dec(r.calfLeftCm),
    calfRightCm: dec(r.calfRightCm),

    source: r.source,
    notes: r.notes,
  };
}

/**
 * Return the last 100 body metric records for the calling client,
 * ordered by recordedAt DESC. All Decimal fields are cast to number.
 */
export async function getMyMetrics(): Promise<ActionResult<MyBodyMetric[]>> {
  return tryCatch(async () => {
    const user = await requireClient();

    const rows = await prisma.bodyMetric.findMany({
      where: {
        clientUserId: user.id,
        deletedAt: null,
      },
      select: BODY_METRIC_SELECT,
      orderBy: { recordedAt: "desc" },
      take: 100,
    });

    return rows.map(mapBodyMetricRow);
  });
}

// =============================================================================
// 7. recordBodyMetric
// =============================================================================

/**
 * Create a new BodyMetric record for the calling client.
 * At least one measurement field must be provided.
 * Returns the created record with all Decimal fields cast to number.
 */
export async function recordBodyMetric(
  input: RecordBodyMetricInput,
): Promise<ActionResult<MyBodyMetric>> {
  return tryCatch(async () => {
    const user = await requireClient();

    // ── Rate limits: max 4/month, max 1/week ──────────────────────────
    const MONTHLY_LIMIT = 4;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const countThisMonth = await prisma.bodyMetric.count({
      where: {
        clientUserId: user.id,
        recordedAt: { gte: monthStart, lt: monthEnd },
      },
    });

    if (countThisMonth >= MONTHLY_LIMIT) {
      throw new ValidationError(
        "MONTHLY_LIMIT_REACHED",
        `Ya registraste ${MONTHLY_LIMIT} mediciones este mes. Podrás agregar más el próximo mes.`,
      );
    }

    // Weekly limit: 1 per calendar week (Mon–Sun)
    const day = now.getDay(); // 0=Sun … 6=Sat
    const diffToMonday = day === 0 ? 6 : day - 1;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const countThisWeek = await prisma.bodyMetric.count({
      where: {
        clientUserId: user.id,
        recordedAt: { gte: weekStart, lt: weekEnd },
      },
    });

    if (countThisWeek >= 1) {
      throw new ValidationError(
        "WEEKLY_LIMIT_REACHED",
        "Ya registraste una medición esta semana. Podrás agregar otra la próxima semana.",
      );
    }

    // Validate: at least one numeric measurement must be present and finite.
    const measurementKeys: (keyof RecordBodyMetricInput)[] = [
      // Composición
      "weightKg",
      "bodyFatPct",
      "muscleMassKg",
      "visceralFat",
      "basalMetabolicRate",
      // Tronco
      "neckCm",
      "shoulderLeftCm",
      "shoulderRightCm",
      "chestCm",
      "abdomenCm",
      "waistCm",
      "hipCm",
      "gluteLeftCm",
      "gluteRightCm",
      // Brazos
      "armCm",
      "bicepLeftCm",
      "bicepRightCm",
      "forearmLeftCm",
      "forearmRightCm",
      // Piernas
      "thighCm",
      "quadLeftCm",
      "quadRightCm",
      "hamstringLeftCm",
      "hamstringRightCm",
      "calfLeftCm",
      "calfRightCm",
    ];

    const hasMeasurement = measurementKeys.some(
      (key) => input[key] !== undefined && input[key] !== null && Number.isFinite(input[key]),
    );

    if (!hasMeasurement) {
      throw new ValidationError(
        "NO_MEASUREMENT",
        "Debés ingresar al menos una medición (peso, % grasa, circunferencia, etc.).",
      );
    }

    // Mirror rule: si vienen los pares lateralizados, también escribimos la
    // columna legacy (armCm / thighCm) para que readers viejos sigan
    // funcionando. Preferencia explícita > L > R.
    const armMirror = input.armCm ?? input.bicepLeftCm ?? input.bicepRightCm;
    const thighMirror = input.thighCm ?? input.quadLeftCm ?? input.quadRightCm;

    const created = await prisma.bodyMetric.create({
      data: {
        clientUserId: user.id,
        source: "MANUAL",

        // Composición
        ...(input.weightKg !== undefined && { weightKg: input.weightKg }),
        ...(input.bodyFatPct !== undefined && { bodyFatPct: input.bodyFatPct }),
        ...(input.muscleMassKg !== undefined && { muscleMassKg: input.muscleMassKg }),
        ...(input.visceralFat !== undefined && { visceralFat: input.visceralFat }),
        ...(input.basalMetabolicRate !== undefined && {
          basalMetabolicRate: input.basalMetabolicRate,
        }),

        // Tronco
        ...(input.neckCm !== undefined && { neckCm: input.neckCm }),
        ...(input.shoulderLeftCm !== undefined && {
          shoulderLeftCm: input.shoulderLeftCm,
        }),
        ...(input.shoulderRightCm !== undefined && {
          shoulderRightCm: input.shoulderRightCm,
        }),
        ...(input.chestCm !== undefined && { chestCm: input.chestCm }),
        ...(input.abdomenCm !== undefined && { abdomenCm: input.abdomenCm }),
        ...(input.waistCm !== undefined && { waistCm: input.waistCm }),
        ...(input.hipCm !== undefined && { hipCm: input.hipCm }),
        ...(input.gluteLeftCm !== undefined && { gluteLeftCm: input.gluteLeftCm }),
        ...(input.gluteRightCm !== undefined && {
          gluteRightCm: input.gluteRightCm,
        }),

        // Brazos — bicep L/R + espejo a armCm legacy
        ...(input.bicepLeftCm !== undefined && { bicepLeftCm: input.bicepLeftCm }),
        ...(input.bicepRightCm !== undefined && {
          bicepRightCm: input.bicepRightCm,
        }),
        ...(armMirror !== undefined && { armCm: armMirror }),
        ...(input.forearmLeftCm !== undefined && {
          forearmLeftCm: input.forearmLeftCm,
        }),
        ...(input.forearmRightCm !== undefined && {
          forearmRightCm: input.forearmRightCm,
        }),

        // Piernas — quad L/R + espejo a thighCm legacy
        ...(input.quadLeftCm !== undefined && { quadLeftCm: input.quadLeftCm }),
        ...(input.quadRightCm !== undefined && {
          quadRightCm: input.quadRightCm,
        }),
        ...(thighMirror !== undefined && { thighCm: thighMirror }),
        ...(input.hamstringLeftCm !== undefined && {
          hamstringLeftCm: input.hamstringLeftCm,
        }),
        ...(input.hamstringRightCm !== undefined && {
          hamstringRightCm: input.hamstringRightCm,
        }),
        ...(input.calfLeftCm !== undefined && { calfLeftCm: input.calfLeftCm }),
        ...(input.calfRightCm !== undefined && { calfRightCm: input.calfRightCm }),

        ...(input.notes !== undefined && { notes: input.notes }),
      },
      select: BODY_METRIC_SELECT,
    });

    logInfo("client-portal.recordBodyMetric", {
      userId: user.id,
      metricId: created.id,
    });

    return mapBodyMetricRow(created);
  });
}

// =============================================================================
// 8. getMonthlyMeasurementQuota
// =============================================================================

export interface MeasurementQuota {
  used: number;
  limit: number;
  remaining: number;
  canRecord: boolean;
  /** true when the client already recorded one this week */
  weeklyUsed: boolean;
  /** Human-readable reason when canRecord is false */
  reason: string | null;
}

/**
 * Returns how many measurements the client has used this month vs the limit,
 * plus whether they already used this week's slot.
 */
export async function getMonthlyMeasurementQuota(): Promise<
  ActionResult<MeasurementQuota>
> {
  return tryCatch(async () => {
    const user = await requireClient();

    const MONTHLY_LIMIT = 4;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const used = await prisma.bodyMetric.count({
      where: {
        clientUserId: user.id,
        recordedAt: { gte: monthStart, lt: monthEnd },
      },
    });

    // Weekly check (Mon–Sun)
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const countThisWeek = await prisma.bodyMetric.count({
      where: {
        clientUserId: user.id,
        recordedAt: { gte: weekStart, lt: weekEnd },
      },
    });

    const remaining = Math.max(0, MONTHLY_LIMIT - used);
    const weeklyUsed = countThisWeek >= 1;
    const canRecord = remaining > 0 && !weeklyUsed;

    let reason: string | null = null;
    if (remaining <= 0) {
      reason = `Alcanzaste el límite de ${MONTHLY_LIMIT} mediciones este mes.`;
    } else if (weeklyUsed) {
      reason = "Ya registraste tu medición de esta semana. Volvé la próxima.";
    }

    return {
      used,
      limit: MONTHLY_LIMIT,
      remaining,
      canRecord,
      weeklyUsed,
      reason,
    };
  });
}
