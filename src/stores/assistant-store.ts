// =============================================================================
// BLACKLINE FITNESS — Assistant conversation store
// Owner: frontend-react.
//
// Fase 4 — persistencia + sticky client + compresión:
//   - Zustand `persist` middleware con adapter IndexedDB → conversación
//     sobrevive a refresh, navegación y cierre del tab.
//   - stickyClientId/Name — el coach declara con qué cliente está trabajando
//     y todas las llamadas a tools que aceptan clientId lo usan como default
//     (vía system-instruction inyectado en agent-runtime).
//   - compressImage() resizea fotos a max 1500px antes de adjuntarlas — baja
//     el costo de tokens y el footprint en IDB.
//
// Estado NO persistido (partialize):
//   - pendingAttachments (transient: lo que está por enviarse).
//   - isThinking, pendingConfirmation, lastError (lifecycle de una vuelta).
// =============================================================================

"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { runAgent, resumeAgent } from "@/lib/ai/agent/agent-runtime";
import type {
  AssistantAttachment,
  AssistantMessage,
  PendingConfirmation,
  ToolCallRecord,
} from "@/lib/ai/agent/types";
import { compressImage } from "@/lib/storage/compress-image";
import { idbStorage } from "@/lib/storage/idb-storage";

// Mirror the constants used by the existing OCR pipelines so the chat accepts
// exactly what those tools accept (jpeg/png/webp/heic, ≤10MB).
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_TURN = 4;

interface StickyClient {
  clientId: string;
  name: string;
}

interface AssistantState {
  messages: AssistantMessage[];
  /** Files queued for the next user turn. Cleared after sendMessage. */
  pendingAttachments: AssistantAttachment[];
  isThinking: boolean;
  pendingConfirmation: PendingConfirmation | null;
  lastError: string | null;
  /** Cliente con el que el coach está trabajando — usado como default en tools. */
  stickyClient: StickyClient | null;
  /** Marcado true cuando IDB terminó de rehydratear. Útil para mostrar skeleton. */
  hasHydrated: boolean;

