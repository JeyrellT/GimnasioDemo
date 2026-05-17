"use server";

// =============================================================================
// VIZION — Server Actions: Routine Templates + Assignment
// Owner: backend-api.
//
// Auth model:
//   - listMyRoutines, getRoutine, create/update/delete/archive:  requireTrainer()
//   - Day and exercise mutations:                                 requireTrainer()
//   - assignRoutine, cancelAssignedRoutine:                      requireTrainer() + assertOwnsClient()
//
// Soft-delete: all queries filter `deletedAt: null`.
// Snapshot: AssignedRoutine.snapshotJson is built from the live template at
// assignment time and never mutated afterwards (frozen prescription).
// =============================================================================

import { prisma } from "@/server/db";
import {
  requireTrainer,
  assertOwnsClient,
} from "@/server/guards";
import { tryCatch } from "@/lib/result";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/errors";
import { logInfo } from "@/lib/logger";
import {
  ROUTINE_MAX_DAYS_PER_WEEK,
  ROUTINE_MAX_EXERCISES_PER_DAY,
} from "@/lib/consts";
import type { ActionResult, CreateRoutineResult, AssignRoutineResult } from "@/types/api";
import type {
  RoutineSnapshot,
  RoutineSnapshotDay,
  RoutineSnapshotExercise,
  RoutineSummary,
} from "@/types/domain";
import { Prisma } from "@prisma/client";
import type { RoutineGoal } from "@prisma/client";

// =============================================================================
// Local helper types
// =============================================================================

export interface RoutineDetail {
  id: string;
  trainerId: string;
  name: string;
  description: string | null;
  goal: RoutineGoal;
  splitDays: number;
  durationWeeks: number;
  isArchived: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  days: Array<{
    id: string;
    routineId: string;
    dayIndex: number;
    name: string;
    description: string | null;
    exercises: Array<{
      id: string;
      routineDayId: string;
      exerciseId: string;
      order: number;
      targetSets: number;
      targetRepsMin: number;
      targetRepsMax: number;
      targetRpe: Prisma.Decimal | null;
      restSeconds: number;
      tempo: string | null;
      supersetGroup: number | null;
      notes: string | null;
      exercise: {
        id: string;
        nameEs: string;
        nameEn: string;
        primaryMuscle: string;
        equipment: string;
        difficulty: string;
        gifUrl: string | null;
        thumbnailUrl: string | null;
      };
    }>;
  }>;
}

// =============================================================================
// Helpers
// =============================================================================

/** Validate and cast a RoutineGoal string. */
function parseGoal(raw: string | undefined | null): RoutineGoal {
  const valid: RoutineGoal[] = [
    "HYPERTROPHY", "STRENGTH", "ENDURANCE", "FAT_LOSS", "GENERAL",
  ];
  if (raw && valid.includes(raw as RoutineGoal)) return raw as RoutineGoal;
  throw new ValidationError("INVALID_GOAL", "Objetivo de rutina inválido.");
}

/**
 * Build a RoutineSnapshot from a fully-loaded RoutineDetail.
 * Called at assignment time to freeze the prescription.
 */
function buildSnapshot(routine: RoutineDetail): RoutineSnapshot {
  const days: RoutineSnapshotDay[] = routine.days.map((day) => ({
    dayIndex: day.dayIndex,
    name: day.name,
    exercises: day.exercises
      .sort((a, b) => a.order - b.order)
      .map(
        (re): RoutineSnapshotExercise => ({
          exerciseId: re.exerciseId,
          nameEs: re.exercise.nameEs,
          order: re.order,
          targetSets: re.targetSets,
          targetRepsMin: re.targetRepsMin,
          targetRepsMax: re.targetRepsMax,
          targetRpe: re.targetRpe !== null ? Number(re.targetRpe) : null,
          restSeconds: re.restSeconds,
          tempo: re.tempo,
          supersetGroup: re.supersetGroup,
          notes: re.notes,
        }),
      ),
  }));

  return {
    templateId: routine.id,
    templateName: routine.name,
    goal: routine.goal,
    splitDays: routine.splitDays,
    durationWeeks: routine.durationWeeks,
    days,
    snapshotAt: new Date().toISOString(),
  };
}

