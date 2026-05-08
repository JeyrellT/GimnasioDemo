// =============================================================================
// VIZION — OCR scale display (bioimpedance bathroom scales)
// Owner: ai-orchestrator.
//
// Public API:
//   extractScale({ imageBuffer, mimeType, cropRegion? }) -> Result<ScaleExtraction, AppError>
//
// Pipeline mirrors ocr-cedula.ts:
//   1. Validate mime + size.
//   2. anonymizeImagePreUpload (defense-in-depth, no pixel ops in MVP).
//   3. generateStructured + parseAndValidate.
//   4. Low-confidence warning when confidence < 0.6.
//   5. Logs do NOT include weights/metrics — those are personal health data.
//
// cropRegion (optional) is a hint passed to the prompt as text. We do NOT
// cut pixels here; the client may send a pre-cropped buffer if it wants
// pixel-level cropping (TODO in V1.1).
// =============================================================================

import { SchemaType } from "@google/generative-ai";

import type { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";

import {
  anonymizeImagePreUpload,
  redactForLogs,
} from "./anonymizer";
import {
  generateStructured,
  parseAndValidate,
  type GeminiSchema,
} from "./gemini-client";
import { SCALE_PROMPT, SCALE_PROMPT_VERSION } from "./prompts/scale.prompt";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_VERSION } from "./prompts/system.prompt";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface CropRegion {
  /** Normalized 0..1 coordinates of the display region inside the source image. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScaleExtraction {
  isValidScale: boolean;
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassPct: number | null;
  muscleMassKg: number | null;
  waterPct: number | null;
  boneMassKg: number | null;
  metabolicAge: number | null;
  visceralFat: number | null;
  bmrKcal: number | null;
  bodyTypeRating: string | null;
  confidence: number;
  warnings: string[];
}

export interface ExtractScaleArgs {
  imageBuffer: Buffer;
  mimeType: string;
  cropRegion?: CropRegion;
  requestId?: string;
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

export const scaleJsonSchema: GeminiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    isValidScale: { type: SchemaType.BOOLEAN },
    weightKg: NULLABLE_NUMBER,
    bodyFatPct: NULLABLE_NUMBER,
    muscleMassPct: NULLABLE_NUMBER,
    muscleMassKg: NULLABLE_NUMBER,
    waterPct: NULLABLE_NUMBER,
    boneMassKg: NULLABLE_NUMBER,
    metabolicAge: NULLABLE_INTEGER,
    visceralFat: NULLABLE_INTEGER,
    bmrKcal: NULLABLE_INTEGER,
    bodyTypeRating: {
      type: SchemaType.STRING,
      nullable: true,
    },
    confidence: { type: SchemaType.NUMBER },
    warnings: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: [
    "isValidScale",
    "weightKg",
    "bodyFatPct",
    "muscleMassPct",
    "muscleMassKg",
    "waterPct",
    "boneMassKg",
    "metabolicAge",
    "visceralFat",
    "bmrKcal",
    "bodyTypeRating",
    "confidence",
    "warnings",
  ],
};

// -----------------------------------------------------------------------------
// Validator
// -----------------------------------------------------------------------------

function isNumberOrNull(v: unknown): v is number | null {
  return v === null || typeof v === "number";
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

function isScaleShape(data: unknown): ScaleExtraction {
  if (!data || typeof data !== "object") {
    throw new TypeError("scale extraction: not an object");
  }
  const d = data as Record<string, unknown>;

  if (typeof d.isValidScale !== "boolean") {
    throw new TypeError("scale extraction: isValidScale must be boolean");
  }

  const numericKeys = [
    "weightKg",
    "bodyFatPct",
    "muscleMassPct",
    "muscleMassKg",
    "waterPct",
    "boneMassKg",
    "metabolicAge",
    "visceralFat",
    "bmrKcal",
  ] as const;

  for (const key of numericKeys) {
    if (!isNumberOrNull(d[key])) {
      throw new TypeError(`scale extraction: ${key} must be number|null`);
    }
  }

  if (!isStringOrNull(d.bodyTypeRating)) {
    throw new TypeError("scale extraction: bodyTypeRating must be string|null");
  }

  if (
    typeof d.confidence !== "number" ||
    d.confidence < 0 ||
    d.confidence > 1
  ) {
    throw new TypeError("scale extraction: confidence must be number 0..1");
  }
  if (
    !Array.isArray(d.warnings) ||
    !d.warnings.every((w) => typeof w === "string")
  ) {
    throw new TypeError("scale extraction: warnings must be string[]");
  }

  // Sanity range checks — surface as warnings, never throw.
  const softWarnings: string[] = [];
  if (typeof d.weightKg === "number" && (d.weightKg < 20 || d.weightKg > 350)) {
    softWarnings.push(
      `Peso fuera de rango plausible (${d.weightKg} kg). Verificá la lectura.`,
    );
  }
  if (
    typeof d.bodyFatPct === "number" &&
    (d.bodyFatPct < 2 || d.bodyFatPct > 70)
  ) {
    softWarnings.push(
      `Grasa corporal fuera de rango plausible (${d.bodyFatPct}%).`,
    );
  }
  if (
    typeof d.visceralFat === "number" &&
    (d.visceralFat < 1 || d.visceralFat > 59)
  ) {
    softWarnings.push(`Grasa visceral fuera de rango Tanita (1..59).`);
  }

  return {
    isValidScale: d.isValidScale,
    weightKg: d.weightKg as number | null,
    bodyFatPct: d.bodyFatPct as number | null,
    muscleMassPct: d.muscleMassPct as number | null,
    muscleMassKg: d.muscleMassKg as number | null,
    waterPct: d.waterPct as number | null,
    boneMassKg: d.boneMassKg as number | null,
    metabolicAge: d.metabolicAge as number | null,
    visceralFat: d.visceralFat as number | null,
    bmrKcal: d.bmrKcal as number | null,
    bodyTypeRating: d.bodyTypeRating,
    confidence: d.confidence,
    warnings: [...d.warnings, ...softWarnings],
  };
}

// -----------------------------------------------------------------------------
// extractScale — main entry point
// -----------------------------------------------------------------------------

const LOW_CONFIDENCE_THRESHOLD = 0.6;
const SYSTEM_INSTRUCTION = `${SYSTEM_PROMPT}\n\n${SCALE_PROMPT}`;

function buildUserText(crop?: CropRegion): string {
  if (!crop) return "Extraé las métricas que muestre el display:";
  return [
    "Extraé las métricas que muestre el display.",
    `Pista: el display ocupa la región normalizada x=${crop.x.toFixed(
      3,
    )} y=${crop.y.toFixed(3)} w=${crop.width.toFixed(
      3,
    )} h=${crop.height.toFixed(
      3,
    )} (coords 0..1 desde la esquina superior izquierda).`,
  ].join(" ");
}

export async function extractScale(
  args: ExtractScaleArgs,
): Promise<Result<ScaleExtraction, AppError>> {
  const { imageBuffer, mimeType, cropRegion } = args;

  const anonResult = await anonymizeImagePreUpload({
    buffer: imageBuffer,
    mimeType,
    type: "scale",
    requestId: args.requestId,
  });
  if (!anonResult.ok) return err(anonResult.error);

  const { buffer, requestId } = anonResult.value;
  const base64 = buffer.toString("base64");

  const generationResult = await generateStructured<ScaleExtraction>({
    model: "ocr",
    systemInstruction: SYSTEM_INSTRUCTION,
    userParts: [
      { inlineData: { data: base64, mimeType } },
      { text: buildUserText(cropRegion) },
    ],
    schema: scaleJsonSchema,
    temperature: 0,
    requestId,
  });

  if (!generationResult.ok) return err(generationResult.error);

  const validated = parseAndValidate<ScaleExtraction>(
    generationResult.value.raw,
    isScaleShape,
    requestId,
  );
  if (!validated.ok) return err(validated.error);

  let extraction = validated.value;

  if (
    extraction.confidence < LOW_CONFIDENCE_THRESHOLD &&
    extraction.isValidScale
  ) {
    extraction = {
      ...extraction,
      warnings: [
        ...extraction.warnings,
        `Confianza baja (${extraction.confidence.toFixed(
          2,
        )}). Recomendado reintentar con foto más cercana o mejor iluminación.`,
      ],
    };
  }

  if (!extraction.isValidScale) {
    extraction = {
      ...extraction,
      weightKg: null,
      bodyFatPct: null,
      muscleMassPct: null,
      muscleMassKg: null,
      waterPct: null,
      boneMassKg: null,
      metabolicAge: null,
      visceralFat: null,
      bmrKcal: null,
      bodyTypeRating: null,
    };
  }

  logger.info(
    {
      requestId,
      systemPromptVersion: SYSTEM_PROMPT_VERSION,
      scalePromptVersion: SCALE_PROMPT_VERSION,
      latencyMs: generationResult.value.latencyMs,
      attempts: generationResult.value.attempts,
      modelId: generationResult.value.modelId,
      hasCropHint: cropRegion !== undefined,
      // Body metrics are personal health data — never log raw values.
      isValidScale: extraction.isValidScale,
      confidence: extraction.confidence,
      ...redactForLogs({
        warnings: extraction.warnings,
      } as unknown as Record<string, unknown>),
    },
    "ai.ocr.scale.extracted",
  );

  return ok(extraction);
}