  sendMessage: (text: string) => Promise<void>;
  /** Validate, compress, base64-encode, and queue a file for the next turn. */
  addAttachment: (file: File) => Promise<void>;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  setStickyClient: (client: StickyClient | null) => void;
  confirmPending: () => Promise<void>;
  rejectPending: () => Promise<void>;
  reset: () => void;
  dismissError: () => void;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Cierra cualquier toolCall que quedó en estado "running" en mensajes
 * rehydrateados desde IndexedDB.
 *
 * Por qué importa: si el coach cierra el tab (o refresca) mientras una tool
 * estaba ejecutando, su `ToolCallRecord.status` queda en "running" en IDB. Al
 * volver, `messagesToHistory` serializaba ese call como functionCall +
 * functionResponse{ error: "" }, y Gemini rechazaba la siguiente llamada con
 * "Invalid Content" porque el functionResponse no tiene contenido útil.
 *
 * Acá los convertimos a "error" con un mensaje legible. El history queda
 * coherente (cada functionCall del modelo tiene su functionResponse), y el
 * modelo entiende en el siguiente turno que la acción se cortó.
 */
function sanitizeMessages(messages: AssistantMessage[]): AssistantMessage[] {
  let changed = false;
  const out = messages.map((m) => {
    if (m.role !== "tool" || !m.toolCall) return m;
    if (m.toolCall.status !== "running") return m;
    changed = true;
    const finishedAt = m.toolCall.finishedAt ?? Date.now();
    return {
      ...m,
      toolCall: {
        ...m.toolCall,
        status: "error" as const,
        resultText:
          "Acción interrumpida — el coach cerró la conversación antes de que terminara.",
        finishedAt,
      },
    };
  });
  return changed ? out : messages;
}

// Build the callbacks object once — they only read store-set actions so we
// don't need to recreate them each call.
function makeCallbacks(
  set: (
    partial:
      | Partial<AssistantState>
      | ((s: AssistantState) => Partial<AssistantState>),
  ) => void,
) {
  return {
    onToolStart: (record: ToolCallRecord) => {
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: record.id,
            role: "tool" as const,
            content: record.summary,
            toolCall: record,
            createdAt: record.startedAt,
          },
        ],
      }));
    },
    onToolFinish: (record: ToolCallRecord) => {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === record.id
            ? { ...m, toolCall: record, content: record.summary }
            : m,
        ),
      }));
    },
    onAssistantText: (text: string) => {
      const assistantMessage: AssistantMessage = {
        id: newId("asst"),
        role: "assistant",
        content: text,
        createdAt: Date.now(),
      };
      set((s) => ({
        messages: [...s.messages, assistantMessage],
        isThinking: false,
        pendingConfirmation: null,
      }));
    },
    onPendingConfirmation: (pending: PendingConfirmation) => {
      set({
        pendingConfirmation: pending,
        isThinking: false,
      });
    },
    onError: (message: string) => {
      set({
        isThinking: false,
        pendingConfirmation: null,
        lastError: message,
      });
    },
  };
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set, get) => ({
      messages: [],
      pendingAttachments: [],
      isThinking: false,
      pendingConfirmation: null,
      lastError: null,
      stickyClient: null,
      hasHydrated: false,

      reset: () => {
        set({
          messages: [],
          pendingAttachments: [],
          isThinking: false,
          pendingConfirmation: null,
          lastError: null,
          // stickyClient se mantiene — el coach probablemente sigue trabajando
          // con la misma persona aunque empiece una conversación nueva.
        });
      },
      dismissError: () => set({ lastError: null }),

      setStickyClient: (client) => set({ stickyClient: client }),

      addAttachment: async (file) => {
        if (!ALLOWED_IMAGE_MIME.has(file.type)) {
          set({
            lastError: `Formato no soportado (${file.type || "desconocido"}). Subí JPG, PNG, WebP o HEIC.`,
          });
          return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          set({
            lastError: `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo 10MB.`,
          });
          return;
        }
        if (get().pendingAttachments.length >= MAX_ATTACHMENTS_PER_TURN) {
          set({
            lastError: `Máximo ${MAX_ATTACHMENTS_PER_TURN} imágenes por mensaje.`,
          });
          return;
        }
        try {
          const compressed = await compressImage(file);
          const attachment: AssistantAttachment = {
            id: newId("att"),
            fileName: file.name || "imagen",
            mimeType: compressed.mimeType,
            sizeBytes: compressed.sizeBytes,
            data: compressed.data,
          };
          set((s) => ({
            pendingAttachments: [...s.pendingAttachments, attachment],
            lastError: null,
          }));
        } catch (e) {
          set({
            lastError: `No se pudo procesar la imagen: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      },

      removeAttachment: (id) => {
        set((s) => ({
          pendingAttachments: s.pendingAttachments.filter((a) => a.id !== id),
        }));
      },

      clearAttachments: () => {
        set({ pendingAttachments: [] });
      },

      sendMessage: async (rawText) => {
        const text = rawText.trim();
        const queued = get().pendingAttachments;
        if (!text && queued.length === 0) return;
        if (get().isThinking || get().pendingConfirmation) return;

        const userMessage: AssistantMessage = {
          id: newId("user"),
          role: "user",
          content: text,
          attachments: queued.length > 0 ? queued : undefined,
          createdAt: Date.now(),
        };

        // Defensa: sanear cualquier running zombie que haya sobrevivido al
        // rehydrate (race condition rara: si onRehydrateStorage no corrió
        // antes del primer click). Idempotente.
        const sanitized = sanitizeMessages(get().messages);

        set({
          messages: [...sanitized, userMessage],
          pendingAttachments: [],
          isThinking: true,
          lastError: null,
        });

        await runAgent({
          messages: get().messages,
          stickyClient: get().stickyClient,
          requestId: newId("req"),
          callbacks: makeCallbacks(set),
        });
      },

      confirmPending: async () => {
        const saved = get().pendingConfirmation;
        if (!saved) return;
        set({ pendingConfirmation: null, isThinking: true });
        await resumeAgent({
          decision: "approve",
          saved,
          stickyClient: get().stickyClient,
          requestId: newId("req"),
          callbacks: makeCallbacks(set),
        });
      },

      rejectPending: async () => {
        const saved = get().pendingConfirmation;
        if (!saved) return;
        set({ pendingConfirmation: null, isThinking: true });
        await resumeAgent({
          decision: "reject",
          saved,
          stickyClient: get().stickyClient,
          requestId: newId("req"),
          callbacks: makeCallbacks(set),
        });
      },
    }),
    {
      name: "blackline-assistant-conv-v1",
      storage: createJSONStorage(() => idbStorage),
      // Solo persistir cosas estables — el estado transitorio (isThinking,
      // pendingConfirmation, lastError, pendingAttachments) no debe rehydratearse.
      partialize: (state) => ({
        messages: state.messages,
        stickyClient: state.stickyClient,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Cerrar tool calls "running" que quedaron zombies en IDB de un turno
        // previo que se cortó (refresh, cierre de tab). Sin esto, Gemini
        // rechaza la siguiente llamada con history malformed.
        state.messages = sanitizeMessages(state.messages);
        state.hasHydrated = true;
      },
      version: 1,
    },
  ),
);