/** Prisma include clause reused by getRoutine and assignRoutine. */
const ROUTINE_INCLUDE = {
  days: {
    where: { deletedAt: null },
    include: {
      exercises: {
        where: { deletedAt: null },
        include: {
          exercise: {
            select: {
              id: true,
              nameEs: true,
              nameEn: true,
              primaryMuscle: true,
              equipment: true,
              difficulty: true,
              gifUrl: true,
              thumbnailUrl: true,
            },
          },
        },
        orderBy: { order: "asc" as const },
      },
    },
    orderBy: { dayIndex: "asc" as const },
  },
} satisfies Prisma.RoutineTemplateInclude;

// =============================================================================
// Template CRUD
// =============================================================================

/**
 * List all routine templates owned by the current trainer.
 * Supports filtering by goal and archived status.
 */
export async function listMyRoutines(
  filters?: { goal?: string; archived?: boolean },
): Promise<ActionResult<RoutineSummary[]>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const where: Prisma.RoutineTemplateWhereInput = {
      trainerId: user.id,
      deletedAt: null,
      ...(filters?.goal && { goal: parseGoal(filters.goal) }),
      ...(filters?.archived !== undefined && { isArchived: filters.archived }),
    };

    const routines = await prisma.routineTemplate.findMany({
      where,
      select: {
        id: true,
        name: true,
        goal: true,
        splitDays: true,
        durationWeeks: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ isArchived: "asc" }, { updatedAt: "desc" }],
    });

    return routines;
  });
}

/**
 * Load a full routine template with all days and exercises.
 * Trainer ownership is enforced.
 */
export async function getRoutine(
  id: string,
): Promise<ActionResult<RoutineDetail>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const routine = await prisma.routineTemplate.findUnique({
      where: { id, deletedAt: null },
      include: ROUTINE_INCLUDE,
    });

    if (!routine) {
      throw new NotFoundError("ROUTINE_NOT_FOUND", "Rutina no encontrada.");
    }
    if (routine.trainerId !== user.id) {
      throw new ForbiddenError(
        "ROUTINE_NOT_OWNED",
        "Esta rutina no te pertenece.",
      );
    }

    return routine as RoutineDetail;
  });
}

/**
 * Create a new RoutineTemplate together with its RoutineDay rows.
 * Days are created from splitDays count with placeholder names.
 */
export async function createRoutine(
  formData: FormData,
): Promise<ActionResult<CreateRoutineResult>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const name = formData.get("name")?.toString().trim();
    const description = formData.get("description")?.toString().trim() || null;
    const goalRaw = formData.get("goal")?.toString();
    const splitDaysRaw = Number(formData.get("splitDays"));
    const durationWeeksRaw = Number(formData.get("durationWeeks")) || 8;

    if (!name) {
      throw new ValidationError("NAME_REQUIRED", "El nombre de la rutina es obligatorio.");
    }

    const goal = parseGoal(goalRaw);

    if (
      !Number.isInteger(splitDaysRaw) ||
      splitDaysRaw < 1 ||
      splitDaysRaw > ROUTINE_MAX_DAYS_PER_WEEK
    ) {
      throw new ValidationError(
        "INVALID_SPLIT_DAYS",
        `Los días de split deben estar entre 1 y ${ROUTINE_MAX_DAYS_PER_WEEK}.`,
      );
    }

    const routine = await prisma.$transaction(async (tx) => {
      const template = await tx.routineTemplate.create({
        data: {
          trainerId: user.id,
          name,
          description,
          goal,
          splitDays: splitDaysRaw,
          durationWeeks: durationWeeksRaw,
          isArchived: false,
          isPublic: false,
        },
        select: { id: true, name: true },
      });

      // Create one RoutineDay per splitDay with a default name
      const days = Array.from({ length: splitDaysRaw }, (_, i) => ({
        routineId: template.id,
        dayIndex: i,
        name: `Día ${i + 1}`,
      }));

      await tx.routineDay.createMany({ data: days });

      return template;
    });

    logInfo("routines.createRoutine", {
      userId: user.id,
      routineId: routine.id,
      name: routine.name,
    });

    return { routineId: routine.id, name: routine.name };
  });
}

/**
 * Update metadata fields of a RoutineTemplate.
 * Cannot change splitDays (would invalidate existing day indices) without a
 * proper migration — that operation is not exposed here.
 */
