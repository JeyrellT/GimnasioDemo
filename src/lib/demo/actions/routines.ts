// =============================================================================
// BLACKLINE FITNESS — Demo actions: routines
// =============================================================================

import { db } from "@/lib/offline/db";
import { ok, err, tryCatch } from "@/lib/result";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { DEMO_TRAINER_ID } from "../seed-data";
import * as store from "../store";
import type { ActionResult, CreateRoutineResult, AssignRoutineResult } from "@/types/api";
import type { DemoRoutineRow, DemoRoutineDay, DemoRoutineDayExercise } from "@/lib/offline/db";

// ── createRoutineTemplate ─────────────────────────────────────────────────────

export async function createRoutineTemplate(raw: unknown): Promise<ActionResult<CreateRoutineResult>> {
  return tryCatch(async () => {
    const input = raw as {
      name: string;
      description?: string;
      goal: DemoRoutineRow["goal"];
      splitDays: number;
      durationWeeks: number;
    };

    const id = `routine-custom-${Date.now()}`;
    const now = new Date().toISOString();
    await db.demoRoutines.put({
      id,
      trainerId: DEMO_TRAINER_ID,
      name: input.name,
      description: input.description ?? null,
      goal: input.goal,
      splitDays: input.splitDays,
      durationWeeks: input.durationWeeks,
      isArchived: false,
      daysJson: [],
      createdAt: now,
      updatedAt: now,
    });

    return { routineId: id, name: input.name };
  });
}

// ── updateRoutineTemplate ─────────────────────────────────────────────────────

export async function updateRoutineTemplate(raw: unknown): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    const { routineId, ...patch } = raw as { routineId: string; [k: string]: unknown };
    const existing = await store.getRoutine(routineId);
    if (!existing || existing.trainerId !== DEMO_TRAINER_ID) {
      throw new NotFoundError("ROUTINE_NOT_FOUND", "Rutina no encontrada.");
    }
    await db.demoRoutines.update(routineId, { ...patch, updatedAt: new Date().toISOString() } as Partial<DemoRoutineRow>);
  });
}

// ── archiveRoutine ────────────────────────────────────────────────────────────

export async function archiveRoutine(routineId: string): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    await db.demoRoutines.update(routineId, { isArchived: true, updatedAt: new Date().toISOString() });
  });
}

// ── deleteRoutine ────────────────────────────────────────────────────────────

export async function deleteRoutine(routineId: string): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    const existing = await store.getRoutine(routineId);
    if (!existing || existing.trainerId !== DEMO_TRAINER_ID) {
      throw new NotFoundError("ROUTINE_NOT_FOUND", "Rutina no encontrada.");
    }
    await db.demoRoutines.delete(routineId);
  });
}

// ── duplicateRoutine ──────────────────────────────────────────────────────────

export async function duplicateRoutine(routineId: string): Promise<ActionResult<CreateRoutineResult>> {
  return tryCatch(async () => {
    const source = await store.getRoutine(routineId);
    if (!source) throw new NotFoundError("ROUTINE_NOT_FOUND", "Rutina no encontrada.");

    const id = `routine-copy-${Date.now()}`;
    const now = new Date().toISOString();
    const name = `${source.name} (copia)`;

    await db.demoRoutines.put({
      ...source,
      id,
      name,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    });

    return { routineId: id, name };
  });
}

// ── addRoutineDay ─────────────────────────────────────────────────────────────

export async function addRoutineDay(raw: unknown): Promise<ActionResult<{ dayId: string }>> {
  return tryCatch(async () => {
    const input = raw as { routineId: string; dayIndex: number; name: string; description?: string };
    const routine = await store.getRoutine(input.routineId);
    if (!routine) throw new NotFoundError("ROUTINE_NOT_FOUND", "Rutina no encontrada.");

    const dayId = `day-${Date.now()}`;
    const newDay: DemoRoutineDay = {
      id: dayId,
      dayIndex: input.dayIndex,
      name: input.name,
      exercises: [],
    };

    await db.demoRoutines.update(input.routineId, {
      daysJson: [...routine.daysJson, newDay],
      updatedAt: new Date().toISOString(),
    });

    return { dayId };
  });
}

// ── updateRoutineDay ──────────────────────────────────────────────────────────

