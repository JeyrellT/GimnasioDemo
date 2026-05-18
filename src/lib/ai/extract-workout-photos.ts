// =============================================================================
// BLACKLINE FITNESS — Workout-log photo extraction
// Owner: ai-orchestrator.
//
// Public API:
//   extractWorkoutPhotos({ images, requestId? }) ->
//     Result<WorkoutPhotoExtraction, AppError>
//
// Pipeline mirrors ocr-cedula.ts and ocr-scale.ts:
//   1. Validate input (1..3 images).
//   2. Run anonymizeImagePreUpload on each buffer (defense in depth EXIF).
//   3. Build SYSTEM_PROMPT + WORKOUT_LOG_PROMPT systemInstruction.
//   4. Call generateStructured<WorkoutPhotoExtraction> via gemini-client.
//   5. parseAndValidate via the manual type guard `isWorkoutPhotoShape`.
//   6. Append a low-confidence warning if confidence is heuristically low.
//
// Demo-mode short-circuit:
//   When env GEMINI_API_KEY is the placeholder shipped in .env.local, we
//   return a plausible empty extraction so the wizard stays usable end-to-end
//   without a real API key. This is gated to non-production by the env schema
//   itself (PLACEHOLDER_RE in src/env.ts forbids placeholders in prod).
//
// Logging policy: structured info on success, never log raw ai responses with
// numeric ranges (low risk, but consistent with the rest of the AI module).
// =============================================================================

import { SchemaType } from "@google/generative-ai";

import type { AppError } from "@/lib/errors";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";

import {
  anonymizeImagePreUpload,
  generateRequestId,
} from "./anonymizer";
import {
  generateStructured,
  parseAndValidate,
  type GeminiSchema,
} from "./gemini-client";
import {
  WORKOUT_LOG_PROMPT,
  WORKOUT_LOG_PROMPT_VERSION,
} from "./prompts/workout-log.prompt";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_VERSION } from "./prompts/system.prompt";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

/** Mirrors prisma.MuscleGroup enum (kept inline to avoid a Prisma type import). */
export const MUSCLE_GROUP_VALUES = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "FOREARMS",
  "ABS",
  "OBLIQUES",
  "GLUTES",
  "QUADS",
  "HAMSTRINGS",
  "CALVES",
  "NECK",
  "FULL_BODY",
] as const;

export type MuscleGroupValue = (typeof MUSCLE_GROUP_VALUES)[number];

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface DetectedExercise {
  nameEs: string;
  estimatedWeightKgMin: number | null;
  estimatedWeightKgMax: number | null;
  repRangeMin: number | null;
  repRangeMax: number | null;
  setCount: number | null;
  primaryMuscle: MuscleGroupValue | null;
  confidence: number;
}

export interface WorkoutPhotoExtraction {
  detectedExercises: DetectedExercise[];
  estimatedExperienceLevel: ExperienceLevel;
  trainingFrequencyPerWeek: number | null;
  primaryMusclesObserved: MuscleGroupValue[];
  notes: string;
  warnings: string[];
  isLikelyWorkoutLog: boolean;
}

export interface ExtractWorkoutPhotosArgs {
  /** 1..3 image buffers + mime types. Larger sets are rejected. */
  images: Array<{ buffer: Buffer; mimeType: string }>;
  /** Optional correlation id; one is generated if absent. */
  requestId?: string;
}

// -----------------------------------------------------------------------------
// JSON Schema (Gemini SDK shape)
// -----------------------------------------------------------------------------

const muscleGroupEnum = [...MUSCLE_GROUP_VALUES] as string[];

export const workoutPhotoJsonSchema: GeminiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    detectedExercises: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          nameEs: { type: SchemaType.STRING },
          estimatedWeightKgMin: { type: SchemaType.NUMBER, nullable: true },
          estimatedWeightKgMax: { type: SchemaType.NUMBER, nullable: true },
          repRangeMin: { type: SchemaType.NUMBER, nullable: true },
          repRangeMax: { type: SchemaType.NUMBER, nullable: true },
          setCount: { type: SchemaType.NUMBER, nullable: true },
          primaryMuscle: {
            type: SchemaType.STRING,
            nullable: true,
            enum: muscleGroupEnum,
          },
          confidence: { type: SchemaType.NUMBER },
        },
        required: [
          "nameEs",
          "estimatedWeightKgMin",
          "estimatedWeightKgMax",
          "repRangeMin",
          "repRangeMax",
          "setCount",
          "primaryMuscle",
          "confidence",
        ],
      },
    },
    estimatedExperienceLevel: {
      type: SchemaType.STRING,
      enum: ["beginner", "intermediate", "advanced"],
    },
    trainingFrequencyPerWeek: {
      type: SchemaType.NUMBER,
      nullable: true,
    },
    primaryMusclesObserved: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING, enum: muscleGroupEnum },
    },
    notes: { type: SchemaType.STRING },
    warnings: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    isLikelyWorkoutLog: { type: SchemaType.BOOLEAN },
  },
  required: [
    "detectedExercises",
    "estimatedExperienceLevel",
    "trainingFrequencyPerWeek",
    "primaryMusclesObserved",
    "notes",
    "warnings",
    "isLikelyWorkoutLog",
  ],
};

