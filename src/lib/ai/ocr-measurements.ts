// =============================================================================
// BLACKLINE FITNESS — OCR body measurements (anthropometry + composition)
// Owner: ai-orchestrator.
//
// Public API:
//   extractMeasurements({ imageBuffer, mimeType }) -> Result<MeasurementsExtraction, AppError>
//
// Schema covers two domains:
//   1. Anthropometry — body circumferences in centimetres.
//   2. Composition   — weight, body fat, muscle mass, visceral fat, BMR.
// =============================================================================

import { SchemaType } from "@google/generative-ai";

import type { GeminiSchema } from "./gemini-client";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface MeasurementsExtraction {
  isValidMeasurement: boolean;
  // Anthropometry
  neckCm: number | null;
  shoulderLeftCm: number | null;
  shoulderRightCm: number | null;
  chestCm: number | null;
  abdomenCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  gluteLeftCm: number | null;
  gluteRightCm: number | null;
  bicepLeftCm: number | null;
  bicepRightCm: number | null;
  forearmLeftCm: number | null;
  forearmRightCm: number | null;
  thighLeftCm: number | null;
  thighRightCm: number | null;
  hamstringLeftCm: number | null;
  hamstringRightCm: number | null;
  calfLeftCm: number | null;
  calfRightCm: number | null;
  // Composition
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  visceralFat: number | null;
  basalMetabolicRate: number | null;
  // Meta
  confidence: number;
  warnings: string[];
}

// -----------------------------------------------------------------------------
// JSON Schema
// -----------------------------------------------------------------------------

const NULLABLE_NUMBER = {
  type: SchemaType.NUMBER,
  nullable: true,
} as const;

const NULLABLE_INTEGER = {
  type: SchemaType.INTEGER,
  nullable: true,
} as const;

export const measurementsJsonSchema: GeminiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    isValidMeasurement: { type: SchemaType.BOOLEAN },
    // Anthropometry
    neckCm: NULLABLE_NUMBER,
    shoulderLeftCm: NULLABLE_NUMBER,
    shoulderRightCm: NULLABLE_NUMBER,
    chestCm: NULLABLE_NUMBER,
    abdomenCm: NULLABLE_NUMBER,
    waistCm: NULLABLE_NUMBER,
    hipCm: NULLABLE_NUMBER,
    gluteLeftCm: NULLABLE_NUMBER,
    gluteRightCm: NULLABLE_NUMBER,
    bicepLeftCm: NULLABLE_NUMBER,
    bicepRightCm: NULLABLE_NUMBER,
    forearmLeftCm: NULLABLE_NUMBER,
    forearmRightCm: NULLABLE_NUMBER,
    thighLeftCm: NULLABLE_NUMBER,
    thighRightCm: NULLABLE_NUMBER,
    hamstringLeftCm: NULLABLE_NUMBER,
    hamstringRightCm: NULLABLE_NUMBER,
    calfLeftCm: NULLABLE_NUMBER,
    calfRightCm: NULLABLE_NUMBER,
    // Composition
    weightKg: NULLABLE_NUMBER,
    bodyFatPct: NULLABLE_NUMBER,
    muscleMassKg: NULLABLE_NUMBER,
    visceralFat: NULLABLE_INTEGER,
    basalMetabolicRate: NULLABLE_INTEGER,
    // Meta
    confidence: { type: SchemaType.NUMBER },
    warnings: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: [
    "isValidMeasurement",
    "neckCm",
    "shoulderLeftCm",
    "shoulderRightCm",
    "chestCm",
    "abdomenCm",
    "waistCm",
    "hipCm",
    "gluteLeftCm",
    "gluteRightCm",
    "bicepLeftCm",
    "bicepRightCm",
    "forearmLeftCm",
    "forearmRightCm",
    "thighLeftCm",
    "thighRightCm",
    "hamstringLeftCm",
    "hamstringRightCm",
    "calfLeftCm",
    "calfRightCm",
    "weightKg",
    "bodyFatPct",
    "muscleMassKg",
    "visceralFat",
    "basalMetabolicRate",
    "confidence",
    "warnings",
  ],
};
