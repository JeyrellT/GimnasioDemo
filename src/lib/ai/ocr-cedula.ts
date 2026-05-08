// =============================================================================
// VIZION — OCR cedula de identidad CR
// Owner: ai-orchestrator.
//
// Public API:
//   extractCedula({ imageBuffer, mimeType }) -> Result<CedulaExtraction, AppError>
//
// Pipeline:
//   1. Validate mime + size (delegated to anonymizer.validateBuffer).
//   2. Run anonymizeImagePreUpload (defense-in-depth EXIF check).
//   3. Build SYSTEM_PROMPT + CEDULA_PROMPT systemInstruction.
//   4. Call generateStructured<CedulaExtraction> with the JSON Schema below.
//   5. parseAndValidate via the manual type guard `isCedulaShape`.
//   6. Append a low-confidence warning if confidence < 0.6.
//   7. Log redacted metadata. NEVER log the cedula itself.
//
// Encryption of the extracted number is handled downstream by
// cybersecurity-auditor (`@/lib/crypto/aes-gcm.ts`) into ClientProfile.encryptedCedula.
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
import { CEDULA_PROMPT, CEDULA_PROMPT_VERSION } from "./prompts/cedula.prompt";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_VERSION } from "./prompts/system.prompt";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export type Sex = "M" | "F";

export interface CedulaExtraction {
  isValidId: boolean;
  tipo: "cedula_cr_v2025";
  numeroCedula: string | null;
  primerApellido: string | null;
  segundoApellido: string | null;
  nombre: string | null;
  fechaNacimiento: string | null;
  fechaVencimiento: string | null;
  sexo: Sex | null;
  confidence: number;
  warnings: string[];
}

export interface ExtractCedulaArgs {
  imageBuffer: Buffer;
  mimeType: string;
  /** Optional correlation id; one is generated if absent. */
  requestId?: string;
}

// -----------------------------------------------------------------------------
// JSON Schema (Gemini SDK shape)
// -----------------------------------------------------------------------------