// -----------------------------------------------------------------------------
// Validator (manual type guard, throws on mismatch)
// -----------------------------------------------------------------------------

const MUSCLE_SET = new Set<string>(MUSCLE_GROUP_VALUES);
const EXPERIENCE_SET = new Set<string>(["beginner", "intermediate", "advanced"]);

const MAX_DETECTED_EXERCISES = 50;
const LOW_CONFIDENCE_THRESHOLD = 0.55;

function isNumberOrNull(v: unknown): v is number | null {
  return v === null || typeof v === "number";
}

function isMuscleOrNull(v: unknown): v is MuscleGroupValue | null {
  if (v === null) return true;
  return typeof v === "string" && MUSCLE_SET.has(v);
}

function validateDetectedExercise(raw: unknown, idx: number): DetectedExercise {
  if (!raw || typeof raw !== "object") {
    throw new TypeError(
      `workout extraction: detectedExercises[${idx}] must be an object`,
    );
  }
  const d = raw as Record<string, unknown>;

  if (typeof d.nameEs !== "string" || d.nameEs.length === 0) {
    throw new TypeError(
      `workout extraction: detectedExercises[${idx}].nameEs must be non-empty string`,
    );
  }
  if (!isNumberOrNull(d.estimatedWeightKgMin)) {
    throw new TypeError(
      `workout extraction: detectedExercises[${idx}].estimatedWeightKgMin must be number|null`,
    );
  }
  if (!isNumberOrNull(d.estimatedWeightKgMax)) {
    throw new TypeError(
      `workout extraction: detectedExercises[${idx}].estimatedWeightKgMax must be number|null`,
    );
  }
  if (!isNumberOrNull(d.repRangeMin)) {
    throw new TypeError(
      `workout extraction: detectedExercises[${idx}].repRangeMin must be number|null`,
    );
  }
  if (!isNumberOrNull(d.repRangeMax)) {
    throw new TypeError(
      `workout extraction: detectedExercises[${idx}].repRangeMax must be number|null`,
    );
  }
  if (!isNumberOrNull(d.setCount)) {
    throw new TypeError(
      `workout extraction: detectedExercises[${idx}].setCount must be number|null`,
    );
  }
  if (!isMuscleOrNull(d.primaryMuscle)) {
    throw new TypeError(
      `workout extraction: detectedExercises[${idx}].primaryMuscle must be MuscleGroup|null`,
    );
  }
  if (
    typeof d.confidence !== "number" ||
    d.confidence < 0 ||
    d.confidence > 1
  ) {
    throw new TypeError(
      `workout extraction: detectedExercises[${idx}].confidence must be number 0..1`,
    );
  }

  return {
    nameEs: d.nameEs,
    estimatedWeightKgMin: d.estimatedWeightKgMin as number | null,
    estimatedWeightKgMax: d.estimatedWeightKgMax as number | null,
    repRangeMin: d.repRangeMin as number | null,
    repRangeMax: d.repRangeMax as number | null,
    setCount: d.setCount as number | null,
    primaryMuscle: d.primaryMuscle as MuscleGroupValue | null,
    confidence: d.confidence,
  };
}

