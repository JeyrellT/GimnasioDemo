// =============================================================================
// BLACKLINE FITNESS — Coach AI chat session manager
// Owner: ai-orchestrator.
//
// Wraps the Gemini conversational API for the coach chatbot.
// Manages a single chat session with multi-turn history.
//
// Public API:
//   createCoachChat() -> Result<CoachChatSession, AppError>
//   CoachChatSession.sendMessage(text, image?) -> Promise<Result<string, AppError>>
//   CoachChatSession.reset() -> void
// =============================================================================

"use client";

import type { ChatSession } from "@google/generative-ai";

import { ExternalServiceError, ValidationError, type AppError } from "@/lib/errors";
import { err, ok, type Result } from "@/lib/result";

import { getModel, GeminiKeyMissingError } from "./gemini-client";
import { COACH_SYSTEM_PROMPT } from "./prompts/coach.prompt";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface CoachChatSession {
  /** Send a text message, optionally with an image attachment. */
  sendMessage: (
    text: string,
    image?: { base64: string; mimeType: string },
  ) => Promise<Result<string, AppError>>;
  /** Reset the conversation history (start fresh). */
  reset: () => void;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function shortError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

export function createCoachChat(): Result<CoachChatSession, AppError> {
  let model;
  try {
    model = getModel({
      model: "reasoning",
      systemInstruction: COACH_SYSTEM_PROMPT,
    });
  } catch (e) {
    if (e instanceof GeminiKeyMissingError) return err(e);
    return err(
      new ExternalServiceError(
        "COACH_CHAT_INIT",
        "No se pudo iniciar el asistente. Revisa tu API key en Ajustes.",
        e,
      ),
    );
  }

  let chat: ChatSession = model.startChat();

  async function sendMessage(
    text: string,
    image?: { base64: string; mimeType: string },
  ): Promise<Result<string, AppError>> {
    const parts: Array<
      | { text: string }
      | { inlineData: { data: string; mimeType: string } }
    > = [];

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

    try {
      const generation = chat.sendMessage(parts);

      // 60s timeout — images can be slow.
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error("AI_TIMEOUT"));
        }, 60_000);
      });

      const result = await Promise.race([generation, timeoutPromise]);
      const response = result.response.text();

      if (!response) {
        return err(
          new ExternalServiceError(
            "COACH_EMPTY_RESPONSE",
            "El asistente no genero respuesta. Reintenta.",
          ),
        );
      }

      return ok(response);
    } catch (e) {
      const msg = shortError(e).toLowerCase();

      if (
        msg.includes("api key") ||
        msg.includes("api_key") ||
        msg.includes("401") ||
        msg.includes("403")
      ) {
        return err(
          new ValidationError(
            "GEMINI_KEY_INVALID",
            "Tu API key no es valida. Revisala en Ajustes.",
            e,
          ),
        );
      }

      if (msg.includes("quota") || msg.includes("429")) {
        return err(
          new ExternalServiceError(
            "GEMINI_QUOTA",
            "Cuota de Gemini excedida. Espera unos minutos.",
            e,
          ),
        );
      }

      if (msg.includes("timeout")) {
        return err(
          new ExternalServiceError(
            "COACH_TIMEOUT",
            "El asistente tardo demasiado. Reintenta.",
            e,
          ),
        );
      }

      return err(
        new ExternalServiceError(
          "COACH_CHAT_ERROR",
          "Error del asistente. Reintenta en unos segundos.",
          e,
        ),
      );
    }
  }

  function reset() {
    chat = model.startChat();
  }

  return ok({ sendMessage, reset });
}
