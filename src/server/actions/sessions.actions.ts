"use server";

// =============================================================================
// BLACKLINE FITNESS — Server Actions: Workout Sessions + Sets
// Owner: backend-api.
//
// Auth model:
//   - startSession, recordSet, updateSet, deleteSet, completeSession,
//     abortSession, getSession, getActiveSession:
//       requireUser() — caller must be the session owner (clientUserId).
//   - listClientSessions:
//       requireTrainer() + assertOwnsClient  OR  requireUser() if own data.
//
// PR detection:
//   Each recordSet call queries PerformedSet history for the exercise + user
//   and runs isPersonalRecord() (pure function, no DB write in the algorithm).
//   The isPr flag is then persisted on the PerformedSet row.
//
// Soft-delete:
//   WorkoutSession and PerformedSet rows are soft-deleted (deletedAt).
//   PerformedSet hard-deletes cascade from WorkoutSession per schema, but we
//   soft-delete the set first so history queries still exclude it.
// =============================================================================

import { prisma } from "@/server/db";
import { requireUser, requireTrainer, assertOwnsClient } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "@/lib/errors";
import { logInfo } from "@/lib/logger";
import {
  FATIGUE_SCALE_MIN,
  FATIGUE_SCALE_MAX,
  RPE_MIN,
  RPE_MAX,
} from "@/lib/consts";
import { isPersonalRecord } from "@/lib/calc/pr-detection";
import type { ActionResult, StartSessionResult, RecordSetResult } from "@/types/api";
import type { RoutineSnapshot } from "@/types/domain";
import { Prisma } from "@prisma/client";
import type { WorkoutSessionStatus } from "@prisma/client";

// =============================================================================
// Local helper types
// =============================================================================

/** Full session detail returned by getSession / getActiveSession. */
export interface SessionDetail {
  id: string;
  clientUserId: string;
  assignedRoutineId: string | null;
  dayIndex: number | null;
  status: WorkoutSessionStatus;
  startedAt: Date;
  completedAt: Date | null;
  totalDurationSec: number | null;
  bodyweightKg: Prisma.Decimal | null;
  subjectiveFatigue: number | null;
  notes: string | null;
  isFreeWorkout: boolean;
  performedSets: Array<{
    id: string;
    sessionId: string;
    exerciseId: string;
    setNumber: number;
    weightKg: Prisma.Decimal | null;
    reps: number | null;
    rpe: Prisma.Decimal | null;
    restTakenSec: number | null;
    isWarmup: boolean;
    isPr: boolean;
    failed: boolean;
    notes: string | null;
    createdAt: Date;
    exercise: {
      id: string;
      nameEs: string;
      nameEn: string;
      primaryMuscle: string;
      gifUrl: string | null;
      thumbnailUrl: string | null;
    };
  }>;
  assignedRoutine: {
    id: string;
    clientUserId: string;
    routineTemplateId: string;
    snapshotJson: Prisma.JsonValue;
    status: string;
  } | null;
}

/** Lightweight row for session list views. */
export interface SessionSummary {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  totalDurationSec: number | null;
  status: WorkoutSessionStatus;
  isFreeWorkout: boolean;
  dayIndex: number | null;
  setsCount: number;
  prCount: number;
  assignedRoutineId: string | null;
}

// =============================================================================
// Prisma include clauses
// =============================================================================

const SESSION_INCLUDE = {
  performedSets: {
    where: { deletedAt: null },
    include: {
      exercise: {
        select: {
          id: true,
          nameEs: true,
          nameEn: true,
          primaryMuscle: true,
          gifUrl: true,
          thumbnailUrl: true,
        },
      },
    },
    orderBy: [
      { exerciseId: "asc" as const },
      { setNumber: "asc" as const },
    ],
  },
  assignedRoutine: {
    select: {
      id: true,
      clientUserId: true,
      routineTemplateId: true,
      snapshotJson: true,
      status: true,
    },
  },
} satisfies Prisma.WorkoutSessionInclude;

// =============================================================================
// Helpers
// =============================================================================

