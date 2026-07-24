// =============================================================================
// BLACKLINE FITNESS — OCR routine extraction (training plan from images)
// Owner: ai-orchestrator.
//
// Public API:
//   extractRoutineFromImage(file: File, requestId?: string)
//     -> Promise<Result<OcrRoutineResult, AppError>>
//
// Pipeline:
//   1. Validate file type + size (cheap client-side guard).
//   2. Convert File to base64 via FileReader.
//   3. generateStructured with ROUTINE_OCR_PROMPT + ROUTINE_OCR_SCHEMA.
//   4. parseAndValidate with shape validator (with silent swap + splitDays fix).
//   5. Log success with non-PII metrics and return Result.
//
// Sources we handle: trainer plan photos, fitness app screenshots, PDF tables,
// handwritten routines, whiteboard sketches.
// =============================================================================

"use client";

import { ValidationError, type AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";

import { generateStructured, parseAndValidate } from "./gemini-client";
import {
  ROUTINE_OCR_PROMPT,
  ROUTINE_OCR_PROMPT_VERSION,
  ROUTINE_OCR_SCHEMA,
  type OcrRoutineDay,
  type OcrRoutineExercise,
  type OcrRoutineResult,
} from "./prompts/routine.prompt";

// Re-export public types for caller convenience.
export type { OcrRoutineDay, OcrRoutineExercise, OcrRoutineResult };

// -----------------------------------------------------------------------------
// File validation constants
// -----------------------------------------------------------------------------

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

const VALID_GOALS = [
  "HYPERTROPHY",
  "MUSCLE_GAIN",
  "DEFINITION",
  "STRENGTH",
  "ENDURANCE",
  "FAT_LOSS",
  "GENERAL",
] as const;

type RoutineGoal = (typeof VALID_GOALS)[number];

// -----------------------------------------------------------------------------
// File → base64 helper
// -----------------------------------------------------------------------------

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("FileReader did not return a string."));
        return;
      }
      // result is "data:<mime>;base64,<data>" — strip the prefix
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to extract base64 from FileReader result."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

// -----------------------------------------------------------------------------
// Shape validator
// -----------------------------------------------------------------------------

function isInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return isInt(v) && v >= min && v <= max;
}

function isValidGoal(v: unknown): v is RoutineGoal {
  return (
    typeof v === "string" && (VALID_GOALS as readonly string[]).includes(v)
  );
}

function validateExercise(
  raw: unknown,
  dayIndex: number,
  exIndex: number,
): OcrRoutineExercise {
  if (!raw || typeof raw !== "object") {
    throw new TypeError(
      `routine extraction: days[${dayIndex}].exercises[${exIndex}] must be object`,
    );
  }
  const e = raw as Record<string, unknown>;

  if (typeof e.nameEs !== "string" || e.nameEs.trim().length === 0) {
    throw new TypeError(
      `routine extraction: days[${dayIndex}].exercises[${exIndex}].nameEs must be non-empty string`,
    );
  }
  if (!isIntInRange(e.targetSets, 1, 20)) {
    throw new TypeError(
      `routine extraction: days[${dayIndex}].exercises[${exIndex}].targetSets must be integer 1-20`,
    );
  }
  if (!isIntInRange(e.targetRepsMin, 1, 100)) {
    throw new TypeError(
      `routine extraction: days[${dayIndex}].exercises[${exIndex}].targetRepsMin must be integer 1-100`,
    );
  }
  if (!isIntInRange(e.targetRepsMax, 1, 100)) {
    throw new TypeError(
      `routine extraction: days[${dayIndex}].exercises[${exIndex}].targetRepsMax must be integer 1-100`,
    );
  }
  if (!isIntInRange(e.restSeconds, 0, 600)) {
    throw new TypeError(
      `routine extraction: days[${dayIndex}].exercises[${exIndex}].restSeconds must be integer 0-600`,
    );
  }
  if (!isStringOrNull(e.notes)) {
    throw new TypeError(
      `routine extraction: days[${dayIndex}].exercises[${exIndex}].notes must be string|null`,
    );
  }

  // Silent swap if min > max — model occasionally inverts them.
  let targetRepsMin = e.targetRepsMin as number;
  let targetRepsMax = e.targetRepsMax as number;
  if (targetRepsMin > targetRepsMax) {
    [targetRepsMin, targetRepsMax] = [targetRepsMax, targetRepsMin];
  }

  return {
    nameEs: e.nameEs.trim(),
    targetSets: e.targetSets as number,
    targetRepsMin,
    targetRepsMax,
    restSeconds: e.restSeconds as number,
    notes: e.notes,
  };
}