export async function updateRoutineDay(raw: unknown): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    const input = raw as { routineDayId: string; name?: string; dayIndex?: number };
    const routines = await db.demoRoutines.where({ trainerId: DEMO_TRAINER_ID }).toArray();

    for (const routine of routines) {
      const dayIdx = routine.daysJson.findIndex((d) => d.id === input.routineDayId);
      if (dayIdx !== -1) {
        const days = [...routine.daysJson];
        const day = days[dayIdx]!;
        days[dayIdx] = { ...day, ...(input.name ? { name: input.name } : {}), ...(input.dayIndex !== undefined ? { dayIndex: input.dayIndex } : {}) };
        await db.demoRoutines.update(routine.id, { daysJson: days, updatedAt: new Date().toISOString() });
        return;
      }
    }
  });
}

// ── deleteRoutineDay ──────────────────────────────────────────────────────────

export async function deleteRoutineDay(routineDayId: string): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    const routines = await db.demoRoutines.where({ trainerId: DEMO_TRAINER_ID }).toArray();
    for (const routine of routines) {
      const found = routine.daysJson.some((d) => d.id === routineDayId);
      if (found) {
        await db.demoRoutines.update(routine.id, {
          daysJson: routine.daysJson.filter((d) => d.id !== routineDayId),
          updatedAt: new Date().toISOString(),
        });
        return;
      }
    }
  });
}

// ── addExerciseToDay ──────────────────────────────────────────────────────────

export async function addExerciseToDay(raw: unknown): Promise<ActionResult<{ exerciseId: string }>> {
  return tryCatch(async () => {
    const input = raw as {
      routineDayId: string;
      exerciseId: string;
      targetSets: number;
      targetRepsMin: number;
      targetRepsMax: number;
      targetRpe?: number;
      restSeconds?: number;
      tempo?: string;
      notes?: string;
    };

    const routines = await db.demoRoutines.where({ trainerId: DEMO_TRAINER_ID }).toArray();
    for (const routine of routines) {
      const dayIdx = routine.daysJson.findIndex((d) => d.id === input.routineDayId);
      if (dayIdx !== -1) {
        const days = [...routine.daysJson];
        const day = days[dayIdx]!;
        const reId = `re-${Date.now()}`;
        const newEx: DemoRoutineDayExercise = {
          id: reId,
          exerciseId: input.exerciseId,
          order: day.exercises.length,
          targetSets: input.targetSets,
          targetRepsMin: input.targetRepsMin,
          targetRepsMax: input.targetRepsMax,
          targetRpe: input.targetRpe ?? null,
          restSeconds: input.restSeconds ?? 90,
          tempo: input.tempo ?? null,
          notes: input.notes ?? null,
        };
        days[dayIdx] = { ...day, exercises: [...day.exercises, newEx] };
        await db.demoRoutines.update(routine.id, { daysJson: days, updatedAt: new Date().toISOString() });
        return { exerciseId: reId };
      }
    }

    throw new NotFoundError("DAY_NOT_FOUND", "Día de rutina no encontrado.");
  });
}

// ── removeExerciseFromDay ─────────────────────────────────────────────────────

export async function removeExerciseFromDay(routineExerciseId: string): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    const routines = await db.demoRoutines.where({ trainerId: DEMO_TRAINER_ID }).toArray();
    for (const routine of routines) {
      for (let dayIdx = 0; dayIdx < routine.daysJson.length; dayIdx++) {
        const day = routine.daysJson[dayIdx]!;
        if (day.exercises.some((ex) => ex.id === routineExerciseId)) {
          const days = [...routine.daysJson];
          days[dayIdx] = { ...day, exercises: day.exercises.filter((ex) => ex.id !== routineExerciseId) };
          await db.demoRoutines.update(routine.id, { daysJson: days, updatedAt: new Date().toISOString() });
          return;
        }
      }
    }
  });
}

// ── updateExerciseInDay ───────────────────────────────────────────────────────

export async function updateExerciseInDay(input: {
  routineExerciseId: string;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetRpe?: number | null;
  restSeconds?: number;
  tempo?: string | null;
  supersetGroup?: number | null;
  notes?: string | null;
}): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    const routines = await db.demoRoutines.where({ trainerId: DEMO_TRAINER_ID }).toArray();
    for (const routine of routines) {
      for (let dayIdx = 0; dayIdx < routine.daysJson.length; dayIdx++) {
        const day = routine.daysJson[dayIdx]!;
        const exIdx = day.exercises.findIndex((ex) => ex.id === input.routineExerciseId);
        if (exIdx !== -1) {
          const days = [...routine.daysJson];
          const exercises = [...day.exercises];
          exercises[exIdx] = { ...exercises[exIdx]!, ...input };
          days[dayIdx] = { ...day, exercises };
          await db.demoRoutines.update(routine.id, { daysJson: days, updatedAt: new Date().toISOString() });
          return;
        }
      }
    }
  });
}