function isWorkoutPhotoShape(data: unknown): WorkoutPhotoExtraction {
  if (!data || typeof data !== "object") {
    throw new TypeError("workout extraction: not an object");
  }
  const d = data as Record<string, unknown>;

  if (!Array.isArray(d.detectedExercises)) {
    throw new TypeError("workout extraction: detectedExercises must be array");
  }
  if (d.detectedExercises.length > MAX_DETECTED_EXERCISES) {
    throw new TypeError(
      `workout extraction: detectedExercises exceeds max (${MAX_DETECTED_EXERCISES})`,
    );
  }
  const detected = d.detectedExercises.map(validateDetectedExercise);

  if (
    typeof d.estimatedExperienceLevel !== "string" ||
    !EXPERIENCE_SET.has(d.estimatedExperienceLevel)
  ) {
    throw new TypeError(
      "workout extraction: estimatedExperienceLevel must be beginner|intermediate|advanced",
    );
  }
  if (!isNumberOrNull(d.trainingFrequencyPerWeek)) {
    throw new TypeError(
      "workout extraction: trainingFrequencyPerWeek must be number|null",
    );
  }
  if (
    !Array.isArray(d.primaryMusclesObserved) ||
    !d.primaryMusclesObserved.every(
      (v): v is MuscleGroupValue =>
        typeof v === "string" && MUSCLE_SET.has(v),
    )
  ) {
    throw new TypeError(
      "workout extraction: primaryMusclesObserved must be MuscleGroup[]",
    );
  }
  if (typeof d.notes !== "string") {
    throw new TypeError("workout extraction: notes must be string");
  }
  if (
    !Array.isArray(d.warnings) ||
    !d.warnings.every((w): w is string => typeof w === "string")
  ) {
    throw new TypeError("workout extraction: warnings must be string[]");
  }
  if (typeof d.isLikelyWorkoutLog !== "boolean") {
    throw new TypeError("workout extraction: isLikelyWorkoutLog must be boolean");
  }

  // Soft sanity warnings (never throw).
  const softWarnings: string[] = [];
  if (
    typeof d.trainingFrequencyPerWeek === "number" &&
    (d.trainingFrequencyPerWeek < 0 || d.trainingFrequencyPerWeek > 7)
  ) {
    softWarnings.push(
      `Frecuencia semanal fuera de rango (${d.trainingFrequencyPerWeek}). Revisá manualmente.`,
    );
  }

  // Range coherence per exercise.
  for (const ex of detected) {
    if (
      ex.estimatedWeightKgMin !== null &&
      ex.estimatedWeightKgMax !== null &&
      ex.estimatedWeightKgMin > ex.estimatedWeightKgMax
    ) {
      softWarnings.push(
        `Rango de peso invertido en ${ex.nameEs}. Revisá manualmente.`,
      );
    }
    if (
      ex.repRangeMin !== null &&
      ex.repRangeMax !== null &&
      ex.repRangeMin > ex.repRangeMax
    ) {
      softWarnings.push(
        `Rango de reps invertido en ${ex.nameEs}. Revisá manualmente.`,
      );
    }
  }

  return {
    detectedExercises: detected,
    estimatedExperienceLevel: d.estimatedExperienceLevel as ExperienceLevel,
    trainingFrequencyPerWeek: d.trainingFrequencyPerWeek as number | null,
    primaryMusclesObserved: d.primaryMusclesObserved as MuscleGroupValue[],
    notes: d.notes,
    warnings: [...d.warnings, ...softWarnings],
    isLikelyWorkoutLog: d.isLikelyWorkoutLog,
  };
}

// -----------------------------------------------------------------------------
// Demo-mode helper — keeps the wizard alive when GEMINI_API_KEY is a placeholder
// -----------------------------------------------------------------------------

function isPlaceholderApiKey(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const k = process.env.GEMINI_API_KEY ?? "";
  // Tolerate both the .env.local sentinel and the more lax xxx-style placeholder.
  return (
    k.length === 0 ||
    /placeholder/i.test(k) ||
    /^AIzaSy_x+/.test(k) ||
    /^AIzaSy_xxxx/.test(k)
  );
}

function buildDemoExtraction(): WorkoutPhotoExtraction {
  return {
    detectedExercises: [],
    estimatedExperienceLevel: "intermediate",
    trainingFrequencyPerWeek: 3,
    primaryMusclesObserved: [],
    notes:
      "Modo demo: la extracción por IA no está activa. Llená los datos manualmente o configurá GEMINI_API_KEY para activarla.",
    warnings: ["GEMINI_API_KEY no configurado (modo demo)."],
    isLikelyWorkoutLog: true,
  };
}

// -----------------------------------------------------------------------------
// extractWorkoutPhotos — main entry point
// -----------------------------------------------------------------------------

