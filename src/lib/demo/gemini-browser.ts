// =============================================================================
// BLACKLINE FITNESS — Demo mode browser-direct Gemini client
// Owner: ai-orchestrator (Phase 3, Agent 4).
//
// Replaces the server-side gemini-client.ts for the static export build.
// Reads the API key from localStorage at call time via getGeminiKey().
//
// Public API (matches the surface used by ocr-cedula.ts and extract-workout-photos.ts):
//   - getModel({ model, systemInstruction, generationConfig }) -> GenerativeModel
//   - generateStructured<T>(args) -> Result<{ raw, ... }, AppError>
//   - parseAndValidate<T>(rawJson, validator) -> Result<T, AppError>
//   - pingGeminiKey() -> Result<{ ok: true }, AppError>
//
// Differences vs. server gemini-client.ts:
//   - Reads API key from localStorage (not env), throws GeminiKeyMissingError
//     if absent.
//   - SDK instance is rebuilt on every call (key may change between calls).
//   - No model handle cache (key changes invalidate it anyway).
//   - Logging is pino-compatible but quiet — pino works in browser.
// =============================================================================

"use client";

import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type InlineDataPart,
  type ResponseSchema,
  type TextPart,
  type UsageMetadata,
} from "@google/generative-ai";

import { ExternalServiceError, ValidationError, type AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";

import { getGeminiKey } from "./settings-store";

// -----------------------------------------------------------------------------
// Public types — must mirror src/lib/ai/gemini-client.ts so the re-export shim
// at src/lib/ai/gemini-client.ts is a true drop-in.
// -----------------------------------------------------------------------------

/** Logical model selector — keeps callers ignorant of the concrete model id. */
export type ModelKind = "ocr" | "reasoning";

/** Multimodal user payload accepted by generateStructured. */
export type UserPart = InlineDataPart | TextPart;

/** Response schema shape — JSON Schema subset accepted by Gemini. */
export type GeminiSchema = ResponseSchema;

export interface GenerateStructuredArgs {
  model: ModelKind;
  systemInstruction: string;
  userParts: UserPart[];
  /** 0 = deterministic. We default to 0 for OCR. */
  temperature?: number;
  /** Per-attempt timeout in ms. Default 30s. */
  timeoutMs?: number;
  /** Max retry attempts on transient errors. Default 3. */
  maxAttempts?: number;
  /** Correlation id for log lines (no PII). */
  requestId?: string;
  schema: GeminiSchema;
}

export interface GenerateStructuredResult<T> {
  data: T;
  raw: string;
  usage?: UsageMetadata;
  attempts: number;
  latencyMs: number;
  modelId: string;
}

interface GetModelArgs {
  model: ModelKind;
  systemInstruction?: string;
}

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

export class GeminiKeyMissingError extends ValidationError {
  constructor() {
    super(
      "GEMINI_KEY_MISSING",
      "Configurá tu API key de Gemini en Ajustes para usar esta función.",
    );
  }
}

// -----------------------------------------------------------------------------
// Model id resolution — mirrors env constants in env.ts so that ocr/reasoning
// stays meaningful even when env values are demo placeholders.
// -----------------------------------------------------------------------------

const MODEL_NAMES: Record<ModelKind, string> = {
  ocr: "gemini-2.5-flash",
  reasoning: "gemini-2.5-flash",
};

function resolveModelId(kind: ModelKind): string {
  return MODEL_NAMES[kind];
}

// -----------------------------------------------------------------------------
// SDK + model accessors — re-built per call because the key may rotate
// -----------------------------------------------------------------------------

function getSdk(): GoogleGenerativeAI {
  const key = getGeminiKey();
  if (!key) throw new GeminiKeyMissingError();
  return new GoogleGenerativeAI(key);
}

export function getModel({
  model,
  systemInstruction,
}: GetModelArgs): GenerativeModel {
  const modelId = resolveModelId(model);
  return getSdk().getGenerativeModel({
    model: modelId,
    systemInstruction,
  });
}

// -----------------------------------------------------------------------------
// Retry + transient error classification (kept aligned with server impl)
// -----------------------------------------------------------------------------

const BACKOFF_MS = [300, 900, 2700];

interface UnknownErrorShape {
  status?: number;
  statusCode?: number;
  code?: string | number;
  message?: string;
  name?: string;
}

function isTransient(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const x = e as UnknownErrorShape;
  const status = x.status ?? x.statusCode;
  if (typeof status === "number") {
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
    return false;
  }
  const code = String(x.code ?? "");
  if (code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ECONNABORTED") {
    return true;
  }
  const message = String(x.message ?? "").toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("503") ||
    message.includes("unavailable")
  );
}

function shortError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------------------------------------------------------
// generateStructured — main entry point
// -----------------------------------------------------------------------------