function validateDay(raw: unknown, dayIndex: number): OcrRoutineDay {
  if (!raw || typeof raw !== "object") {
    throw new TypeError(`routine extraction: days[${dayIndex}] must be object`);
  }
  const d = raw as Record<string, unknown>;

  if (typeof d.name !== "string" || d.name.trim().length === 0) {
    throw new TypeError(
      `routine extraction: days[${dayIndex}].name must be non-empty string`,
    );
  }
  if (!Array.isArray(d.exercises) || d.exercises.length < 1) {
    throw new TypeError(
      `routine extraction: days[${dayIndex}].exercises must be array with 1+ items`,
    );
  }

  const exercises = d.exercises.map((ex, idx) =>
    validateExercise(ex, dayIndex, idx),
  );

  return {
    name: d.name.trim(),
    exercises,
  };
}

function isRoutineShape(data: unknown): OcrRoutineResult {
  if (!data || typeof data !== "object") {
    throw new TypeError("routine extraction: not an object");
  }
  const d = data as Record<string, unknown>;

  if (typeof d.name !== "string" || d.name.trim().length === 0) {
    throw new TypeError("routine extraction: name must be non-empty string");
  }
  if (!isValidGoal(d.goal)) {
    throw new TypeError(
      `routine extraction: goal must be one of ${VALID_GOALS.join(", ")}`,
    );
  }
  if (!isIntInRange(d.splitDays, 1, 6)) {
    throw new TypeError("routine extraction: splitDays must be integer 1-6");
  }
  if (!isIntInRange(d.durationWeeks, 1, 52)) {
    throw new TypeError(
      "routine extraction: durationWeeks must be integer 1-52",
    );
  }
  if (!Array.isArray(d.days) || d.days.length < 1) {
    throw new TypeError("routine extraction: days must be array with 1+ items");
  }

  const days = d.days.map((day, idx) => validateDay(day, idx));

  // Reconcile splitDays with actual day count — model sometimes overcounts.
  const splitDays = days.length === d.splitDays ? d.splitDays : days.length;

  return {
    name: d.name.trim(),
    goal: d.goal,
    splitDays,
    durationWeeks: d.durationWeeks,
    days,
  };
}

// -----------------------------------------------------------------------------
// extractRoutineFromImage — main entry point
// -----------------------------------------------------------------------------

export async function extractRoutineFromImage(
  file: File,
  requestId?: string,
): Promise<Result<OcrRoutineResult, AppError>> {
  // 1. Cheap file validation.
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return err(
      new ValidationError(
        "INVALID_IMAGE_TYPE",
        `Formato no soportado (${file.type || "desconocido"}). Subí JPG, PNG, WebP o HEIC.`,
      ),
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return err(
      new ValidationError(
        "IMAGE_TOO_LARGE",
        `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo 10MB.`,
      ),
    );
  }

  // 2. File → base64.
  let base64: string;
  try {
    base64 = await fileToBase64(file);
  } catch (e) {
    return err(
      new ValidationError(
        "INVALID_IMAGE_TYPE",
        "No se pudo leer la imagen. Probá con otro archivo.",
        e,
      ),
    );
  }

  // 3. Gemini structured generation.
  const generationResult = await generateStructured<OcrRoutineResult>({
    model: "ocr",
    systemInstruction: ROUTINE_OCR_PROMPT,
    userParts: [
      { inlineData: { data: base64, mimeType: file.type } },
      { text: "Extraé la rutina completa de esta imagen:" },
    ],
    schema: ROUTINE_OCR_SCHEMA,
    temperature: 0,
    timeoutMs: 60_000,
    maxAttempts: 2,
    requestId,
  });

  if (!generationResult.ok) return err(generationResult.error);

  // 4. Shape validation + soft fixes.
  const validated = parseAndValidate<OcrRoutineResult>(
    generationResult.value.raw,
    isRoutineShape,
    requestId,
  );
  if (!validated.ok) return err(validated.error);

  const routine = validated.value;
  const totalExercises = routine.days.reduce(
    (acc, day) => acc + day.exercises.length,
    0,
  );

  logger.info(
    {
      requestId,
      routinePromptVersion: ROUTINE_OCR_PROMPT_VERSION,
      latencyMs: generationResult.value.latencyMs,
      attempts: generationResult.value.attempts,
      modelId: generationResult.value.modelId,
      dayCount: routine.days.length,
      totalExercises,
      goal: routine.goal,
      splitDays: routine.splitDays,
      durationWeeks: routine.durationWeeks,
    },
    "ai.ocr.routine.extracted",
  );

  return ok(routine);
}
