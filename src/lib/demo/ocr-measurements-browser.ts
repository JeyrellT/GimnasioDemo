// =============================================================================
// BLACKLINE FITNESS — Browser-compatible measurements OCR (demo mode)
// Owner: frontend-react.
//
// Browser wrapper for anthropometry + composition extraction.
// Mirrors ocr-scale-browser.ts — uses gemini-browser.ts instead of the
// server-side gemini-client.ts, and FileReader instead of Node.js Buffer.
//
// Public API:
//   extractMeasurementsBrowser(file: File)
//     -> Promise<{ data: MeasurementsExtraction; confidence: number }>
//
// Throws on OCR failure — caller is responsible for catching.
// =============================================================================

"use client";

import type { AppError } from "@/lib/errors";
import type { Result } from "@/lib/result";

import {
  generateStructured,
  parseAndValidate,
  type GenerateStructuredResult,
} from "./gemini-browser";
import { measurementsJsonSchema } from "../ai/ocr-measurements";
import type { MeasurementsExtraction } from "../ai/ocr-measurements";
import { MEASUREMENTS_PROMPT } from "../ai/prompts/measurements.prompt";
import { SYSTEM_PROMPT } from "../ai/prompts/system.prompt";

// -----------------------------------------------------------------------------
// Private: shape validator
// -----------------------------------------------------------------------------

function isNumberOrNull(v: unknown): v is number | null {
  return v === null || typeof v === "number";
}

const ANTHROPOMETRY_KEYS = [
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
] as const;

const COMPOSITION_KEYS = [
  "weightKg",
  "bodyFatPct",
  "muscleMassKg",
  "visceralFat",
  "basalMetabolicRate",
] as const;

function validateMeasurementsShape(data: unknown): MeasurementsExtraction {
  if (!data || typeof data !== "object") {
    throw new TypeError("measurements extraction: not an object");
  }
  const d = data as Record<string, unknown>;

  if (typeof d.isValidMeasurement !== "boolean") {
    throw new TypeError(
      "measurements extraction: isValidMeasurement must be boolean",
    );
  }

  for (const key of [...ANTHROPOMETRY_KEYS, ...COMPOSITION_KEYS]) {
    if (!isNumberOrNull(d[key])) {
      throw new TypeError(
        `measurements extraction: ${key} must be number|null`,
      );
    }
  }

  if (
    typeof d.confidence !== "number" ||
    d.confidence < 0 ||
    d.confidence > 1
  ) {
    throw new TypeError(
      "measurements extraction: confidence must be number 0..1",
    );
  }

  if (
    !Array.isArray(d.warnings) ||
    !d.warnings.every((w) => typeof w === "string")
  ) {
    throw new TypeError("measurements extraction: warnings must be string[]");
  }

  // Soft sanity checks — surface as warnings, never throw.
  const softWarnings: string[] = [];
  if (
    typeof d.weightKg === "number" &&
    (d.weightKg < 20 || d.weightKg > 350)
  ) {
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
  for (const key of ANTHROPOMETRY_KEYS) {
    if (typeof d[key] === "number" && ((d[key] as number) < 5 || (d[key] as number) > 250)) {
      softWarnings.push(
        `${key} fuera de rango plausible (${d[key]} cm). Verificá la lectura.`,
      );
    }
  }

  return {
    isValidMeasurement: d.isValidMeasurement,
    neckCm: d.neckCm as number | null,
    shoulderLeftCm: d.shoulderLeftCm as number | null,
    shoulderRightCm: d.shoulderRightCm as number | null,
    chestCm: d.chestCm as number | null,
    abdomenCm: d.abdomenCm as number | null,
    waistCm: d.waistCm as number | null,
    hipCm: d.hipCm as number | null,
    gluteLeftCm: d.gluteLeftCm as number | null,
    gluteRightCm: d.gluteRightCm as number | null,
    bicepLeftCm: d.bicepLeftCm as number | null,
    bicepRightCm: d.bicepRightCm as number | null,
    forearmLeftCm: d.forearmLeftCm as number | null,
    forearmRightCm: d.forearmRightCm as number | null,
    thighLeftCm: d.thighLeftCm as number | null,
    thighRightCm: d.thighRightCm as number | null,
    hamstringLeftCm: d.hamstringLeftCm as number | null,
    hamstringRightCm: d.hamstringRightCm as number | null,
    calfLeftCm: d.calfLeftCm as number | null,
    calfRightCm: d.calfRightCm as number | null,
    weightKg: d.weightKg as number | null,
    bodyFatPct: d.bodyFatPct as number | null,
    muscleMassKg: d.muscleMassKg as number | null,
    visceralFat: d.visceralFat as number | null,
    basalMetabolicRate: d.basalMetabolicRate as number | null,
    confidence: d.confidence,
    warnings: [...(d.warnings as string[]), ...softWarnings],
  };
}

// -----------------------------------------------------------------------------
// Private: File → base64 via FileReader
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
// Public: extractMeasurementsBrowser
// -----------------------------------------------------------------------------

const LOW_CONFIDENCE_THRESHOLD = 0.6;
const SYSTEM_INSTRUCTION = `${SYSTEM_PROMPT}\n\n${MEASUREMENTS_PROMPT}`;

export async function extractMeasurementsBrowser(
  file: File,
): Promise<{ data: MeasurementsExtraction; confidence: number }> {
  const base64 = await fileToBase64(file);

  const generationResult: Result<
    GenerateStructuredResult<MeasurementsExtraction>,
    AppError
  > = await generateStructured<MeasurementsExtraction>({
    model: "ocr",
    systemInstruction: SYSTEM_INSTRUCTION,
    userParts: [
      { inlineData: { data: base64, mimeType: file.type } },
      { text: "Extraé las medidas corporales que aparezcan en la imagen:" },
    ],
    schema: measurementsJsonSchema,
    temperature: 0,
  });

  if (!generationResult.ok) {
    const failure = generationResult as { ok: false; error: AppError };
    const errMsg =
      failure.error instanceof Error
        ? failure.error.message
        : String(failure.error ?? "Error al procesar la imagen.");
    throw new Error(errMsg);
  }

  const validated: Result<MeasurementsExtraction, AppError> =
    parseAndValidate<MeasurementsExtraction>(
      generationResult.value.raw,
      validateMeasurementsShape,
    );

  if (!validated.ok) {
    const failure = validated as { ok: false; error: AppError };
    const errMsg =
      failure.error instanceof Error
        ? failure.error.message
        : String(failure.error ?? "La respuesta de IA no fue válida.");
    throw new Error(errMsg);
  }

  let extraction = validated.value;

  if (!extraction.isValidMeasurement) {
    throw new Error(
      "La imagen no contiene medidas corporales reconocibles. Subí una foto de una hoja de evaluación, una cinta métrica o una pantalla de báscula.",
    );
  }

  if (extraction.confidence < LOW_CONFIDENCE_THRESHOLD) {
    extraction = {
      ...extraction,
      warnings: [
        ...extraction.warnings,
        `Confianza baja (${extraction.confidence.toFixed(2)}). Revisá los valores antes de guardar.`,
      ],
    };
  }

  return { data: extraction, confidence: extraction.confidence };
}
