// =============================================================================
// FORJA — Demo actions: exercises
// =============================================================================

import { db } from "@/lib/offline/db";
import { ok, err, tryCatch } from "@/lib/result";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { DEMO_TRAINER_ID } from "../seed-data";
import * as store from "../store";
import type { ActionResult, ExerciseSearchResult } from "@/types/api";
import type { DemoExerciseRow } from "@/lib/offline/db";

function toSearchResult(ex: DemoExerciseRow): ExerciseSearchResult {
  return {
    id: ex.id,
    slug: ex.slug,
    nameEs: ex.nameEs,
    primaryMuscle: ex.primaryMuscle as ExerciseSearchResult["primaryMuscle"],
    equipment: ex.equipment as ExerciseSearchResult["equipment"],
    difficulty: ex.difficulty as ExerciseSearchResult["difficulty"],
    gifUrl: ex.gifUrl,
    thumbnailUrl: ex.thumbnailUrl,
  };
}

export async function searchExercises(
  raw: unknown,
): Promise<ActionResult<ExerciseSearchResult[]>> {
  return tryCatch(async () => {
    const input = (raw ?? {}) as { query?: string; primaryMuscle?: string; equipment?: string; difficulty?: string; limit?: number; offset?: number };
    const results = await store.searchExercises(input.query ?? "", input.primaryMuscle, input.equipment);

    const filtered = input.difficulty
      ? results.filter((ex) => ex.difficulty === input.difficulty)
      : results;

    const offset = input.offset ?? 0;
    const limit = input.limit ?? 50;
    return filtered.slice(offset, offset + limit).map(toSearchResult);
  });
}

export async function getExerciseDetail(raw: unknown): Promise<ActionResult<DemoExerciseRow>> {
  return tryCatch(async () => {
    const { id } = (raw ?? {}) as { id?: string };
    if (!id) throw new ValidationError("EXERCISE_INPUT", "ID de ejercicio requerido.");

    const ex = await store.getExercise(id);
    if (!ex) throw new NotFoundError("EXERCISE_NOT_FOUND", "Ejercicio no encontrado.");
    return ex;
  });
}

export async function createPrivateExercise(raw: unknown): Promise<ActionResult<{ exerciseId: string }>> {
  return tryCatch(async () => {
    const input = raw as {
      nameEs: string;
      nameEn?: string;
      instructionsEs: string;
      primaryMuscle: string;
      secondaryMuscles?: string[];
      equipment: string;
      difficulty: string;
      mediaUrl?: string;
    };

    const id = `ex-custom-${Date.now()}`;
    const slug = input.nameEs.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 80);

    await db.demoExercises.put({
      id,
      slug: `${slug}-custom`,
      nameEs: input.nameEs,
      nameEn: input.nameEn ?? input.nameEs,
      instructionsEs: input.instructionsEs,
      primaryMuscle: input.primaryMuscle,
      secondaryMuscles: input.secondaryMuscles ?? [],
      equipment: input.equipment,
      difficulty: input.difficulty as DemoExerciseRow["difficulty"],
      gifUrl: input.mediaUrl ?? null,
      thumbnailUrl: null,
      createdById: DEMO_TRAINER_ID,
      isPublic: false,
    });

    return { exerciseId: id };
  });
}

export async function updateExercise(raw: unknown): Promise<ActionResult<{ exerciseId: string }>> {
  return tryCatch(async () => {
    const { id, ...patch } = raw as { id: string; [k: string]: unknown };
    const existing = await store.getExercise(id);
    if (!existing) throw new NotFoundError("EXERCISE_NOT_FOUND", "Ejercicio no encontrado.");
    if (existing.isPublic) throw new ValidationError("EXERCISE_PUBLIC_READONLY", "No podés editar ejercicios públicos.");
    if (existing.createdById !== DEMO_TRAINER_ID) throw new ValidationError("EXERCISE_NOT_OWNED", "Este ejercicio no te pertenece.");

    await db.demoExercises.update(id, patch as Partial<DemoExerciseRow>);
    return { exerciseId: id };
  });
}

export async function deleteExercise(exerciseId: string): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    const existing = await store.getExercise(exerciseId);
    if (!existing) throw new NotFoundError("EXERCISE_NOT_FOUND", "Ejercicio no encontrado.");
    if (existing.isPublic) throw new ValidationError("EXERCISE_PUBLIC_READONLY", "No podés eliminar ejercicios públicos.");
    await db.demoExercises.delete(exerciseId);
  });
}