/** Assert that a WorkoutSession belongs to the current user and is IN_PROGRESS. */
async function assertSessionOwnerInProgress(
  sessionId: string,
  userId: string,
): Promise<{ id: string; clientUserId: string; status: WorkoutSessionStatus; startedAt: Date }> {
  const session = await prisma.workoutSession.findUnique({
    where: { id: sessionId, deletedAt: null },
    select: {
      id: true,
      clientUserId: true,
      status: true,
      startedAt: true,
    },
  });

  if (!session) {
    throw new NotFoundError("SESSION_NOT_FOUND", "Sesión no encontrada.");
  }
  if (session.clientUserId !== userId) {
    throw new ForbiddenError(
      "SESSION_NOT_OWNED",
      "No tenés acceso a esta sesión.",
    );
  }
  if (session.status !== "IN_PROGRESS") {
    throw new ConflictError(
      "SESSION_NOT_IN_PROGRESS",
      "La sesión ya fue completada o abortada.",
    );
  }

  return session;
}

function buildPrescriptionSetRows(
  sessionId: string,
  snapshotJson: Prisma.JsonValue | null | undefined,
  dayIndex: number | null,
) {
  if (dayIndex === null || !snapshotJson || typeof snapshotJson !== "object") {
    return [];
  }

  const snapshot = snapshotJson as unknown as RoutineSnapshot;
  const day = snapshot.days?.find((d) => d.dayIndex === dayIndex);
  if (!day) return [];

  let setNumber = 1;
  const rows: Prisma.PerformedSetCreateManyInput[] = [];

  for (const exercise of day.exercises ?? []) {
    const targetSets = Math.max(1, Number(exercise.targetSets ?? 1));
    if (!exercise.exerciseId) continue;

    for (let i = 0; i < targetSets; i++) {
      rows.push({
        sessionId,
        exerciseId: exercise.exerciseId,
        setNumber,
        restTakenSec: exercise.restSeconds ?? null,
        notes: "Registrado automáticamente al completar la rutina guiada.",
      });
      setNumber += 1;
    }
  }

  return rows;
}

// =============================================================================
// startSession
// =============================================================================

/**
 * Start a new WorkoutSession.
 *
 * - If `assignedRoutineId` + `dayIndex` are provided, loads the day snapshot
 *   from AssignedRoutine.snapshotJson.
 * - If neither is provided, creates a free workout (isFreeWorkout = true).
 * - Rejects if the client already has an IN_PROGRESS session.
 */
export interface StartSessionInput {
  assignedRoutineId?: string;
  dayIndex?: number;
  isFreeWorkout?: boolean;
  bodyweightKg?: number;
}