export async function extractWorkoutPhotos(
  args: ExtractWorkoutPhotosArgs,
): Promise<Result<WorkoutPhotoExtraction, AppError>> {
  const { images } = args;
  const requestId = args.requestId ?? generateRequestId();

  // 1. Input shape guard.
  if (!Array.isArray(images) || images.length === 0) {
    return err(
      new ValidationError(
        "WORKOUT_PHOTOS_REQUIRED",
        "Subí al menos una imagen de tu bitácora de entrenamiento.",
      ),
    );
  }
  if (images.length > 3) {
    return err(
      new ValidationError(
        "WORKOUT_PHOTOS_TOO_MANY",
        "Máximo 3 imágenes por extracción.",
      ),
    );
  }

  // 2. Demo-mode short-circuit BEFORE any anonymization or network call.
  if (isPlaceholderApiKey()) {
    logger.warn(
      { requestId, reason: "placeholder_api_key" },
      "ai.workout_photos.demo_mode",
    );
    return ok(buildDemoExtraction());
  }

  // 3. Anonymize each image (validates mime + size + EXIF residual sniff).
  const sanitizedParts: Array<{ data: string; mimeType: string }> = [];
  for (const img of images) {
    const anon = await anonymizeImagePreUpload({
      buffer: img.buffer,
      mimeType: img.mimeType,
      type: "scale", // closest neutral type — workout images are not cedulas.
      requestId,
    });
    if (!anon.ok) return err(anon.error);
    sanitizedParts.push({
      data: anon.value.buffer.toString("base64"),
      mimeType: img.mimeType,
    });
  }

  // 4. Build user parts: each image as inlineData, then the trigger text.
  const userParts = [
    ...sanitizedParts.map((p) => ({
      inlineData: { data: p.data, mimeType: p.mimeType },
    })),
    {
      text:
        sanitizedParts.length === 1
          ? "Extraé la información estructurada de esta imagen según el schema."
          : `Extraé la información estructurada de estas ${sanitizedParts.length} imágenes según el schema.`,
    },
  ];

  // 5. Call Gemini reasoning model (richer than OCR for vocabulary inference).
  const generationResult = await generateStructured<WorkoutPhotoExtraction>({
    model: "reasoning",
    systemInstruction: `${SYSTEM_PROMPT}\n\n${WORKOUT_LOG_PROMPT}`,
    userParts,
    schema: workoutPhotoJsonSchema,
    temperature: 0.2,
    requestId,
  });

  if (!generationResult.ok) return err(generationResult.error);

  // 6. Parse + validate.
  const validated = parseAndValidate<WorkoutPhotoExtraction>(
    generationResult.value.raw,
    isWorkoutPhotoShape,
    requestId,
  );
  if (!validated.ok) return err(validated.error);

  let extraction = validated.value;

  // 7. Belt-and-braces: if the model says it isn't a workout log, blank out
  //    detected data so callers never propagate phantom exercises.
  if (!extraction.isLikelyWorkoutLog) {
    extraction = {
      ...extraction,
      detectedExercises: [],
      trainingFrequencyPerWeek: null,
      primaryMusclesObserved: [],
    };
  }

  // 8. Append a low-confidence warning if the average exercise confidence is low.
  const meaningfulExercises = extraction.detectedExercises.filter(
    (e) => e.confidence > 0,
  );
  const avgConfidence =
    meaningfulExercises.length > 0
      ? meaningfulExercises.reduce((acc, e) => acc + e.confidence, 0) /
        meaningfulExercises.length
      : 0;

  if (
    extraction.isLikelyWorkoutLog &&
    meaningfulExercises.length > 0 &&
    avgConfidence < LOW_CONFIDENCE_THRESHOLD
  ) {
    extraction = {
      ...extraction,
      warnings: [
        ...extraction.warnings,
        `Confianza promedio baja (${avgConfidence.toFixed(
          2,
        )}). Recomendado revisar manualmente o reintentar con fotos más nítidas.`,
      ],
    };
  }

  logger.info(
    {
      requestId,
      systemPromptVersion: SYSTEM_PROMPT_VERSION,
      workoutPromptVersion: WORKOUT_LOG_PROMPT_VERSION,
      latencyMs: generationResult.value.latencyMs,
      attempts: generationResult.value.attempts,
      modelId: generationResult.value.modelId,
      imageCount: sanitizedParts.length,
      // Aggregate, non-PII metadata only.
      detectedCount: extraction.detectedExercises.length,
      isLikelyWorkoutLog: extraction.isLikelyWorkoutLog,
      experienceLevel: extraction.estimatedExperienceLevel,
      trainingFrequencyPerWeek: extraction.trainingFrequencyPerWeek,
      muscleGroupsCount: extraction.primaryMusclesObserved.length,
      warningCount: extraction.warnings.length,
      avgConfidence: Number(avgConfidence.toFixed(3)),
    },
    "ai.workout_photos.extracted",
  );

  return ok(extraction);
}