export async function updateRoutine(
  id: string,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const routine = await prisma.routineTemplate.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, trainerId: true },
    });

    if (!routine) {
      throw new NotFoundError("ROUTINE_NOT_FOUND", "Rutina no encontrada.");
    }
    if (routine.trainerId !== user.id) {
      throw new ForbiddenError("ROUTINE_NOT_OWNED", "Esta rutina no te pertenece.");
    }

    const patch: Prisma.RoutineTemplateUpdateInput = {};

    const name = formData.get("name")?.toString().trim();
    if (name) patch.name = name;

    const description = formData.get("description")?.toString().trim();
    if (description !== undefined) patch.description = description || null;

    const goalRaw = formData.get("goal")?.toString();
    if (goalRaw) patch.goal = parseGoal(goalRaw);

    const durationWeeks = Number(formData.get("durationWeeks"));
    if (durationWeeks > 0) patch.durationWeeks = durationWeeks;

    await prisma.routineTemplate.update({ where: { id }, data: patch });

    logInfo("routines.updateRoutine", { userId: user.id, routineId: id });

    return { updated: true as const };
  });
}

/** Soft-delete a RoutineTemplate and cascade-soft-delete its days. */
export async function deleteRoutine(
  id: string,
): Promise<ActionResult<{ deleted: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const routine = await prisma.routineTemplate.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, trainerId: true },
    });

    if (!routine) {
      throw new NotFoundError("ROUTINE_NOT_FOUND", "Rutina no encontrada.");
    }
    if (routine.trainerId !== user.id) {
      throw new ForbiddenError("ROUTINE_NOT_OWNED", "Esta rutina no te pertenece.");
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.routineTemplate.update({
        where: { id },
        data: { deletedAt: now },
      }),
      // Days cascade in Prisma schema (onDelete: Cascade), but we soft-delete
      // the template only — hard-delete cascade is fine for days in this schema.
    ]);

    logInfo("routines.deleteRoutine", { userId: user.id, routineId: id });

    return { deleted: true as const };
  });
}

/** Toggle isArchived = true. Does not soft-delete — routine remains visible. */
export async function archiveRoutine(
  id: string,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const routine = await prisma.routineTemplate.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, trainerId: true },
    });

    if (!routine) {
      throw new NotFoundError("ROUTINE_NOT_FOUND", "Rutina no encontrada.");
    }
    if (routine.trainerId !== user.id) {
      throw new ForbiddenError("ROUTINE_NOT_OWNED", "Esta rutina no te pertenece.");
    }

    await prisma.routineTemplate.update({
      where: { id },
      data: { isArchived: true },
    });

    logInfo("routines.archiveRoutine", { userId: user.id, routineId: id });

    return { updated: true as const };
  });
}

// =============================================================================
// Day management
// =============================================================================

/**
 * Add a new RoutineDay to a RoutineTemplate.
 * dayIndex is auto-incremented from the current max.
 */
export async function addDayToRoutine(
  routineId: string,
  name: string,
): Promise<ActionResult<{ dayId: string }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const routine = await prisma.routineTemplate.findUnique({
      where: { id: routineId, deletedAt: null },
      select: { id: true, trainerId: true },
    });

    if (!routine) {
      throw new NotFoundError("ROUTINE_NOT_FOUND", "Rutina no encontrada.");
    }
    if (routine.trainerId !== user.id) {
      throw new ForbiddenError("ROUTINE_NOT_OWNED", "Esta rutina no te pertenece.");
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new ValidationError("DAY_NAME_REQUIRED", "El nombre del día es obligatorio.");
    }

    // Find current max dayIndex
    const lastDay = await prisma.routineDay.findFirst({
      where: { routineId, deletedAt: null },
      orderBy: { dayIndex: "desc" },
      select: { dayIndex: true },
    });

    const newDayIndex = lastDay ? lastDay.dayIndex + 1 : 0;

    if (newDayIndex >= ROUTINE_MAX_DAYS_PER_WEEK) {
      throw new ValidationError(
        "MAX_DAYS_REACHED",
        `Una rutina puede tener máximo ${ROUTINE_MAX_DAYS_PER_WEEK} días.`,
      );
    }

    const day = await prisma.routineDay.create({
      data: {
        routineId,
        dayIndex: newDayIndex,
        name: trimmedName,
      },
      select: { id: true },
    });

    return { dayId: day.id };
  });
}