export async function startSession(
  input: StartSessionInput,
): Promise<ActionResult<StartSessionResult>> {
  return tryCatch(async () => {
    const user = await requireUser();

    const assignedRoutineId = input.assignedRoutineId || null;
    const dayIndex = input.dayIndex !== undefined ? input.dayIndex : null;
    const bodyweightKg = input.bodyweightKg !== undefined ? input.bodyweightKg : null;

    // Guard: no two IN_PROGRESS sessions for the same client
    const existing = await prisma.workoutSession.findFirst({
      where: {
        clientUserId: user.id,
        status: "IN_PROGRESS",
        deletedAt: null,
      },
      select: {
        id: true,
        assignedRoutineId: true,
        dayIndex: true,
        isFreeWorkout: true,
        assignedRoutine: {
          select: { deletedAt: true, status: true },
        },
      },
    });

    const isFreeWorkout = !assignedRoutineId;

    if (existing) {
      if (
        existing.assignedRoutineId === assignedRoutineId &&
        existing.dayIndex === dayIndex &&
        existing.isFreeWorkout === isFreeWorkout
      ) {
        return {
          sessionId: existing.id,
          daySnapshot: null,
          isFreeWorkout: existing.isFreeWorkout,
        };
      }

      // Una sesión abierta sobre una asignación que el coach ya quitó o
      // archivó queda huérfana: el cliente no puede completarla ni abortarla
      // desde la UI (la rutina ya no aparece), y bloqueaba TODA sesión nueva.
      // La abortamos sola en vez de dejar al cliente sin poder entrenar.
      const staleAssignment =
        existing.assignedRoutineId !== null &&
        (existing.assignedRoutine === null ||
          existing.assignedRoutine.deletedAt !== null ||
          existing.assignedRoutine.status !== "ACTIVE");

      if (staleAssignment) {
        await prisma.workoutSession.update({
          where: { id: existing.id },
          data: { status: "ABORTED" },
        });
        logInfo("sessions.startSession.autoAbortedStale", {
          userId: user.id,
          sessionId: existing.id,
          assignedRoutineId: existing.assignedRoutineId,
        });
      } else {
        throw new ConflictError(
          "SESSION_IN_PROGRESS",
          "Ya tenés una sesión en curso. Completála o abortala antes de empezar una nueva.",
        );
      }
    }

    let daySnapshot: RoutineSnapshot["days"][number] | null = null;

    if (assignedRoutineId) {
      // Verify the assignment belongs to this client
      const assigned = await prisma.assignedRoutine.findUnique({
        where: { id: assignedRoutineId, deletedAt: null },
        select: {
          id: true,
          clientUserId: true,
          status: true,
          snapshotJson: true,
        },
      });

      if (!assigned) {
        throw new NotFoundError(
          "ASSIGNED_ROUTINE_NOT_FOUND",
          "Rutina asignada no encontrada.",
        );
      }
      if (assigned.clientUserId !== user.id) {
        throw new ForbiddenError(
          "ROUTINE_NOT_OWNED",
          "Esta rutina asignada no te pertenece.",
        );
      }
      if (assigned.status !== "ACTIVE") {
        throw new ConflictError(
          "ROUTINE_NOT_ACTIVE",
          "Esta rutina ya no está activa.",
        );
      }

      // Extract the day from the frozen snapshot
      if (dayIndex !== null) {
        const snapshot = assigned.snapshotJson as unknown as RoutineSnapshot;
        daySnapshot =
          snapshot.days?.find((d) => d.dayIndex === dayIndex) ?? null;
      }
    }

    const session = await prisma.workoutSession.create({
      data: {
        clientUserId: user.id,
        assignedRoutineId,
        dayIndex,
        status: "IN_PROGRESS",
        isFreeWorkout,
        bodyweightKg,
      },
      select: { id: true, isFreeWorkout: true },
    });

    logInfo("sessions.startSession", {
      userId: user.id,
      sessionId: session.id,
      isFreeWorkout,
      dayIndex,
    });

    return {
      sessionId: session.id,
      daySnapshot,
      isFreeWorkout: session.isFreeWorkout,
    };
  });
}

// =============================================================================
// recordSet
// =============================================================================

/**
 * Record a PerformedSet inside an IN_PROGRESS session.
 *
 * PR detection algorithm (isPersonalRecord):
 *   1. Query all previous non-warmup completed sets for this exercise + user.
 *   2. Run the pure-function PR check.
 *   3. Persist isPr on the new PerformedSet row.
 *
 * Warmup sets are excluded from PR detection.
 */
export interface RecordSetInput {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightKg?: number;
  reps?: number;
  rpe?: number;
  restTakenSec?: number;
  isWarmup?: boolean;
  failed?: boolean;
  notes?: string;
}

