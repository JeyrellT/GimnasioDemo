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
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  waistCm: number | null;
  hipCm: number | null;
  neckCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  source: string;
  notes: string | null;
}

export interface RecordBodyMetricInput {
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  waistCm?: number;
  hipCm?: number;
  neckCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
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
      },
      orderBy: [
        { status: "asc" },
        { assignedAt: "desc" },
      ],
    });

    return rows.map((r) => ({
      id: r.id,
      routineTemplateId: r.routineTemplateId,
      snapshotJson: r.snapshotJson,
      assignedAt: r.assignedAt,
      startsOn: r.startsOn,
      endsOn: r.endsOn,
      status: r.status,
      trainerNotes: r.trainerNotes,
    }));
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
      },
      orderBy: { assignedAt: "desc" },
    });

    if (!row) return null;

    return {
      id: row.id,
      routineTemplateId: row.routineTemplateId,
      snapshotJson: row.snapshotJson,
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
// 6. getMyMetrics
// =============================================================================

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
      select: {
        id: true,
        clientUserId: true,
        recordedAt: true,
        weightKg: true,
        bodyFatPct: true,
        muscleMassKg: true,
        waistCm: true,
        hipCm: true,
        neckCm: true,
        chestCm: true,
        armCm: true,
        thighCm: true,
        source: true,
        notes: true,
      },
      orderBy: { recordedAt: "desc" },
      take: 100,
    });

    return rows.map((r) => ({
      id: r.id,
      clientUserId: r.clientUserId,
      recordedAt: r.recordedAt,
      weightKg: r.weightKg !== null ? Number(r.weightKg) : null,
      bodyFatPct: r.bodyFatPct !== null ? Number(r.bodyFatPct) : null,
      muscleMassKg: r.muscleMassKg !== null ? Number(r.muscleMassKg) : null,
      waistCm: r.waistCm !== null ? Number(r.waistCm) : null,
      hipCm: r.hipCm !== null ? Number(r.hipCm) : null,
      neckCm: r.neckCm !== null ? Number(r.neckCm) : null,
      chestCm: r.chestCm !== null ? Number(r.chestCm) : null,
      armCm: r.armCm !== null ? Number(r.armCm) : null,
      thighCm: r.thighCm !== null ? Number(r.thighCm) : null,
      source: r.source,
      notes: r.notes,
    }));
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

    // ── Monthly limit: clients can record max 2 measurements per month ──
    const MONTHLY_LIMIT = 2;
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

    // Validate: at least one numeric measurement must be present and finite.
    const measurementKeys: (keyof RecordBodyMetricInput)[] = [
      "weightKg",
      "bodyFatPct",
      "muscleMassKg",
      "waistCm",
      "hipCm",
      "neckCm",
      "chestCm",
      "armCm",
      "thighCm",
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

    const created = await prisma.bodyMetric.create({
      data: {
        clientUserId: user.id,
        source: "MANUAL",
        ...(input.weightKg !== undefined && { weightKg: input.weightKg }),
        ...(input.bodyFatPct !== undefined && { bodyFatPct: input.bodyFatPct }),
        ...(input.muscleMassKg !== undefined && { muscleMassKg: input.muscleMassKg }),
        ...(input.waistCm !== undefined && { waistCm: input.waistCm }),
        ...(input.hipCm !== undefined && { hipCm: input.hipCm }),
        ...(input.neckCm !== undefined && { neckCm: input.neckCm }),
        ...(input.chestCm !== undefined && { chestCm: input.chestCm }),
        ...(input.armCm !== undefined && { armCm: input.armCm }),
        ...(input.thighCm !== undefined && { thighCm: input.thighCm }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
      select: {
        id: true,
        clientUserId: true,
        recordedAt: true,
        weightKg: true,
        bodyFatPct: true,
        muscleMassKg: true,
        waistCm: true,
        hipCm: true,
        neckCm: true,
        chestCm: true,
        armCm: true,
        thighCm: true,
        source: true,
        notes: true,
      },
    });

    logInfo("client-portal.recordBodyMetric", {
      userId: user.id,
      metricId: created.id,
    });

    return {
      id: created.id,
      clientUserId: created.clientUserId,
      recordedAt: created.recordedAt,
      weightKg: created.weightKg !== null ? Number(created.weightKg) : null,
      bodyFatPct: created.bodyFatPct !== null ? Number(created.bodyFatPct) : null,
      muscleMassKg: created.muscleMassKg !== null ? Number(created.muscleMassKg) : null,
      waistCm: created.waistCm !== null ? Number(created.waistCm) : null,
      hipCm: created.hipCm !== null ? Number(created.hipCm) : null,
      neckCm: created.neckCm !== null ? Number(created.neckCm) : null,
      chestCm: created.chestCm !== null ? Number(created.chestCm) : null,
      armCm: created.armCm !== null ? Number(created.armCm) : null,
      thighCm: created.thighCm !== null ? Number(created.thighCm) : null,
      source: created.source,
      notes: created.notes,
    };
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
}

/**
 * Returns how many measurements the client has used this month vs the limit.
 */
export async function getMonthlyMeasurementQuota(): Promise<
  ActionResult<MeasurementQuota>
> {
  return tryCatch(async () => {
    const user = await requireClient();

    const MONTHLY_LIMIT = 2;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const used = await prisma.bodyMetric.count({
      where: {
        clientUserId: user.id,
        recordedAt: { gte: monthStart, lt: monthEnd },
      },
    });

    const remaining = Math.max(0, MONTHLY_LIMIT - used);

    return {
      used,
      limit: MONTHLY_LIMIT,
      remaining,
      canRecord: remaining > 0,
    };
  });
}