/** Update the name and/or description of a RoutineDay. */
export async function updateDay(
  dayId: string,
  name: string,
  description?: string,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const day = await prisma.routineDay.findUnique({
      where: { id: dayId, deletedAt: null },
      include: { routine: { select: { trainerId: true } } },
    });

    if (!day) {
      throw new NotFoundError("DAY_NOT_FOUND", "Día de rutina no encontrado.");
    }
    if (day.routine.trainerId !== user.id) {
      throw new ForbiddenError("ROUTINE_NOT_OWNED", "Esta rutina no te pertenece.");
    }

    await prisma.routineDay.update({
      where: { id: dayId },
      data: {
        name: name.trim() || day.name,
        ...(description !== undefined && { description: description.trim() || null }),
      },
    });

    return { updated: true as const };
  });
}

/** Soft-delete a RoutineDay (exercises cascade-delete in DB). */
export async function removeDay(
  dayId: string,
): Promise<ActionResult<{ deleted: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const day = await prisma.routineDay.findUnique({
      where: { id: dayId, deletedAt: null },
      include: { routine: { select: { trainerId: true } } },
    });

    if (!day) {
      throw new NotFoundError("DAY_NOT_FOUND", "Día de rutina no encontrado.");
    }
    if (day.routine.trainerId !== user.id) {
      throw new ForbiddenError("ROUTINE_NOT_OWNED", "Esta rutina no te pertenece.");
    }

    // Hard-delete the day — exercises will cascade-delete per schema definition
    await prisma.routineDay.delete({ where: { id: dayId } });

    return { deleted: true as const };
  });
}

// =============================================================================
// Exercise-in-day management
// =============================================================================

/**
 * Add an exercise to a RoutineDay.
 *
 * Enforces ROUTINE_MAX_EXERCISES_PER_DAY.
 * `order` is auto-incremented from the current maximum.
 */
export async function addExerciseToDay(
  formData: FormData,
): Promise<ActionResult<{ routineExerciseId: string }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const routineDayId = formData.get("routineDayId")?.toString();
    const exerciseId = formData.get("exerciseId")?.toString();
    const targetSets = Number(formData.get("targetSets"));
    const targetRepsMin = Number(formData.get("targetRepsMin"));
    const targetRepsMax = Number(formData.get("targetRepsMax"));
    const targetRpeRaw = formData.get("targetRpe")?.toString();
    const restSeconds = Number(formData.get("restSeconds")) || 90;
    const tempo = formData.get("tempo")?.toString() || null;
    const supersetGroupRaw = formData.get("supersetGroup")?.toString();
    const notes = formData.get("notes")?.toString() || null;

    if (!routineDayId || !exerciseId) {
      throw new ValidationError(
        "MISSING_FIELDS",
        "routineDayId y exerciseId son obligatorios.",
      );
    }

    const day = await prisma.routineDay.findUnique({
      where: { id: routineDayId, deletedAt: null },
      include: {
        routine: { select: { trainerId: true } },
        exercises: {
          where: { deletedAt: null },
          select: { id: true, order: true },
          orderBy: { order: "desc" },
        },
      },
    });

    if (!day) {
      throw new NotFoundError("DAY_NOT_FOUND", "Día de rutina no encontrado.");
    }
    if (day.routine.trainerId !== user.id) {
      throw new ForbiddenError("ROUTINE_NOT_OWNED", "Esta rutina no te pertenece.");
    }

    if (day.exercises.length >= ROUTINE_MAX_EXERCISES_PER_DAY) {
      throw new ValidationError(
        "MAX_EXERCISES_REACHED",
        `Un día puede tener máximo ${ROUTINE_MAX_EXERCISES_PER_DAY} ejercicios.`,
      );
    }

    const nextOrder =
      day.exercises.length > 0 ? (day.exercises[0]!.order + 1) : 0;

    const re = await prisma.routineExercise.create({
      data: {
        routineDayId,
        exerciseId,
        order: nextOrder,
        targetSets: targetSets || 3,
        targetRepsMin: targetRepsMin || 8,
        targetRepsMax: targetRepsMax || 12,
        targetRpe:
          targetRpeRaw && targetRpeRaw !== "" ? Number(targetRpeRaw) : null,
        restSeconds,
        tempo,
        supersetGroup:
          supersetGroupRaw && supersetGroupRaw !== ""
            ? Number(supersetGroupRaw)
            : null,
        notes,
      },
      select: { id: true },
    });

    logInfo("routines.addExerciseToDay", {
      userId: user.id,
      routineDayId,
      exerciseId,
      routineExerciseId: re.id,
    });

    return { routineExerciseId: re.id };
  });
}

