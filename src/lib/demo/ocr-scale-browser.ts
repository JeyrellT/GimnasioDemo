"use client";

import type { ScaleData } from "@/types/profile";
import { generateStructured, parseAndValidate } from "./gemini-browser";

const SYSTEM_PROMPT = `Sos un asistente de OCR especializado en básculas de composición corporal.
Analizá la foto y extraé las métricas que aparezcan en la pantalla de la báscula.
Solo devolvé valores que puedas leer con confianza. Si un campo no aparece, omitilo.
Respondé en JSON con el schema indicado.`;

// String literals match the Gemini API's SchemaType enum values, avoiding a
// runtime import of @google/generative-ai (which would pull the entire SDK
// into any chunk that references this file).
const SCALE_SCHEMA = {
  type: "OBJECT" as const,
  properties: {
    weightKg: {
      type: "NUMBER" as const,
      description: "Peso en kilogramos",
      nullable: true,
    },
    bodyFatPct: {
      type: "NUMBER" as const,
      description: "Porcentaje de grasa corporal",
      nullable: true,
    },
    muscleMassKg: {
      type: "NUMBER" as const,
      description: "Masa muscular en kilogramos",
      nullable: true,
    },
    visceralFat: {
      type: "NUMBER" as const,
      description: "Nivel de grasa visceral",
      nullable: true,
    },
    basalMetabolicRate: {
      type: "NUMBER" as const,
      description: "Metabolismo basal en kcal",
      nullable: true,
    },
    confidence: {
      type: "NUMBER" as const,
      description: "Nivel de confianza de la lectura (0 a 1)",
    },
  },
  required: ["confidence"],
};

interface ScaleExtraction {
  weightKg?: number | null;
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  visceralFat?: number | null;
  basalMetabolicRate?: number | null;
  confidence: number;
}

function isScaleShape(data: unknown): ScaleExtraction {
  if (!data || typeof data !== "object") {
    throw new Error("Respuesta vacía del modelo");
  }
  const d = data as Record<string, unknown>;
  const confidence =
    typeof d.confidence === "number" ? d.confidence : 0.5;
  return {
    weightKg: typeof d.weightKg === "number" ? d.weightKg : undefined,
    bodyFatPct: typeof d.bodyFatPct === "number" ? d.bodyFatPct : undefined,
    muscleMassKg:
      typeof d.muscleMassKg === "number" ? d.muscleMassKg : undefined,
    visceralFat:
      typeof d.visceralFat === "number" ? d.visceralFat : undefined,
    basalMetabolicRate:
      typeof d.basalMetabolicRate === "number"
        ? d.basalMetabolicRate
        : undefined,
    confidence,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function extractScaleBrowser(
  file: File,
): Promise<{ data: ScaleData; confidence: number }> {
  const base64 = await fileToBase64(file);
  const mimeType = file.type || "image/jpeg";

  const result = await generateStructured<ScaleExtraction>({
    model: "ocr",
    systemInstruction: SYSTEM_PROMPT,
    userParts: [
      {
        inlineData: { mimeType, data: base64 },
      },
      {
        text: "Extraé todas las métricas visibles en esta foto de báscula.",
      },
    ],
    schema: SCALE_SCHEMA,
    temperature: 0,
    requestId: `scale-ocr-${Date.now()}`,
  });

  if (!result.ok) {
    const failedResult = result as { ok: false; error: { message: string } };
    throw new Error(failedResult.error.message);
  }

  const parsed = parseAndValidate<ScaleExtraction>(
    result.value.raw,
    isScaleShape,
  );

  if (!parsed.ok) {
    const failedParsed = parsed as { ok: false; error: { message: string } };
    throw new Error(failedParsed.error.message);
  }

  const extraction = parsed.value;

  const data: ScaleData = {};
  if (extraction.weightKg != null) data.weightKg = extraction.weightKg;
  if (extraction.bodyFatPct != null) data.bodyFatPct = extraction.bodyFatPct;
  if (extraction.muscleMassKg != null)
    data.muscleMassKg = extraction.muscleMassKg;
  if (extraction.visceralFat != null)
    data.visceralFat = extraction.visceralFat;
  if (extraction.basalMetabolicRate != null)
    data.basalMetabolicRate = extraction.basalMetabolicRate;
  data.confidence = extraction.confidence;

  return { data, confidence: extraction.confidence };
}