export async function recordSet(
  input: RecordSetInput,
): Promise<ActionResult<RecordSetResult>> {
  return tryCatch(async () => {
    const user = await requireUser();

    const sessionId = input.sessionId;
    const exerciseId = input.exerciseId;
    const setNumber = input.setNumber;
    const isWarmup = input.isWarmup ?? false;
    const failed = input.failed ?? false;
    const notes = input.notes || null;

    if (!sessionId || !exerciseId) {
      throw new ValidationError(
        "MISSING_FIELDS",
        "sessionId y exerciseId son obligatorios.",
      );
    }

    const weightKg = input.weightKg !== undefined ? input.weightKg : null;
    const reps = input.reps !== undefined ? input.reps : null;
    const rpe = input.rpe !== undefined ? input.rpe : null;
    const restTakenSec = input.restTakenSec !== undefined ? input.restTakenSec : null;

    // Validate RPE range
    if (rpe !== null && (rpe < RPE_MIN || rpe > RPE_MAX)) {
      throw new ValidationError(
        "INVALID_RPE",
        `El RPE debe estar entre ${RPE_MIN} y ${RPE_MAX}.`,
      );
    }

    await assertSessionOwnerInProgress(sessionId, user.id);

    // PR detection: query previous completed (non-warmup) sets for this exercise
    let isPr = false;
    let prType: RecordSetResult["prType"] | undefined = undefined;

    if (!isWarmup && weightKg !== null && reps !== null) {
      const history = await prisma.performedSet.findMany({
        where: {
          exerciseId,
          isWarmup: false,
          deletedAt: null,
          session: {
            clientUserId: user.id,
            status: "COMPLETED",
            deletedAt: null,
          },
        },
        select: {
          weightKg: true,
          reps: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });

      const prResult = isPersonalRecord({
        exerciseId,
        weight: weightKg,
        reps,
        history: history
          .filter((h) => h.weightKg !== null && h.reps !== null)
          .map((h) => ({
            weight: Number(h.weightKg),
            reps: h.reps!,
            date: h.createdAt,
          })),
      });

      isPr = prResult.isPr;
      prType = prResult.type;
    }

    const set = await prisma.performedSet.create({
      data: {
        sessionId,
        exerciseId,
        setNumber,
        weightKg,
        reps,
        rpe,
        restTakenSec,
        isWarmup,
        isPr,
        failed,
        notes,
      },
      select: { id: true },
    });

    if (isPr) {
      logInfo("sessions.recordSet.pr", {
        userId: user.id,
        sessionId,
        exerciseId,
        setId: set.id,
        prType,
      });
    }

    return { setId: set.id, isPr, prType };
  });
}

// =============================================================================
// updateSet / deleteSet
// =============================================================================

/** Update a PerformedSet's prescription fields. Session must be IN_PROGRESS. */
export async function updateSet(
  setId: string,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireUser();

    const set = await prisma.performedSet.findUnique({
      where: { id: setId, deletedAt: null },
      include: {
        session: {
          select: {
            id: true,
            clientUserId: true,
            status: true,
            startedAt: true,
          },
        },
      },
    });

    if (!set) {
      throw new NotFoundError("SET_NOT_FOUND", "Set no encontrado.");
    }
    if (set.session.clientUserId !== user.id) {
      throw new ForbiddenError("SET_NOT_OWNED", "Este set no te pertenece.");
    }
    if (set.session.status !== "IN_PROGRESS") {
      throw new ConflictError(
        "SESSION_NOT_IN_PROGRESS",
        "Solo podés editar sets de una sesión en curso.",
      );
    }

    const patch: Prisma.PerformedSetUpdateInput = {};

    const weightKgRaw = formData.get("weightKg")?.toString();
    if (weightKgRaw !== undefined)
      patch.weightKg = weightKgRaw ? Number(weightKgRaw) : null;

    const repsRaw = formData.get("reps")?.toString();
    if (repsRaw !== undefined) patch.reps = repsRaw ? Number(repsRaw) : null;

    const rpeRaw = formData.get("rpe")?.toString();
    if (rpeRaw !== undefined) patch.rpe = rpeRaw ? Number(rpeRaw) : null;

    const restTakenSecRaw = formData.get("restTakenSec")?.toString();
    if (restTakenSecRaw !== undefined)
      patch.restTakenSec = restTakenSecRaw ? Number(restTakenSecRaw) : null;

    const notes = formData.get("notes")?.toString();
    if (notes !== undefined) patch.notes = notes || null;

    const failed = formData.get("failed")?.toString();
    if (failed !== undefined) patch.failed = failed === "true";

    await prisma.performedSet.update({ where: { id: setId }, data: patch });

    return { updated: true as const };
  });
}

/** Soft-delete a PerformedSet. Session must be IN_PROGRESS. */
export async function deleteSet(
  setId: string,
): Promise<ActionResult<{ deleted: true }>> {
  return tryCatch(async () => {
    const user = await requireUser();

    const set = await prisma.performedSet.findUnique({
      where: { id: setId, deletedAt: null },
      include: {
        session: {
          select: { clientUserId: true, status: true },
        },
      },
    });

    if (!set) {
      throw new NotFoundError("SET_NOT_FOUND", "Set no encontrado.");
    }
    if (set.session.clientUserId !== user.id) {
      throw new ForbiddenError("SET_NOT_OWNED", "Este set no te pertenece.");
    }
    if (set.session.status !== "IN_PROGRESS") {
      throw new ConflictError(
        "SESSION_NOT_IN_PROGRESS",
        "Solo podés eliminar sets de una sesión en curso.",
      );
    }

    await prisma.performedSet.update({
      where: { id: setId },
      data: { deletedAt: new Date() },
    });

    return { deleted: true as const };
  });
}

// =============================================================================
// completeSession
// =============================================================================