// ── reorderExercises ──────────────────────────────────────────────────────────

export async function reorderExercises(raw: unknown): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    const input = raw as { routineDayId: string; orderedIds: string[] };
    const routines = await db.demoRoutines.where({ trainerId: DEMO_TRAINER_ID }).toArray();
    for (const routine of routines) {
      const dayIdx = routine.daysJson.findIndex((d) => d.id === input.routineDayId);
      if (dayIdx !== -1) {
        const days = [...routine.daysJson];
        const day = days[dayIdx]!;
        const reordered = input.orderedIds.map((id, idx) => {
          const ex = day.exercises.find((e) => e.id === id);
          return ex ? { ...ex, order: idx } : null;
        }).filter((ex): ex is DemoRoutineDayExercise => ex !== null);
        days[dayIdx] = { ...day, exercises: reordered };
        await db.demoRoutines.update(routine.id, { daysJson: days, updatedAt: new Date().toISOString() });
        return;
      }
    }
  });
}

// ── assignRoutineToClient ─────────────────────────────────────────────────────

export async function assignRoutineToClient(raw: unknown): Promise<ActionResult<AssignRoutineResult>> {
  return tryCatch(async () => {
    const input = raw as {
      clientId: string;
      routineTemplateId: string;
      startsOn: string;
      endsOn?: string;
      trainerNotes?: string;
    };

    const routine = await store.getRoutine(input.routineTemplateId);
    if (!routine) throw new NotFoundError("ROUTINE_NOT_FOUND", "Rutina no encontrada.");

    // Archive previous active routines
    const previous = await db.demoAssignedRoutines.where({ clientUserId: input.clientId, status: "ACTIVE" }).toArray();
    for (const prev of previous) {
      await db.demoAssignedRoutines.update(prev.id, { status: "ARCHIVED" });
    }

    const id = `ar-${input.clientId}-${Date.now()}`;
    const snapshot = {
      templateId: routine.id,
      templateName: routine.name,
      goal: routine.goal,
      splitDays: routine.splitDays,
      durationWeeks: routine.durationWeeks,
      days: routine.daysJson,
      snapshotAt: new Date().toISOString(),
    };

    await db.demoAssignedRoutines.put({
      id,
      clientUserId: input.clientId,
      routineTemplateId: input.routineTemplateId,
      startsOn: input.startsOn,
      endsOn: input.endsOn ?? null,
      status: "ACTIVE",
      snapshotJson: snapshot,
    });

    return {
      assignedRoutineId: id,
      snapshot: snapshot as unknown as AssignRoutineResult["snapshot"],
      status: "ACTIVE" as AssignRoutineResult["status"],
    };
  });
}

// ── addRoutineComment ─────────────────────────────────────────────────────────

export async function addRoutineComment(_raw: unknown): Promise<ActionResult<{ commentId: string }>> {
  return ok({ commentId: `comment-demo-${Date.now()}` });
}

// ── listMyRoutines ────────────────────────────────────────────────────────────

export async function listMyRoutines(): Promise<ActionResult<DemoRoutineRow[]>> {
  return tryCatch(async () => {
    return store.listRoutines(DEMO_TRAINER_ID);
  });
}

// ── getClientRoutines ─────────────────────────────────────────────────────────

export async function getClientRoutines(
  clientId: string,
): Promise<ActionResult<Array<{ id: string; templateName: string; status: string; startsOn: string; endsOn: string | null }>>> {
  return tryCatch(async () => {
    const assigned = await store.listAssignedRoutines(clientId);
    const results = await Promise.all(
      assigned.map(async (a) => {
        const template = await store.getRoutine(a.routineTemplateId);
        return {
          id: a.id,
          templateName: template?.name ?? "Rutina desconocida",
          status: a.status,
          startsOn: a.startsOn,
          endsOn: a.endsOn,
        };
      }),
    );
    return results.sort((a, b) => b.startsOn.localeCompare(a.startsOn));
  });
}