export const cedulaJsonSchema: GeminiSchema = {
  type: SchemaType.OBJECT,
  properties: {
    isValidId: { type: SchemaType.BOOLEAN },
    tipo: { type: SchemaType.STRING, enum: ["cedula_cr_v2025"] },
    numeroCedula: {
      type: SchemaType.STRING,
      nullable: true,
      description: "Formato N-NNNN-NNNN. null si ilegible.",
    },
    primerApellido: { type: SchemaType.STRING, nullable: true },
    segundoApellido: { type: SchemaType.STRING, nullable: true },
    nombre: { type: SchemaType.STRING, nullable: true },
    fechaNacimiento: {
      type: SchemaType.STRING,
      nullable: true,
      description: "ISO 8601 YYYY-MM-DD",
    },
    fechaVencimiento: {
      type: SchemaType.STRING,
      nullable: true,
      description: "ISO 8601 YYYY-MM-DD",
    },
    sexo: {
      type: SchemaType.STRING,
      nullable: true,
      enum: ["M", "F"],
    },
    confidence: { type: SchemaType.NUMBER },
    warnings: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: [
    "isValidId",
    "tipo",
    "numeroCedula",
    "primerApellido",
    "segundoApellido",
    "nombre",
    "fechaNacimiento",
    "fechaVencimiento",
    "sexo",
    "confidence",
    "warnings",
  ],
};

// -----------------------------------------------------------------------------
// Type guard / validator
// -----------------------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CEDULA_RE = /^\d-\d{4}-\d{4}$/;

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

function isCedulaShape(data: unknown): CedulaExtraction {
  if (!data || typeof data !== "object") {
    throw new TypeError("cedula extraction: not an object");
  }
  const d = data as Record<string, unknown>;

  if (typeof d.isValidId !== "boolean") {
    throw new TypeError("cedula extraction: isValidId must be boolean");
  }
  if (d.tipo !== "cedula_cr_v2025") {
    throw new TypeError("cedula extraction: tipo must be 'cedula_cr_v2025'");
  }
  if (!isStringOrNull(d.numeroCedula)) {
    throw new TypeError("cedula extraction: numeroCedula must be string|null");
  }
  if (!isStringOrNull(d.primerApellido)) {
    throw new TypeError("cedula extraction: primerApellido must be string|null");
  }
  if (!isStringOrNull(d.segundoApellido)) {
    throw new TypeError(
      "cedula extraction: segundoApellido must be string|null",
    );
  }
  if (!isStringOrNull(d.nombre)) {
    throw new TypeError("cedula extraction: nombre must be string|null");
  }
  if (!isStringOrNull(d.fechaNacimiento)) {
    throw new TypeError(
      "cedula extraction: fechaNacimiento must be string|null",
    );
  }
  if (!isStringOrNull(d.fechaVencimiento)) {
    throw new TypeError(
      "cedula extraction: fechaVencimiento must be string|null",
    );
  }
  if (!(d.sexo === null || d.sexo === "M" || d.sexo === "F")) {
    throw new TypeError("cedula extraction: sexo must be 'M'|'F'|null");
  }
  if (typeof d.confidence !== "number" || d.confidence < 0 || d.confidence > 1) {
    throw new TypeError("cedula extraction: confidence must be number 0..1");
  }
  if (!Array.isArray(d.warnings) || !d.warnings.every((w) => typeof w === "string")) {
    throw new TypeError("cedula extraction: warnings must be string[]");
  }

  // Soft format checks — turn into warnings rather than throws.
  const softWarnings: string[] = [];
  if (d.numeroCedula && !CEDULA_RE.test(d.numeroCedula)) {
    softWarnings.push(
      "Formato de número de cédula inesperado (esperado N-NNNN-NNNN).",
    );
  }
  if (d.fechaNacimiento && !ISO_DATE_RE.test(d.fechaNacimiento)) {
    softWarnings.push("fechaNacimiento no está en formato ISO YYYY-MM-DD.");
  }
  if (d.fechaVencimiento && !ISO_DATE_RE.test(d.fechaVencimiento)) {
    softWarnings.push("fechaVencimiento no está en formato ISO YYYY-MM-DD.");
  }

  return {
    isValidId: d.isValidId,
    tipo: "cedula_cr_v2025",
    numeroCedula: d.numeroCedula,
    primerApellido: d.primerApellido,
    segundoApellido: d.segundoApellido,
    nombre: d.nombre,
    fechaNacimiento: d.fechaNacimiento,
    fechaVencimiento: d.fechaVencimiento,
    sexo: d.sexo as Sex | null,
    confidence: d.confidence,
    warnings: [...d.warnings, ...softWarnings],
  };
}

// -----------------------------------------------------------------------------
// extractCedula — main entry point
// -----------------------------------------------------------------------------

const LOW_CONFIDENCE_THRESHOLD = 0.6;
const SYSTEM_INSTRUCTION = `${SYSTEM_PROMPT}\n\n${CEDULA_PROMPT}`;

export async function extractCedula(
  args: ExtractCedulaArgs,
): Promise<Result<CedulaExtraction, AppError>> {
  const { imageBuffer, mimeType } = args;

  const anonResult = await anonymizeImagePreUpload({
    buffer: imageBuffer,
    mimeType,
    type: "cedula",
    requestId: args.requestId,
  });
  if (!anonResult.ok) return err(anonResult.error);

  const { buffer, requestId } = anonResult.value;

  const base64 = buffer.toString("base64");

  const generationResult = await generateStructured<CedulaExtraction>({
    model: "ocr",
    systemInstruction: SYSTEM_INSTRUCTION,
    userParts: [
      { inlineData: { data: base64, mimeType } },
      { text: "Extraé los datos de la cédula:" },
    ],
    schema: cedulaJsonSchema,
    temperature: 0,
    requestId,
  });

  if (!generationResult.ok) return err(generationResult.error);

  const validated = parseAndValidate<CedulaExtraction>(
    generationResult.value.raw,
    isCedulaShape,
    requestId,
  );
  if (!validated.ok) return err(validated.error);

  let extraction = validated.value;
  if (extraction.confidence < LOW_CONFIDENCE_THRESHOLD && extraction.isValidId) {
    extraction = {
      ...extraction,
      warnings: [
        ...extraction.warnings,
        `Confianza baja (${extraction.confidence.toFixed(
          2,
        )}). Recomendado revisar manualmente o reintentar con mejor iluminación.`,
      ],
    };
  }

  // Belt and braces: a non-CR id should never carry data through.
  if (!extraction.isValidId) {
    extraction = {
      ...extraction,
      numeroCedula: null,
      primerApellido: null,
      segundoApellido: null,
      nombre: null,
      fechaNacimiento: null,
      fechaVencimiento: null,
      sexo: null,
    };
  }

  logger.info(
    {
      requestId,
      systemPromptVersion: SYSTEM_PROMPT_VERSION,
      cedulaPromptVersion: CEDULA_PROMPT_VERSION,
      latencyMs: generationResult.value.latencyMs,
      attempts: generationResult.value.attempts,
      modelId: generationResult.value.modelId,
      ...redactForLogs(
        extraction as unknown as Record<string, unknown>,
      ),
    },
    "ai.ocr.cedula.extracted",
  );

  return ok(extraction);
}