/**
 * Mark an IN_PROGRESS session as COMPLETED.
 *
 * Calculates totalDurationSec from startedAt to now.
 * Optionally records subjectiveFatigue, notes, bodyweightKg.
 * Creates a notification for the linked trainer (if applicable).
 */
export interface CompleteSessionInput {
  sessionId: string;
  totalDurationSec?: number;
  subjectiveFatigue?: number;
  notes?: string;
  bodyweightKg?: number;
}

export async function completeSession(
  input: CompleteSessionInput,
): Promise<ActionResult<{ completed: true; totalDurationSec: number }>> {
  return tryCatch(async () => {
    const user = await requireUser();

    const sessionId = input.sessionId;
    const session = await assertSessionOwnerInProgress(sessionId, user.id);

    const now = new Date();
    const totalDurationSec = input.totalDurationSec !== undefined
      ? input.totalDurationSec
      : Math.round((now.getTime() - session.startedAt.getTime()) / 1000);

    const subjectiveFatigue = input.subjectiveFatigue !== undefined ? input.subjectiveFatigue : null;

    if (
      subjectiveFatigue !== null &&
      (subjectiveFatigue < FATIGUE_SCALE_MIN ||
        subjectiveFatigue > FATIGUE_SCALE_MAX)
    ) {
      throw new ValidationError(
        "INVALID_FATIGUE",
        `La fatiga subjetiva debe estar entre ${FATIGUE_SCALE_MIN} y ${FATIGUE_SCALE_MAX}.`,
      );
    }

    const notes = input.notes || null;
    const bodyweightKg = input.bodyweightKg !== undefined ? input.bodyweightKg : null;

    // Load full session to get assignedRoutine link for trainer notification
    const fullSession = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      select: {
        assignedRoutineId: true,
        dayIndex: true,
        _count: {
          select: { performedSets: true },
        },
        assignedRoutine: {
          select: {
            snapshotJson: true,
            routineTemplate: {
              select: {
                trainerId: true,
                name: true,
              },
            },
          },
        },
      },
    });

    await prisma.$transaction(async (tx) => {
      const prescribedSets = fullSession?._count.performedSets === 0
        ? buildPrescriptionSetRows(
            sessionId,
            fullSession.assignedRoutine?.snapshotJson,
            fullSession.dayIndex,
          )
        : [];

      if (prescribedSets.length > 0) {
        await tx.performedSet.createMany({ data: prescribedSets });
      }

      await tx.workoutSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          completedAt: now,
          totalDurationSec,
          subjectiveFatigue,
          notes,
          ...(bodyweightKg !== null && { bodyweightKg }),
        },
      });

      // Notify the trainer if the session was part of an assigned routine
      const trainerId =
        fullSession?.assignedRoutine?.routineTemplate?.trainerId;
      const routineName =
        fullSession?.assignedRoutine?.routineTemplate?.name;

      if (trainerId && trainerId !== user.id) {
        await tx.notification.create({
          data: {
            userUserId: trainerId,
            type: "SESSION_COMPLETED",
            title: "Sesión completada",
            body: `Tu cliente completó una sesión${routineName ? ` de "${routineName}"` : ""}.`,
            sentVia: [],
            data: {
              sessionId,
              clientId: user.id,
              totalDurationSec,
            },
          },
        });
      }
    });

    logInfo("sessions.completeSession", {
      userId: user.id,
      sessionId,
      totalDurationSec,
    });

    return { completed: true as const, totalDurationSec };
  });
}

// =============================================================================
// abortSession
// =============================================================================

/** Mark an IN_PROGRESS session as ABORTED. No PerformedSets are deleted. */
export async function abortSession(
  sessionId: string,
): Promise<ActionResult<{ aborted: true }>> {
  return tryCatch(async () => {
    const user = await requireUser();

    await assertSessionOwnerInProgress(sessionId, user.id);

    await prisma.workoutSession.update({
      where: { id: sessionId },
      data: { status: "ABORTED" },
    });

    logInfo("sessions.abortSession", { userId: user.id, sessionId });

    return { aborted: true as const };
  });
}

// =============================================================================
// getSession
// =============================================================================

/**
 * Load a full WorkoutSession with all PerformedSets and exercise info.
 * Enforces: session must belong to the requesting user.
 */