/** Update prescription parameters for a RoutineExercise. */
export async function updateExerciseInDay(
  id: string,
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const re = await prisma.routineExercise.findUnique({
      where: { id, deletedAt: null },
      include: {
        routineDay: {
          include: { routine: { select: { trainerId: true } } },
        },
      },
    });

    if (!re) {
      throw new NotFoundError(
        "EXERCISE_NOT_FOUND",
        "Ejercicio en la rutina no encontrado.",
      );
    }
    if (re.routineDay.routine.trainerId !== user.id) {
      throw new ForbiddenError("ROUTINE_NOT_OWNED", "Esta rutina no te pertenece.");
    }

    const patch: Prisma.RoutineExerciseUpdateInput = {};

    const targetSets = formData.get("targetSets")?.toString();
    if (targetSets) patch.targetSets = Number(targetSets);

    const targetRepsMin = formData.get("targetRepsMin")?.toString();
    if (targetRepsMin) patch.targetRepsMin = Number(targetRepsMin);

    const targetRepsMax = formData.get("targetRepsMax")?.toString();
    if (targetRepsMax) patch.targetRepsMax = Number(targetRepsMax);

    const targetRpe = formData.get("targetRpe")?.toString();
    if (targetRpe !== undefined) patch.targetRpe = targetRpe ? Number(targetRpe) : null;

    const restSeconds = formData.get("restSeconds")?.toString();
    if (restSeconds) patch.restSeconds = Number(restSeconds);

    const tempo = formData.get("tempo")?.toString();
    if (tempo !== undefined) patch.tempo = tempo || null;

    const supersetGroup = formData.get("supersetGroup")?.toString();
    if (supersetGroup !== undefined)
      patch.supersetGroup = supersetGroup ? Number(supersetGroup) : null;

    const notes = formData.get("notes")?.toString();
    if (notes !== undefined) patch.notes = notes || null;

    await prisma.routineExercise.update({ where: { id }, data: patch });

    return { updated: true as const };
  });
}

/** Soft-delete a RoutineExercise from a day. */
export async function removeExerciseFromDay(
  id: string,
): Promise<ActionResult<{ deleted: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const re = await prisma.routineExercise.findUnique({
      where: { id, deletedAt: null },
      include: {
        routineDay: {
          include: { routine: { select: { trainerId: true } } },
        },
      },
    });

    if (!re) {
      throw new NotFoundError(
        "EXERCISE_NOT_FOUND",
        "Ejercicio en la rutina no encontrado.",
      );
    }
    if (re.routineDay.routine.trainerId !== user.id) {
      throw new ForbiddenError("ROUTINE_NOT_OWNED", "Esta rutina no te pertenece.");
    }

    await prisma.routineExercise.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { deleted: true as const };
  });
}

/**
 * Reorder exercises within a RoutineDay by updating their `order` field.
 * `orderedIds` must contain every exercise id in the day.
 */
