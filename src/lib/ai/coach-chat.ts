"use client";

// =============================================================================
// BLACKLINE FITNESS — Coach AI chat engine with function calling
// Owner: ai-orchestrator.
//
// Wraps the Gemini conversational API with native function-calling support.
// The AI can invoke server actions (search exercises, create routines,
// record metrics, etc.) autonomously within a single conversation turn.
//
// Public API:
//   createCoachChat() -> Result<CoachChatSession, AppError>
//   CoachChatSession.sendMessage(text, image?) -> Promise<SendResult>
//   CoachChatSession.sendRoutineContext(ocrData) -> void
//   CoachChatSession.reset() -> void
// =============================================================================

import {
  GoogleGenerativeAI,
  type ChatSession,
  type FunctionCallPart,
  type Part,
} from "@google/generative-ai";

import {
  ExternalServiceError,
  ValidationError,
  type AppError,
} from "@/lib/errors";
import { err, ok, type Result } from "@/lib/result";
import { getGeminiKey } from "@/lib/demo/settings-store";

import { COACH_SYSTEM_PROMPT } from "./prompts/coach.prompt";
import {
  COACH_TOOL_DECLARATIONS,
  executeCoachTool,
  type ToolCallResult,
} from "./coach-tools";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface CoachChatSession {
  /** Send text + optional image. Returns AI response + any tool calls made. */
  sendMessage: (
    text: string,
    image?: { base64: string; mimeType: string },
  ) => Promise<Result<SendMessageResult, AppError>>;
  /** Inject OCR routine data into conversation context. */
  sendRoutineContext: (
    ocrData: unknown,
  ) => Promise<Result<SendMessageResult, AppError>>;
  /** Reset conversation history. */
  reset: () => void;
}

export interface SendMessageResult {
  text: string;
  toolCalls: ToolCallResult[];
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MODEL_ID = "gemini-2.5-flash";
const MAX_TOOL_ITERATIONS = 6;
const TIMEOUT_MS = 60_000;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function shortError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

function timeoutRace<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI_TIMEOUT")), ms),
    ),
  ]);
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

export function createCoachChat(): Result<CoachChatSession, AppError> {
  const key = getGeminiKey();
  if (!key) {
    return err(
      new ValidationError(
        "GEMINI_KEY_MISSING",
        "Configura tu API key de Gemini en Ajustes para usar el asistente.",
      ),
    );
  }

  const sdk = new GoogleGenerativeAI(key);

  const model = sdk.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction: COACH_SYSTEM_PROMPT,
    tools: [{ functionDeclarations: COACH_TOOL_DECLARATIONS }],
  });

  let chat: ChatSession = model.startChat();

  // ---------------------------------------------------------------------------
  // Core: send message with function-calling loop
  // ---------------------------------------------------------------------------
  async function processResponse(
    parts: Part[],
  ): Promise<Result<SendMessageResult, AppError>> {
    const allToolCalls: ToolCallResult[] = [];
    let currentParts = parts;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      let response;
      try {
        response = await timeoutRace(
          chat.sendMessage(currentParts),
          TIMEOUT_MS,
        );
      } catch (e) {
        return err(classifyError(e));
      }

      // Check for function calls
      const functionCalls = response.response.functionCalls();

      if (!functionCalls || functionCalls.length === 0) {
        // No tool calls — return text
        const text = response.response.text() ?? "";
        return ok({ text, toolCalls: allToolCalls });
      }

      // Execute all function calls
      const functionResponses: Part[] = [];

      for (const fc of functionCalls) {
        const toolResult = await executeCoachTool(
          fc.name,
          (fc.args as Record<string, unknown>) ?? {},
        );
        allToolCalls.push(toolResult);

        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: toolResult.success
              ? { success: true, data: toolResult.data }
              : { success: false, error: toolResult.error },
          },
        } as Part);
      }

      // Send function results back to Gemini for the next iteration
      currentParts = functionResponses;
    }

    // Max iterations reached — return what we have
    return ok({
      text: "Alcance el limite de acciones por turno. Pedi lo que necesites de nuevo.",
      toolCalls: allToolCalls,
    });
  }

  // ---------------------------------------------------------------------------
  // Public methods
  // ---------------------------------------------------------------------------
  async function sendMessage(
    text: string,
    image?: { base64: string; mimeType: string },
  ): Promise<Result<SendMessageResult, AppError>> {
    const parts: Part[] = [];

    if (image) {
      parts.push({
        inlineData: { data: image.base64, mimeType: image.mimeType },
      });
    }

    if (text) {
      parts.push({ text });
    }

    if (parts.length === 0) {
      return err(
        new ValidationError("EMPTY_MESSAGE", "El mensaje no puede estar vacio."),
      );
    }

    return processResponse(parts);
  }

  async function sendRoutineContext(
    ocrData: unknown,
  ): Promise<Result<SendMessageResult, AppError>> {
    const contextText = [
      "El coach subio una imagen de una rutina de entrenamiento y el sistema la detecto con OCR.",
      "Estos son los datos extraidos de la imagen:",
      "```json",
      JSON.stringify(ocrData, null, 2),
      "```",
      "Presenta un resumen breve de la rutina detectada y preguntale al coach si quiere crearla en el sistema.",
      "Si confirma, usa la herramienta create_routine_from_ocr con los datos extraidos.",
    ].join("\n");

    return processResponse([{ text: contextText }]);
  }

  function reset() {
    chat = model.startChat();
  }

  return ok({ sendMessage, sendRoutineContext, reset });
}

// -----------------------------------------------------------------------------
// Error classifier
// -----------------------------------------------------------------------------

function classifyError(e: unknown): AppError {
  const msg = shortError(e).toLowerCase();

  if (
    msg.includes("api key") ||
    msg.includes("api_key") ||
    msg.includes("401") ||
    msg.includes("403")
  ) {
    return new ValidationError(
      "GEMINI_KEY_INVALID",
      "Tu API key no es valida. Revisala en Ajustes.",
      e,
    );
  }

  if (msg.includes("quota") || msg.includes("429")) {
    return new ExternalServiceError(
      "GEMINI_QUOTA",
      "Cuota de Gemini excedida. Espera unos minutos.",
      e,
    );
  }

  if (msg.includes("timeout")) {
    return new ExternalServiceError(
      "COACH_TIMEOUT",
      "El asistente tardo demasiado. Reintenta.",
      e,
    );
  }

  return new ExternalServiceError(
    "COACH_CHAT_ERROR",
    "Error del asistente. Reintenta en unos segundos.",
    e,
  );
}