export async function getSession(
  sessionId: string,
): Promise<ActionResult<SessionDetail>> {
  return tryCatch(async () => {
    const user = await requireUser();

    const session = await prisma.workoutSession.findUnique({
      where: { id: sessionId, deletedAt: null },
      include: SESSION_INCLUDE,
    });

    if (!session) {
      throw new NotFoundError("SESSION_NOT_FOUND", "Sesión no encontrada.");
    }
    if (session.clientUserId !== user.id) {
      throw new ForbiddenError(
        "SESSION_NOT_OWNED",
        "No tenés acceso a esta sesión.",
      );
    }

    return session as SessionDetail;
  });
}

// =============================================================================
// listClientSessions
// =============================================================================

/**
 * List workout sessions for a client.
 *
 * Access rules:
 *   - Trainer: requireTrainer() + assertOwnsClient().
 *   - Client viewing own history: requireUser() and clientId === user.id.
 *
 * Returns lightweight SessionSummary rows (no PerformedSets detail).
 * Paginated, 20 per page, ordered by startedAt desc.
 */
export async function listClientSessions(
  clientId: string,
  page = 1,
): Promise<ActionResult<{ sessions: SessionSummary[]; total: number }>> {
  return tryCatch(async () => {
    const user = await requireUser();
    const limit = 20;
    const offset = (Math.max(1, page) - 1) * limit;

    if (user.id !== clientId) {
      // Must be a trainer who owns this client
      if (user.role !== "TRAINER") {
        throw new ForbiddenError(
          "ACCESS_DENIED",
          "No tenés permiso para ver las sesiones de este cliente.",
        );
      }
      await assertOwnsClient(user.id, clientId);
    }

    const where: Prisma.WorkoutSessionWhereInput = {
      clientUserId: clientId,
      deletedAt: null,
    };

    const [rows, total] = await Promise.all([
      prisma.workoutSession.findMany({
        where,
        select: {
          id: true,
          startedAt: true,
          completedAt: true,
          totalDurationSec: true,
          status: true,
          isFreeWorkout: true,
          dayIndex: true,
          assignedRoutineId: true,
          _count: {
            select: {
              performedSets: { where: { deletedAt: null } },
            },
          },
          performedSets: {
            where: { isPr: true, deletedAt: null },
            select: { id: true },
          },
        },
        orderBy: { startedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.workoutSession.count({ where }),
    ]);

    const sessions: SessionSummary[] = rows.map((r) => ({
      id: r.id,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      totalDurationSec: r.totalDurationSec,
      status: r.status,
      isFreeWorkout: r.isFreeWorkout,
      dayIndex: r.dayIndex,
      assignedRoutineId: r.assignedRoutineId,
      setsCount: r._count.performedSets,
      prCount: r.performedSets.length,
    }));

    return { sessions, total };
  });
}

// =============================================================================
// getActiveSession
// =============================================================================

/**
 * Return the current user's IN_PROGRESS session, or null if none.
 * Used by the gym UI to resume an interrupted session.
 */
export async function getActiveSession(): Promise<
  ActionResult<{ session: SessionDetail | null }>
> {
  return tryCatch(async () => {
    const user = await requireUser();

    const session = await prisma.workoutSession.findFirst({
      where: {
        clientUserId: user.id,
        status: "IN_PROGRESS",
        deletedAt: null,
      },
      include: SESSION_INCLUDE,
    });

    return { session: (session as SessionDetail | null) ?? null };
  });
}

// =============================================================================
// getMyTodaySession
// Returns today's session (completed or in-progress) for the current user.
// =============================================================================

export async function getMyTodaySession(): Promise<
  ActionResult<{ session: SessionDetail | null }>
> {
  return tryCatch(async () => {
    const user = await requireUser();

    // Today's boundaries in UTC
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const session = await prisma.workoutSession.findFirst({
      where: {
        clientUserId: user.id,
        startedAt: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
      },
      orderBy: { startedAt: "desc" },
      include: SESSION_INCLUDE,
    });

    return { session: (session as SessionDetail | null) ?? null };
  });
}

// -----------------------------------------------------------------------------
// Aliases — match the names the proxy layer (src/app/actions/) expects
// -----------------------------------------------------------------------------

/** @alias listClientSessions — proxy expects `getMySessionHistory`. */
export async function getMySessionHistory(...args: Parameters<typeof listClientSessions>) {
  return listClientSessions(...args);
}