export async function generateStructured<T>(
  args: GenerateStructuredArgs,
): Promise<Result<GenerateStructuredResult<T>, AppError>> {
  const {
    model,
    systemInstruction,
    userParts,
    schema,
    temperature = 0,
    timeoutMs = 30_000,
    maxAttempts = 3,
    requestId,
  } = args;

  const modelId = resolveModelId(model);

  let handle: GenerativeModel;
  try {
    handle = getModel({ model, systemInstruction });
  } catch (e) {
    if (e instanceof GeminiKeyMissingError) return err(e);
    return err(
      new ExternalServiceError(
        "GEMINI_INIT_FAILED",
        "No se pudo inicializar el cliente de Gemini.",
        e,
      ),
    );
  }

  const start = Date.now();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // The browser SDK does not accept a `timeout` option. Wrap with Promise.race.
      const generation = handle.generateContent({
        contents: [{ role: "user", parts: userParts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error("AI_TIMEOUT"));
        }, timeoutMs);
      });

      const response = await Promise.race([generation, timeoutPromise]);

      const raw = response.response.text();
      const usage = response.response.usageMetadata;
      const latencyMs = Date.now() - start;

      logger.info(
        {
          requestId,
          modelId,
          attempt,
          latencyMs,
          promptTokens: usage?.promptTokenCount,
          candidateTokens: usage?.candidatesTokenCount,
          totalTokens: usage?.totalTokenCount,
          finishReason: response.response.candidates?.[0]?.finishReason,
        },
        "gemini.generate_structured.success",
      );

      return ok({
        data: undefined as unknown as T,
        raw,
        usage,
        attempts: attempt,
        latencyMs,
        modelId,
      });
    } catch (e) {
      lastError = e;
      const transient = isTransient(e);
      logger.warn(
        {
          requestId,
          modelId,
          attempt,
          maxAttempts,
          transient,
          error: shortError(e),
        },
        "gemini.generate_structured.attempt_failed",
      );

      if (!transient || attempt >= maxAttempts) break;

      const backoff = BACKOFF_MS[attempt - 1] ?? 2700;
      await sleep(backoff);
    }
  }

  const latencyMs = Date.now() - start;
  logger.error(
    {
      requestId,
      modelId,
      attempts: maxAttempts,
      latencyMs,
      error: shortError(lastError),
    },
    "gemini.generate_structured.failed",
  );

  // Surface invalid-key (401/403) and quota errors with friendlier copy.
  const msg = shortError(lastError).toLowerCase();
  if (msg.includes("api key") || msg.includes("api_key") || msg.includes("401") || msg.includes("403")) {
    return err(
      new ValidationError(
        "GEMINI_KEY_INVALID",
        "Tu API key de Gemini no es válida. Revisala en Ajustes.",
        lastError,
      ),
    );
  }
  if (msg.includes("quota") || msg.includes("429")) {
    return err(
      new ExternalServiceError(
        "GEMINI_QUOTA",
        "Excediste tu cuota de Gemini. Esperá unos minutos o revisá tu plan.",
        lastError,
      ),
    );
  }

  return err(
    new ExternalServiceError(
      "GEMINI_FAILED",
      "El servicio de IA no respondió. Reintentá en unos minutos.",
      lastError,
    ),
  );
}

// -----------------------------------------------------------------------------
// parseAndValidate — JSON.parse + caller-supplied validator
// -----------------------------------------------------------------------------

export function parseAndValidate<T>(
  rawJson: string,
  validator: (data: unknown) => T,
  requestId?: string,
): Result<T, AppError> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    logger.error(
      { requestId, error: shortError(e), rawLength: rawJson.length },
      "gemini.parse.invalid_json",
    );
    return err(
      new ExternalServiceError(
        "GEMINI_INVALID_JSON",
        "La respuesta de IA no fue JSON válido.",
        e,
      ),
    );
  }

  try {
    const value = validator(parsed);
    return ok(value);
  } catch (e) {
    logger.error(
      { requestId, error: shortError(e) },
      "gemini.parse.shape_mismatch",
    );
    return err(
      new ExternalServiceError(
        "GEMINI_SHAPE_MISMATCH",
        "La respuesta de IA no coincide con el formato esperado.",
        e,
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// pingGeminiKey — used by the /trainer/ajustes "Probar clave" button
// -----------------------------------------------------------------------------

export async function pingGeminiKey(): Promise<
  Result<{ ok: true; modelId: string; latencyMs: number }, AppError>
> {
  const key = getGeminiKey();
  if (!key) return err(new GeminiKeyMissingError());

  const start = Date.now();
  try {
    const sdk = new GoogleGenerativeAI(key);
    const model = sdk.getGenerativeModel({ model: MODEL_NAMES.ocr });

    // 6s race so the UI doesn't hang on a dead key.
    const generation = model.generateContent("Di hola en una palabra.");
    const timeoutPromise = new Promise<never>((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error("AI_TIMEOUT"));
      }, 6000);
    });
    const result = await Promise.race([generation, timeoutPromise]);

    const text = result.response.text();
    if (!text) {
      return err(
        new ExternalServiceError(
          "GEMINI_PING_NO_RESPONSE",
          "Gemini respondió pero sin contenido. Reintentá.",
        ),
      );
    }

    return ok({
      ok: true,
      modelId: MODEL_NAMES.ocr,
      latencyMs: Date.now() - start,
    });
  } catch (e) {
    const msg = shortError(e).toLowerCase();
    if (msg.includes("api key") || msg.includes("api_key") || msg.includes("401") || msg.includes("403")) {
      return err(
        new ValidationError(
          "GEMINI_KEY_INVALID",
          "Tu API key no es válida. Verificá que la copiaste completa.",
          e,
        ),
      );
    }
    if (msg.includes("quota") || msg.includes("429")) {
      return err(
        new ExternalServiceError(
          "GEMINI_QUOTA",
          "Tu API key es válida pero excediste la cuota. Esperá unos minutos.",
          e,
        ),
      );
    }
    return err(
      new ExternalServiceError(
        "GEMINI_PING_FAILED",
        `No se pudo contactar a Gemini: ${shortError(e)}`,
        e,
      ),
    );
  }
}
