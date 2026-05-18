// =============================================================================
// BLACKLINE FITNESS — AI module barrel
// Owner: ai-orchestrator.
//
// Public surface for backend-api consumers. Internals (gemini-client retry,
// anonymizer details, prompt strings) are NOT re-exported here on purpose —
// callers should not depend on prompt versioning to remain stable.
// =============================================================================

export {
  extractCedula,
  cedulaJsonSchema,
  type CedulaExtraction,
  type ExtractCedulaArgs,
  type Sex,
} from "./ocr-cedula";

export {
  extractScale,
  scaleJsonSchema,
  type ScaleExtraction,
  type ExtractScaleArgs,
  type CropRegion,
} from "./ocr-scale";

export {
  extractWorkoutPhotos,
  workoutPhotoJsonSchema,
  MUSCLE_GROUP_VALUES,
  type WorkoutPhotoExtraction,
  type ExtractWorkoutPhotosArgs,
  type DetectedExercise,
  type ExperienceLevel,
  type MuscleGroupValue,
} from "./extract-workout-photos";

export {
  generateStructured,
  parseAndValidate,
  getModel,
  type GenerateStructuredArgs,
  type GenerateStructuredResult,
  type GeminiSchema,
  type ModelKind,
  type UserPart,
} from "./gemini-client";

export {
  generateRequestId,
  redactForLogs,
  type AnonymizeKind,
} from "./anonymizer";