export async function reorderExercisesInDay(
  dayId: string,
  orderedIds: string[],
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const day = await prisma.routineDay.findUnique({
      where: { id: dayId, deletedAt: null },
      include: {
        routine: { select: { trainerId: true } },
        exercises: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    if (!day) {
      throw new NotFoundError("DAY_NOT_FOUND", "Día de rutina no encontrado.");
    }
    if (day.routine.trainerId !== user.id) {
      throw new ForbiddenError("ROUTINE_NOT_OWNED", "Esta rutina no te pertenece.");
    }

    const existingIds = new Set(day.exercises.map((e) => e.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw new ValidationError(
          "INVALID_EXERCISE_ID",
          `El ejercicio ${id} no pertenece a este día.`,
        );
      }
    }

    // Update each exercise's order in a transaction
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.routineExercise.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return { updated: true as const };
  });
}

// =============================================================================
// Assignment
// =============================================================================

/**
 * Assign a RoutineTemplate to a client.
 *
 * Steps:
 * 1. Verify trainer owns the client (assertOwnsClient).
 * 2. Cancel any existing ACTIVE assigned routine for this client.
 * 3. Build a frozen snapshot from the live template.
 * 4. Create AssignedRoutine.
 * 5. Create in-app Notification for the client.
 */
export async function assignRoutine(
  formData: FormData,
): Promise<ActionResult<AssignRoutineResult>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const clientId = formData.get("clientId")?.toString();
    const routineTemplateId = formData.get("routineTemplateId")?.toString();
    const startsOnRaw = formData.get("startsOn")?.toString();
    const trainerNotes = formData.get("trainerNotes")?.toString() || null;

    if (!clientId || !routineTemplateId || !startsOnRaw) {
      throw new ValidationError(
        "MISSING_FIELDS",
        "clientId, routineTemplateId y startsOn son obligatorios.",
      );
    }

    const startsOn = new Date(startsOnRaw);
    if (isNaN(startsOn.getTime())) {
      throw new ValidationError("INVALID_DATE", "Fecha de inicio inválida.");
    }

    // Verify trainer-client ownership
    await assertOwnsClient(user.id, clientId);

    // Load routine with all days and exercises for snapshot
    const routine = await prisma.routineTemplate.findUnique({
      where: { id: routineTemplateId, deletedAt: null },
      include: ROUTINE_INCLUDE,
    });

    if (!routine) {
      throw new NotFoundError("ROUTINE_NOT_FOUND", "Rutina no encontrada.");
    }
    if (routine.trainerId !== user.id) {
      throw new ForbiddenError(
        "ROUTINE_NOT_OWNED",
        "Esta rutina no te pertenece.",
      );
    }

    const snapshot = buildSnapshot(routine as RoutineDetail);

    // Calculate endsOn from durationWeeks
    const endsOn = new Date(startsOn);
    endsOn.setDate(endsOn.getDate() + routine.durationWeeks * 7);

    const result = await prisma.$transaction(async (tx) => {
      // Cancel any currently ACTIVE assigned routine for this client
      await tx.assignedRoutine.updateMany({
        where: {
          clientUserId: clientId,
          status: "ACTIVE",
          deletedAt: null,
        },
        data: { status: "CANCELLED" },
      });

      // Create the new assignment
      const assigned = await tx.assignedRoutine.create({
        data: {
          clientUserId: clientId,
          routineTemplateId,
          snapshotJson: snapshot as unknown as Prisma.InputJsonValue,
          startsOn,
          endsOn,
          status: "ACTIVE",
          trainerNotes,
        },
        select: { id: true, status: true },
      });

      // Notify the client
      await tx.notification.create({
        data: {
          userUserId: clientId,
          type: "ROUTINE_ASSIGNED",
          title: "Rutina asignada",
          body: `Tu entrenador te asignó la rutina "${routine.name}". Empezás el ${startsOn.toLocaleDateString("es-CR")}.`,
          sentVia: [],
          data: {
            assignedRoutineId: assigned.id,
            routineName: routine.name,
          },
        },
      });

      return assigned;
    });

    logInfo("routines.assignRoutine", {
      trainerId: user.id,
      clientId,
      routineTemplateId,
      assignedRoutineId: result.id,
    });

    return {
      assignedRoutineId: result.id,
      snapshot,
      status: result.status,
    };
  });
}

/** Cancel an active assigned routine. */
export async function cancelAssignedRoutine(
  assignedRoutineId: string,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const assigned = await prisma.assignedRoutine.findUnique({
      where: { id: assignedRoutineId, deletedAt: null },
      include: {
        clientUser: {
          select: { id: true },
        },
      },
    });

    if (!assigned) {
      throw new NotFoundError(
        "ASSIGNED_ROUTINE_NOT_FOUND",
        "Rutina asignada no encontrada.",
      );
    }

    // Verify the trainer owns this client
    await assertOwnsClient(user.id, assigned.clientUserId);

    await prisma.assignedRoutine.update({
      where: { id: assignedRoutineId },
      data: { status: "CANCELLED" },
    });

    logInfo("routines.cancelAssignedRoutine", {
      trainerId: user.id,
      assignedRoutineId,
      clientId: assigned.clientUserId,
    });

    return { updated: true as const };
  });
}
