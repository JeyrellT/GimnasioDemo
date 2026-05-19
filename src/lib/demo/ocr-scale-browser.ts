// =============================================================================
// BLACKLINE FITNESS — Browser-compatible scale OCR (demo mode)
// Owner: frontend-react.
//
// Browser wrapper around the server-side extractScale pipeline.
// Uses the browser Gemini client (gemini-browser.ts) instead of the server
// gemini-client.ts, and FileReader instead of Node.js Buffer.
//
// Public API:
//   extractScaleBrowser(file: File) -> Promise<{ data: ScaleData; confidence: number }>
//
// Throws on OCR failure — caller is responsible for catching.
// =============================================================================

"use client";

import type { AppError } from "@/lib/errors";
import type { Result } from "@/lib/result";
import type { ScaleData } from "@/types/profile";

import { generateStructured, parseAndValidate, type GenerateStructuredResult } from "./gemini-browser";
import { scaleJsonSchema } from "../ai/ocr-scale";
import { SCALE_PROMPT } from "../ai/prompts/scale.prompt";
import { SYSTEM_PROMPT } from "../ai/prompts/system.prompt";

// -----------------------------------------------------------------------------
// Private: inline validator (mirrors isScaleShape from ocr-scale.ts but
// we re-export it here to avoid importing a Node-only module)
// -----------------------------------------------------------------------------

interface ScaleExtraction {
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

function isNumberOrNull(v: unknown): v is number | null {
  return v === null || typeof v === "number";
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

function validateScaleShape(data: unknown): ScaleExtraction {
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
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

// -----------------------------------------------------------------------------
// Public: extractScaleBrowser
// -----------------------------------------------------------------------------

const LOW_CONFIDENCE_THRESHOLD = 0.6;
const SYSTEM_INSTRUCTION = `${SYSTEM_PROMPT}\n\n${SCALE_PROMPT}`;

export async function extractScaleBrowser(
  file: File,
): Promise<{ data: ScaleData; confidence: number }> {
  const base64 = await fileToBase64(file);

  const generationResult: Result<GenerateStructuredResult<ScaleExtraction>, AppError> =
    await generateStructured<ScaleExtraction>({
      model: "ocr",
      systemInstruction: SYSTEM_INSTRUCTION,
      userParts: [
        { inlineData: { data: base64, mimeType: file.type } },
        { text: "Extraé las métricas que muestre el display:" },
      ],
      schema: scaleJsonSchema,
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

  const validated: Result<ScaleExtraction, AppError> = parseAndValidate<ScaleExtraction>(
    generationResult.value.raw,
    validateScaleShape,
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

  if (!extraction.isValidScale) {
    throw new Error(
      "La imagen no parece ser el display de una báscula. Tomá una foto más cercana al display.",
    );
  }

  if (extraction.confidence < LOW_CONFIDENCE_THRESHOLD) {
    extraction = {
      ...extraction,
      warnings: [
        ...extraction.warnings,
        `Confianza baja (${extraction.confidence.toFixed(2)}). Recomendado reintentar con foto más cercana o mejor iluminación.`,
      ],
    };
  }

  // Map ScaleExtraction → ScaleData
  const data: ScaleData = {
    weightKg: extraction.weightKg ?? undefined,
    bodyFatPct: extraction.bodyFatPct ?? undefined,
    muscleMassKg: extraction.muscleMassKg ?? undefined,
    visceralFat: extraction.visceralFat != null ? (extraction.visceralFat as number) : undefined,
    basalMetabolicRate: extraction.bmrKcal != null ? (extraction.bmrKcal as number) : undefined,
    confidence: extraction.confidence,
  };

  return { data, confidence: extraction.confidence };
}
