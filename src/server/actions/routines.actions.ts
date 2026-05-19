"use server";

// =============================================================================
// BLACKLINE FITNESS — Server Actions: Routine Templates + Assignment
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

// =============================================================================
// Local helper types
// =============================================================================

export interface RoutineDetail {
  id: string;
  trainerId: string;
  name: string;
  description: string | null;
  goal: string;
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

/** Validate a goal string (built-in or custom). */
function parseGoal(raw: string | undefined | null): string {
  const trimmed = raw?.trim();
  if (trimmed && trimmed.length > 0) return trimmed;
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
export interface UpdateRoutineInput {
  routineId: string;
  name?: string;
  description?: string;
  goal?: string;
  durationWeeks?: number;
  splitDays?: number;
}

export async function updateRoutine(
  idOrInput: string | UpdateRoutineInput,
  formData?: FormData,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const id = typeof idOrInput === "object" ? idOrInput.routineId : idOrInput;
    const typed = typeof idOrInput === "object" ? idOrInput : null;
    const fd = formData ?? null;

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

    const name = typed ? typed.name?.trim() : fd?.get("name")?.toString().trim();
    if (name) patch.name = name;

    const description = typed ? typed.description?.trim() : fd?.get("description")?.toString().trim();
    if (description !== undefined) patch.description = description || null;

    const goalRaw = typed ? typed.goal : fd?.get("goal")?.toString();
    if (goalRaw) patch.goal = parseGoal(goalRaw);

    const durationWeeks = typed ? (typed.durationWeeks ?? 0) : Number(fd?.get("durationWeeks"));
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
export interface AddDayToRoutineInput {
  routineId: string;
  name: string;
  dayIndex?: number;
}

export async function addDayToRoutine(
  routineIdOrInput: string | AddDayToRoutineInput,
  nameArg?: string,
): Promise<ActionResult<{ dayId: string }>> {
  const routineId = typeof routineIdOrInput === "object" ? routineIdOrInput.routineId : routineIdOrInput;
  const name = typeof routineIdOrInput === "object" ? routineIdOrInput.name : (nameArg ?? "");
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

// ── Typed input interfaces for exercise-in-day mutations ──────────────────────

export interface AddExerciseToDayInput {
  routineDayId: string;
  exerciseId: string;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetRpe?: number | null;
  restSeconds?: number;
  tempo?: string | null;
  supersetGroup?: number | null;
  notes?: string | null;
}

export interface UpdateExerciseInDayInput {
  routineExerciseId: string;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetRpe?: number | null;
  restSeconds?: number;
  tempo?: string | null;
  supersetGroup?: number | null;
  notes?: string | null;
}

export interface AssignRoutineInput {
  clientId: string;
  routineTemplateId: string;
  startsOn: string;
  endsOn?: string;
  trainerNotes?: string;
}

/**
 * Add an exercise to a RoutineDay.
 *
 * Enforces ROUTINE_MAX_EXERCISES_PER_DAY.
 * `order` is auto-incremented from the current maximum.
 */
export async function addExerciseToDay(
  input: AddExerciseToDayInput | FormData,
): Promise<ActionResult<{ routineExerciseId: string }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const fd = input instanceof FormData ? input : null;
    const typed = fd === null ? (input as AddExerciseToDayInput) : null;

    const routineDayId = typed ? typed.routineDayId : fd!.get("routineDayId")?.toString();
    const exerciseId = typed ? typed.exerciseId : fd!.get("exerciseId")?.toString();
    const targetSets = typed ? (typed.targetSets ?? 0) : Number(fd!.get("targetSets"));
    const targetRepsMin = typed ? (typed.targetRepsMin ?? 0) : Number(fd!.get("targetRepsMin"));
    const targetRepsMax = typed ? (typed.targetRepsMax ?? 0) : Number(fd!.get("targetRepsMax"));
    const targetRpeRaw = typed ? (typed.targetRpe !== undefined ? String(typed.targetRpe ?? "") : undefined) : fd!.get("targetRpe")?.toString();
    const restSeconds = typed ? (typed.restSeconds ?? 90) : (Number(fd!.get("restSeconds")) || 90);
    const tempo = typed ? (typed.tempo ?? null) : (fd!.get("tempo")?.toString() || null);
    const supersetGroupRaw = typed ? (typed.supersetGroup !== undefined ? String(typed.supersetGroup ?? "") : undefined) : fd!.get("supersetGroup")?.toString();
    const notes = typed ? (typed.notes ?? null) : (fd!.get("notes")?.toString() || null);

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
  idOrInput: string | UpdateExerciseInDayInput,
  formData?: FormData,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    // Normalize: if first arg is an object, extract routineExerciseId
    const id = typeof idOrInput === "object" ? idOrInput.routineExerciseId : idOrInput;
    const typed = typeof idOrInput === "object" ? idOrInput : null;
    const fd = formData ?? null;

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

    const targetSetsRaw = typed ? typed.targetSets : (fd?.get("targetSets")?.toString() ? Number(fd.get("targetSets")) : undefined);
    if (targetSetsRaw !== undefined && targetSetsRaw !== null) patch.targetSets = Number(targetSetsRaw);

    const targetRepsMinRaw = typed ? typed.targetRepsMin : (fd?.get("targetRepsMin")?.toString() ? Number(fd.get("targetRepsMin")) : undefined);
    if (targetRepsMinRaw !== undefined && targetRepsMinRaw !== null) patch.targetRepsMin = Number(targetRepsMinRaw);

    const targetRepsMaxRaw = typed ? typed.targetRepsMax : (fd?.get("targetRepsMax")?.toString() ? Number(fd.get("targetRepsMax")) : undefined);
    if (targetRepsMaxRaw !== undefined && targetRepsMaxRaw !== null) patch.targetRepsMax = Number(targetRepsMaxRaw);

    const targetRpeTyped = typed ? typed.targetRpe : undefined;
    const targetRpeFd = !typed && fd ? fd.get("targetRpe")?.toString() : undefined;
    if (typed) {
      patch.targetRpe = targetRpeTyped !== undefined ? (targetRpeTyped !== null ? Number(targetRpeTyped) : null) : undefined;
    } else if (targetRpeFd !== undefined) {
      patch.targetRpe = targetRpeFd ? Number(targetRpeFd) : null;
    }

    const restSecondsRaw = typed ? typed.restSeconds : (fd?.get("restSeconds")?.toString() ? Number(fd.get("restSeconds")) : undefined);
    if (restSecondsRaw !== undefined && restSecondsRaw !== null) patch.restSeconds = Number(restSecondsRaw);

    const tempoVal = typed ? typed.tempo : fd?.get("tempo")?.toString();
    if (tempoVal !== undefined) patch.tempo = tempoVal || null;

    const supersetGroupTyped = typed ? typed.supersetGroup : undefined;
    const supersetGroupFd = !typed && fd ? fd.get("supersetGroup")?.toString() : undefined;
    if (typed) {
      patch.supersetGroup = supersetGroupTyped !== undefined ? (supersetGroupTyped !== null ? Number(supersetGroupTyped) : null) : undefined;
    } else if (supersetGroupFd !== undefined) {
      patch.supersetGroup = supersetGroupFd ? Number(supersetGroupFd) : null;
    }

    const notesVal = typed ? typed.notes : fd?.get("notes")?.toString();
    if (notesVal !== undefined) patch.notes = notesVal || null;

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
 * Accepts either (dayId, orderedIds) or ({ routineDayId, orderedIds }).
 */
export async function reorderExercisesInDay(
  dayIdOrInput: string | { routineDayId: string; orderedIds: string[] },
  orderedIdsArg?: string[],
): Promise<ActionResult<{ updated: true }>> {
  const dayId = typeof dayIdOrInput === "object" ? dayIdOrInput.routineDayId : dayIdOrInput;
  const orderedIds = typeof dayIdOrInput === "object" ? dayIdOrInput.orderedIds : (orderedIdsArg ?? []);
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
  input: AssignRoutineInput | FormData,
): Promise<ActionResult<AssignRoutineResult>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const fd = input instanceof FormData ? input : null;
    const typed = fd === null ? (input as AssignRoutineInput) : null;

    const clientId = typed ? typed.clientId : fd!.get("clientId")?.toString();
    const routineTemplateId = typed ? typed.routineTemplateId : fd!.get("routineTemplateId")?.toString();
    const startsOnRaw = typed ? typed.startsOn : fd!.get("startsOn")?.toString();
    const trainerNotes = typed ? (typed.trainerNotes || null) : (fd!.get("trainerNotes")?.toString() || null);

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

// =============================================================================
// duplicateRoutine
// Deep-copies a routine template (days + exercises). Trainer-only.
// =============================================================================

export async function duplicateRoutine(
  routineId: string,
): Promise<ActionResult<CreateRoutineResult>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const source = await prisma.routineTemplate.findUnique({
      where: { id: routineId, deletedAt: null },
      include: {
        days: {
          where: { deletedAt: null },
          orderBy: { dayIndex: "asc" },
          include: {
            exercises: {
              where: { deletedAt: null },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!source) {
      throw new NotFoundError("ROUTINE_NOT_FOUND", "Rutina no encontrada.");
    }
    if (source.trainerId !== user.id) {
      throw new ForbiddenError("ROUTINE_NOT_OWNED", "Esta rutina no te pertenece.");
    }

    const copyName = `${source.name} (copia)`;
    const copy = await prisma.routineTemplate.create({
      data: {
        trainerId: user.id,
        name: copyName,
        goal: source.goal,
        splitDays: source.splitDays,
        durationWeeks: source.durationWeeks,
        isArchived: false,
        days: {
          create: source.days.map((day) => ({
            dayIndex: day.dayIndex,
            name: day.name,
            description: day.description,
            exercises: {
              create: day.exercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                order: ex.order,
                targetSets: ex.targetSets,
                targetRepsMin: ex.targetRepsMin,
                targetRepsMax: ex.targetRepsMax,
                targetRpe: ex.targetRpe,
                restSeconds: ex.restSeconds,
                tempo: ex.tempo,
                supersetGroup: ex.supersetGroup,
                notes: ex.notes,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });

    logInfo("routines.duplicateRoutine", {
      trainerId: user.id,
      sourceId: routineId,
      newId: copy.id,
    });

    return { routineId: copy.id, name: copyName };
  });
}

// =============================================================================
// addRoutineComment
// =============================================================================

export async function addRoutineComment(
  assignedRoutineId: string,
  body: string,
): Promise<ActionResult<{ commentId: string }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    // Verify the trainer owns the client who has this assignment
    const assignment = await prisma.assignedRoutine.findUnique({
      where: { id: assignedRoutineId, deletedAt: null },
      include: {
        routineTemplate: { select: { trainerId: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundError("ASSIGNED_ROUTINE_NOT_FOUND", "Rutina asignada no encontrada.");
    }
    if (assignment.routineTemplate.trainerId !== user.id) {
      throw new ForbiddenError("ROUTINE_NOT_OWNED", "Esta rutina no te pertenece.");
    }

    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 2000) {
      throw new ValidationError(
        "COMMENT_INVALID",
        "El comentario debe tener entre 1 y 2000 caracteres.",
      );
    }

    const comment = await prisma.routineComment.create({
      data: {
        assignedRoutineId,
        authorUserId: user.id,
        body: trimmed,
      },
      select: { id: true },
    });

    return { commentId: comment.id };
  });
}

// =============================================================================
// getClientRoutines
// =============================================================================

export async function getClientRoutines(
  clientUserId: string,
): Promise<ActionResult<{ routines: RoutineSummary[] }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();
    await assertOwnsClient(user.id, clientUserId);

    const assigned = await prisma.assignedRoutine.findMany({
      where: {
        clientUserId,
        status: "ACTIVE",
        deletedAt: null,
      },
      orderBy: { assignedAt: "desc" },
      include: {
        routineTemplate: {
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
        },
      },
    });

    const routines: RoutineSummary[] = assigned.map((ar) => ({
      id: ar.routineTemplate.id,
      name: ar.routineTemplate.name,
      goal: ar.routineTemplate.goal,
      splitDays: ar.routineTemplate.splitDays,
      durationWeeks: ar.routineTemplate.durationWeeks,
      isArchived: ar.routineTemplate.isArchived,
      createdAt: ar.routineTemplate.createdAt,
      updatedAt: ar.routineTemplate.updatedAt,
    }));

    return { routines };
  });
}

// =============================================================================
// Custom Goals
// =============================================================================

export async function createCustomGoal(
  name: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();
    const trimmed = name.trim();

    if (!trimmed || trimmed.length > 50) {
      throw new ValidationError(
        "INVALID_GOAL_NAME",
        "El nombre del objetivo debe tener entre 1 y 50 caracteres.",
      );
    }

    const existing = await prisma.customGoal.findUnique({
      where: { trainerId_name: { trainerId: user.id, name: trimmed } },
      select: { id: true, name: true },
    });

    if (existing) return existing;

    const goal = await prisma.customGoal.create({
      data: { name: trimmed, trainerId: user.id },
      select: { id: true, name: true },
    });

    logInfo("routines.createCustomGoal", { userId: user.id, goalId: goal.id });
    return goal;
  });
}

export async function listCustomGoals(): Promise<
  ActionResult<Array<{ id: string; name: string }>>
> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    return prisma.customGoal.findMany({
      where: { trainerId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  });
}

// -----------------------------------------------------------------------------
// Aliases — match the names the proxy layer (src/app/actions/) expects
// -----------------------------------------------------------------------------

export async function createRoutineTemplate(
  input: { name: string; description?: string; goal: string; splitDays: number; durationWeeks: number },
): Promise<ActionResult<CreateRoutineResult>> {
  const fd = new FormData();
  fd.set("name", input.name);
  if (input.description) fd.set("description", input.description);
  fd.set("goal", input.goal);
  fd.set("splitDays", String(input.splitDays));
  fd.set("durationWeeks", String(input.durationWeeks));
  return createRoutine(fd);
}
export async function updateRoutineTemplate(...args: Parameters<typeof updateRoutine>) {
  return updateRoutine(...args);
}
export async function addRoutineDay(...args: Parameters<typeof addDayToRoutine>) {
  return addDayToRoutine(...args);
}
export async function updateRoutineDay(...args: Parameters<typeof updateDay>) {
  return updateDay(...args);
}
export async function deleteRoutineDay(...args: Parameters<typeof removeDay>) {
  return removeDay(...args);
}
export async function reorderExercises(...args: Parameters<typeof reorderExercisesInDay>) {
  return reorderExercisesInDay(...args);
}
export async function assignRoutineToClient(...args: Parameters<typeof assignRoutine>) {
  return assignRoutine(...args);
}
