"use server";

// =============================================================================
// BLACKLINE FITNESS — Server Actions: Client rest preferences
//
// Read / mutate the calling client's rest customization. Stored in the
// `ClientRestPreference` table (1-1 with User). The row is lazily created
// on first edit; reads return defaults when absent.
// =============================================================================

import { prisma } from "@/server/db";
import { requireClient } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import { ValidationError } from "@/lib/errors";
import type { ActionResult } from "@/types/api";
import {
  clampGlobalOffset,
  normalizeExerciseOverrides,
  REST_OVERRIDE_MAX,
  type ClientRestPrefs,
} from "@/lib/rest-preferences";

// =============================================================================
// Read
// =============================================================================

export async function getMyRestPreferences(): Promise<ActionResult<ClientRestPrefs>> {
  return tryCatch(async () => {
    const user = await requireClient();

    const row = await prisma.clientRestPreference.findUnique({
      where: { userId: user.id },
      select: { globalOffsetSec: true, exerciseOverrides: true },
    });

    if (!row) {
      return { globalOffsetSec: 0, exerciseOverrides: {} };
    }

    return {
      globalOffsetSec: row.globalOffsetSec,
      exerciseOverrides: normalizeExerciseOverrides(row.exerciseOverrides),
    };
  });
}

// =============================================================================
// Write — global offset
// =============================================================================

export async function setMyGlobalRestOffset(
  offsetSeconds: number,
): Promise<ActionResult<ClientRestPrefs>> {
  return tryCatch(async () => {
    const user = await requireClient();

    if (typeof offsetSeconds !== "number" || !Number.isFinite(offsetSeconds)) {
      throw new ValidationError("INVALID_OFFSET", "El ajuste debe ser un número.");
    }

    const clamped = clampGlobalOffset(offsetSeconds);

    const row = await prisma.clientRestPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        globalOffsetSec: clamped,
        exerciseOverrides: {},
      },
      update: { globalOffsetSec: clamped },
      select: { globalOffsetSec: true, exerciseOverrides: true },
    });

    return {
      globalOffsetSec: row.globalOffsetSec,
      exerciseOverrides: normalizeExerciseOverrides(row.exerciseOverrides),
    };
  });
}

// =============================================================================
// Write — per-exercise override (set + clear)
// =============================================================================

export async function setMyExerciseRestOverride(input: {
  exerciseId: string;
  restSeconds: number;
}): Promise<ActionResult<ClientRestPrefs>> {
  return tryCatch(async () => {
    const user = await requireClient();

    const { exerciseId, restSeconds } = input;

    if (!exerciseId || typeof exerciseId !== "string") {
      throw new ValidationError("INVALID_EXERCISE_ID", "Ejercicio inválido.");
    }

    if (
      typeof restSeconds !== "number" ||
      !Number.isFinite(restSeconds) ||
      restSeconds < 0 ||
      restSeconds > REST_OVERRIDE_MAX
    ) {
      throw new ValidationError(
        "INVALID_REST",
        `El descanso debe estar entre 0 y ${REST_OVERRIDE_MAX} segundos.`,
      );
    }

    // Validate the exercise exists so we don't accumulate orphaned keys.
    const exists = await prisma.exercise.findFirst({
      where: { id: exerciseId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) {
      throw new ValidationError("EXERCISE_NOT_FOUND", "Ejercicio no encontrado.");
    }

    const existing = await prisma.clientRestPreference.findUnique({
      where: { userId: user.id },
      select: { exerciseOverrides: true },
    });

    const current = normalizeExerciseOverrides(existing?.exerciseOverrides);
    current[exerciseId] = Math.floor(restSeconds);

    const row = await prisma.clientRestPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        globalOffsetSec: 0,
        exerciseOverrides: current,
      },
      update: { exerciseOverrides: current },
      select: { globalOffsetSec: true, exerciseOverrides: true },
    });

    return {
      globalOffsetSec: row.globalOffsetSec,
      exerciseOverrides: normalizeExerciseOverrides(row.exerciseOverrides),
    };
  });
}

export async function clearMyExerciseRestOverride(input: {
  exerciseId: string;
}): Promise<ActionResult<ClientRestPrefs>> {
  return tryCatch(async () => {
    const user = await requireClient();

    if (!input.exerciseId || typeof input.exerciseId !== "string") {
      throw new ValidationError("INVALID_EXERCISE_ID", "Ejercicio inválido.");
    }

    const existing = await prisma.clientRestPreference.findUnique({
      where: { userId: user.id },
      select: { globalOffsetSec: true, exerciseOverrides: true },
    });

    if (!existing) {
      return { globalOffsetSec: 0, exerciseOverrides: {} };
    }

    const current = normalizeExerciseOverrides(existing.exerciseOverrides);
    delete current[input.exerciseId];

    const row = await prisma.clientRestPreference.update({
      where: { userId: user.id },
      data: { exerciseOverrides: current },
      select: { globalOffsetSec: true, exerciseOverrides: true },
    });

    return {
      globalOffsetSec: row.globalOffsetSec,
      exerciseOverrides: normalizeExerciseOverrides(row.exerciseOverrides),
    };
  });
}
