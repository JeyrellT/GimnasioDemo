// =============================================================================
// BLACKLINE FITNESS — Assistant agent shared types
// Owner: ai-orchestrator + frontend-react.
// =============================================================================

import type { FunctionCall, FunctionDeclaration } from "@google/generative-ai";

/**
 * A tool the assistant can call. The model sees `declaration` (name +
 * description + JSON schema), the runtime invokes `handler` when the model
 * chooses to call it.
 *
 *   - declaration.name — kebab/snake case, matches what the model emits.
 *   - declaration.description — written FOR the model. Be specific. Explain
 *     when to call it and what it returns. Spanish is fine since the
 *     systemInstruction is also Spanish.
 *   - declaration.parameters — JSON Schema. Required + types must be exact;
 *     Gemini will reject invalid schemas.
 *
 * `kind`:
 *   - "read"   — pure read, executes immediately, no confirmation needed.
 *   - "write"  — mutates DB. Phase 2 will gate these behind a confirmation
 *                card in the UI. Phase 1 does not register any write tools.
 *
 * `summarize`:
 *   Lossy one-line description shown in the chat as a "tool call card", e.g.
 *   "Buscando ejercicios: 'press inclinado'". Called with the parsed args.
 *
 * `formatResult`:
 *   Returns the string we feed back to the model as the function response.
 *   Should be short and well-structured — long blobs eat tokens. We do NOT
 *   pass through Prisma rows directly; each tool returns a curated summary.
 */
export interface AssistantTool<TArgs = unknown, TResult = unknown> {
  declaration: FunctionDeclaration;
  kind: "read" | "write";
  /** Runtime handler — throws on validation/auth failure; runtime catches. */
  handler: (args: TArgs) => Promise<TResult>;
  /** Human-readable preview shown in the chat UI. */
  summarize: (args: TArgs) => string;
  /** What the model sees back as the function-response object. */
  formatResult: (result: TResult) => Record<string, unknown>;
}

/**
 * A tool call recorded in the conversation history. We keep both the raw call
 * (so we can replay) and the formatted result (so the UI can render a card).
 */
export interface ToolCallRecord {
  id: string;
  name: string;
  args: Record<string, unknown>;
  summary: string;
  /**
   * Lifecycle:
   *   running → success | error            (read tools, or write tools after confirm)
   *   running → rejected                   (write tool cancelled by coach)
   *   error                                (unknown tool name)
   */
  status: "running" | "success" | "error" | "rejected";
  /** Human-readable error or the formatted JSON result. */
  resultText: string;
  startedAt: number;
  finishedAt: number | null;
}

/**
 * Snapshot of agent state at the moment a write tool needs the coach's
 * approval. Persisted briefly in the store so the agent can be resumed
 * from exactly this point once the coach decides.
 *
 *   - pendingCall — the write the model wants to run.
 *   - remainingCalls — other function calls from the same Gemini turn that
 *     come AFTER this one. We process them after the user resolves the
 *     pending one (in batch order).
 *   - workingMessages — conversation log up to and including the model's
 *     decision but BEFORE we ran any of these batch calls. The post-resume
 *     code re-uses this so the function-response history is correct.
 *   - iteration — which Gemini round-trip we were in (0-indexed). Used to
 *     respect MAX_TOOL_ITERATIONS after resume.
 */
export interface PendingConfirmation {
  pendingCall: FunctionCall;
  remainingCalls: FunctionCall[];
  workingMessages: AssistantMessage[];
  iteration: number;
  toolName: string;
  summary: string;
  args: Record<string, unknown>;
}

/** Roles for a chat message in the assistant store. */
export type AssistantMessageRole = "user" | "assistant" | "tool";

/**
 * Inline binary attached to a user turn — typically a photo the coach drops
 * into the chat (foto de báscula, hoja de rutina, etc.). We send these to
 * Gemini as `inlineData` parts so its multimodal vision can interpret them.
 *
 *   - data — raw base64 (no `data:<mime>;base64,` prefix).
 *   - mimeType — MUST match what Gemini accepts: image/jpeg, image/png,
 *     image/webp, image/heic, image/heif.
 *
 * El preview URL para la UI se deriva en el componente como
 * `data:${mimeType};base64,${data}` — así sobrevive a la persistencia en
 * IndexedDB sin tener que recrear blob URLs en cada rehydrate.
 */
export interface AssistantAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  data: string;
}

export interface AssistantMessage {
  id: string;
  role: AssistantMessageRole;
  /** Text content. For "tool" role this is a fallback/debug — UI uses toolCall. */
  content: string;
  /** Present when role === "tool". */
  toolCall?: ToolCallRecord;
  /** Images / files attached to a user turn. Only relevant for role === "user". */
  attachments?: AssistantAttachment[];
  createdAt: number;
}
