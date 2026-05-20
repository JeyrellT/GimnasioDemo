// =============================================================================
// BLACKLINE FITNESS — Assistant agent runtime (chat loop with write gating)
// Owner: ai-orchestrator.
//
// Single user-turn driver. Two entry points:
//
//   1. runAgent({ messages, callbacks }) — fresh turn from a new user message.
//   2. resumeAgent({ decision, savedState, callbacks }) — coach clicked
//      Confirm/Cancel on a pending write. Continues where we paused.
//
// Why pause/resume instead of a callback Promise: the React store needs to
// own conversation state. Keeping a long-lived Promise around forces an
// implicit dependency between the running closure and the rendering tree,
// which breaks on hot reload, navigation away, and store resets.
//
// processCalls() walks the function_calls from a single Gemini turn:
//   - read tools execute immediately.
//   - write tools pause: it returns { kind: "needs_confirmation", … } with
//     a snapshot of the remaining calls + working messages. The store
//     surfaces a card; on user action we re-enter via resumeAgent.
//
// MAX_TOOL_ITERATIONS caps a single chain at 5 Gemini round-trips.
// =============================================================================

"use client";

import type { FunctionCall } from "@google/generative-ai";

import type {
  ChatTurn,
  ChatWithToolsResult,
} from "@/lib/demo/gemini-browser";
import { chatWithTools } from "@/lib/demo/gemini-browser";
import { logger } from "@/lib/logger";

import { ASSISTANT_SYSTEM_PROMPT } from "./system-prompt";
import { findTool, TOOL_DECLARATIONS } from "./tool-registry";
import type {
  AssistantMessage,
  PendingConfirmation,
  ToolCallRecord,
} from "./types";

const MAX_TOOL_ITERATIONS = 5;

// -----------------------------------------------------------------------------
// AssistantMessage[] → ChatTurn[] (Gemini Content shape)
// -----------------------------------------------------------------------------

function messagesToHistory(messages: AssistantMessage[]): ChatTurn[] {
  const history: ChatTurn[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      // Images go first so the model anchors text instructions to the visible
      // content; this matches Google's published guidance for multimodal turns.
      const parts: ChatTurn["parts"] = [];
      if (msg.attachments?.length) {
        for (const att of msg.attachments) {
          parts.push({
            inlineData: { data: att.data, mimeType: att.mimeType },
          });
        }
      }
      // Always include a text part — Gemini rejects user turns with zero text
      // when images are present. Fall back to a generic prompt.
      const text = msg.content.trim() ||
        (msg.attachments?.length ? "Mirá esta imagen y decime qué ves." : "");
      parts.push({ text });
      history.push({ role: "user", parts });
    } else if (msg.role === "assistant") {
      if (msg.content.trim()) {
        history.push({ role: "model", parts: [{ text: msg.content }] });
      }
    } else if (msg.role === "tool" && msg.toolCall) {
      const call = msg.toolCall;
      history.push({
        role: "model",
        parts: [{ functionCall: { name: call.name, args: call.args } }],
      });
      const response =
        call.status === "success"
          ? (safeParseJson(call.resultText) ?? { result: call.resultText })
          : call.status === "rejected"
            ? { error: "El coach canceló esta acción.", cancelled: true }
            : { error: call.resultText };
      history.push({
        role: "function",
        parts: [{ functionResponse: { name: call.name, response } }],
      });
    }
  }
  return history;
}

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Callbacks — UI hooks
// -----------------------------------------------------------------------------

export interface RunAgentCallbacks {
  onToolStart: (record: ToolCallRecord) => void;
  onToolFinish: (record: ToolCallRecord) => void;
  onAssistantText: (text: string) => void;
  onPendingConfirmation: (pending: PendingConfirmation) => void;
  onError: (message: string) => void;
}

/**
 * "Sticky client" — el coach declaró con qué cliente está trabajando en esta
 * conversación. El runtime lo inyecta como sufijo al system instruction para
 * que el modelo lo use como default cuando una tool requiera clientId/
 * clientUserId y el coach no lo especifique.
 */
export interface StickyClientContext {
  clientId: string;
  name: string;
}

export interface RunAgentArgs {
  messages: AssistantMessage[];
  callbacks: RunAgentCallbacks;
  stickyClient?: StickyClientContext | null;
  requestId?: string;
}

export interface ResumeAgentArgs {
  decision: "approve" | "reject";
  saved: PendingConfirmation;
  callbacks: RunAgentCallbacks;
  stickyClient?: StickyClientContext | null;
  requestId?: string;
}

// -----------------------------------------------------------------------------
// runAgent — fresh turn
// -----------------------------------------------------------------------------

export async function runAgent(args: RunAgentArgs): Promise<void> {
  const { messages, callbacks, stickyClient, requestId } = args;
  await drive({
    workingMessages: [...messages],
    pendingCalls: null,
    iterationStart: 0,
    callbacks,
    stickyClient: stickyClient ?? null,
    requestId,
  });
}

// -----------------------------------------------------------------------------
// resumeAgent — continues after user confirms or rejects a pending write
// -----------------------------------------------------------------------------

export async function resumeAgent(args: ResumeAgentArgs): Promise<void> {
  const { decision, saved, callbacks, stickyClient, requestId } = args;
  let workingMessages = [...saved.workingMessages];

  // 1. Execute (or skip) the pending call itself.
  if (decision === "approve") {
    const next = await executeCall(saved.pendingCall, workingMessages, callbacks);
    workingMessages = next;
  } else {
    const rejected = makeRejectedRecord(saved.pendingCall);
    callbacks.onToolStart(rejected);
    callbacks.onToolFinish(rejected);
    workingMessages = appendToolToHistory(workingMessages, rejected);
  }

  // 2. Process the rest of the calls from the same Gemini turn (if any).
  const result = await processCalls(saved.remainingCalls, workingMessages, callbacks);
  if (result.kind === "needs_confirmation") {
    callbacks.onPendingConfirmation(result.pending);
    return;
  }
  workingMessages = result.workingMessages;

  // 3. Continue the main loop from the next iteration onwards.
  await drive({
    workingMessages,
    pendingCalls: null,
    iterationStart: saved.iteration + 1,
    callbacks,
    stickyClient: stickyClient ?? null,
    requestId,
  });
}

// -----------------------------------------------------------------------------
// drive — the actual chat→tool→chat loop
// -----------------------------------------------------------------------------

interface DriveArgs {
  workingMessages: AssistantMessage[];
  pendingCalls: FunctionCall[] | null;
  iterationStart: number;
  callbacks: RunAgentCallbacks;
  stickyClient: StickyClientContext | null;
  requestId?: string;
}

/** Build the per-call system instruction, optionally suffixed with sticky context. */
function buildSystemInstruction(sticky: StickyClientContext | null): string {
  if (!sticky) return ASSISTANT_SYSTEM_PROMPT;
  return `${ASSISTANT_SYSTEM_PROMPT}

CONTEXTO ACTIVO DE LA SESIÓN:
El coach está trabajando con el cliente "${sticky.name}" (clientId="${sticky.clientId}", clientUserId="${sticky.clientId}").
Cuando una herramienta acepte clientId o clientUserId y el coach no especifique otro cliente, usá este como default.
Si el coach menciona otro cliente por nombre, NO uses este — resolvé el otro con list_my_clients primero.`;
}

async function drive(args: DriveArgs): Promise<void> {
  let { workingMessages } = args;
  const { callbacks, stickyClient, requestId } = args;
  const systemInstruction = buildSystemInstruction(stickyClient);

  for (let iteration = args.iterationStart; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const history = messagesToHistory(workingMessages);

    const callResult = await chatWithTools({
      systemInstruction,
      history,
      tools: TOOL_DECLARATIONS,
      requestId,
    });

    if (!callResult.ok) {
      logger.error(
        { requestId, error: callResult.error.message, iteration },
        "agent.gemini_failed",
      );
      callbacks.onError(callResult.error.message);
      return;
    }

    const result: ChatWithToolsResult = callResult.value;

    if (result.kind === "text") {
      callbacks.onAssistantText(result.text);
      logger.info(
        { requestId, iteration, latencyMs: result.latencyMs, finishKind: "text" },
        "agent.turn_finished",
      );
      return;
    }

    // result.kind === "tool_calls"
    const processed = await processCalls(
      result.functionCalls,
      workingMessages,
      callbacks,
      iteration,
    );

    if (processed.kind === "needs_confirmation") {
      callbacks.onPendingConfirmation(processed.pending);
      return;
    }

    workingMessages = processed.workingMessages;
  }

  logger.warn(
    { requestId, iterations: MAX_TOOL_ITERATIONS },
    "agent.iteration_cap_hit",
  );
  callbacks.onError(
    `El asistente llamó a más de ${MAX_TOOL_ITERATIONS} herramientas sin converger. Probá una pregunta más específica.`,
  );
}

// -----------------------------------------------------------------------------
// processCalls — handles one batch of function calls from Gemini
// -----------------------------------------------------------------------------

type ProcessCallsResult =
  | { kind: "done"; workingMessages: AssistantMessage[] }
  | { kind: "needs_confirmation"; pending: PendingConfirmation };

async function processCalls(
  calls: FunctionCall[],
  initialMessages: AssistantMessage[],
  callbacks: RunAgentCallbacks,
  iteration = 0,
): Promise<ProcessCallsResult> {
  let workingMessages = initialMessages;

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    if (!call) continue;
    const tool = findTool(call.name);

    if (!tool) {
      const errRecord = makeUnknownToolRecord(call);
      callbacks.onToolStart(errRecord);
      callbacks.onToolFinish(errRecord);
      workingMessages = appendToolToHistory(workingMessages, errRecord);
      continue;
    }

    // Write tool: pause for confirmation, save remaining work.
    if (tool.kind === "write") {
      const pending: PendingConfirmation = {
        pendingCall: call,
        remainingCalls: calls.slice(i + 1),
        workingMessages,
        iteration,
        toolName: call.name,
        summary: safeSummarize(tool, call.args),
        args: (call.args as Record<string, unknown>) ?? {},
      };
      return { kind: "needs_confirmation", pending };
    }

    // Read tool: execute immediately.
    workingMessages = await executeCall(call, workingMessages, callbacks);
  }

  return { kind: "done", workingMessages };
}

// -----------------------------------------------------------------------------
// executeCall — invoke a tool handler and record the result
// -----------------------------------------------------------------------------

async function executeCall(
  call: FunctionCall,
  workingMessages: AssistantMessage[],
  callbacks: RunAgentCallbacks,
): Promise<AssistantMessage[]> {
  const tool = findTool(call.name);
  if (!tool) {
    const err = makeUnknownToolRecord(call);
    callbacks.onToolStart(err);
    callbacks.onToolFinish(err);
    return appendToolToHistory(workingMessages, err);
  }

  const args = (call.args as Record<string, unknown>) ?? {};
  const startedAt = Date.now();
  const callId = `${call.name}-${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
  const summary = safeSummarize(tool, args);

  const running: ToolCallRecord = {
    id: callId,
    name: call.name,
    args,
    summary,
    status: "running",
    resultText: "",
    startedAt,
    finishedAt: null,
  };
  callbacks.onToolStart(running);

  try {
    const raw = await tool.handler(args);
    const formatted = tool.formatResult(raw);
    const resultText = JSON.stringify(formatted);
    const done: ToolCallRecord = {
      ...running,
      status: "success",
      resultText,
      finishedAt: Date.now(),
    };
    callbacks.onToolFinish(done);
    return appendToolToHistory(workingMessages, done);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const failed: ToolCallRecord = {
      ...running,
      status: "error",
      resultText: msg,
      finishedAt: Date.now(),
    };
    callbacks.onToolFinish(failed);
    return appendToolToHistory(workingMessages, failed);
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function safeSummarize(
  tool: { summarize: (args: Record<string, unknown>) => string },
  args: object,
): string {
  try {
    return tool.summarize((args as Record<string, unknown>) ?? {});
  } catch {
    return "—";
  }
}

function makeUnknownToolRecord(call: FunctionCall): ToolCallRecord {
  const now = Date.now();
  return {
    id: `${call.name}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: call.name,
    args: (call.args as Record<string, unknown>) ?? {},
    summary: `Herramienta desconocida: ${call.name}`,
    status: "error",
    resultText: `Tool '${call.name}' no existe en el registry.`,
    startedAt: now,
    finishedAt: now,
  };
}

function makeRejectedRecord(call: FunctionCall): ToolCallRecord {
  const now = Date.now();
  return {
    id: `${call.name}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: call.name,
    args: (call.args as Record<string, unknown>) ?? {},
    summary: `Cancelado por el coach: ${call.name}`,
    status: "rejected",
    resultText: "El coach decidió no ejecutar esta acción.",
    startedAt: now,
    finishedAt: now,
  };
}

function appendToolToHistory(
  messages: AssistantMessage[],
  record: ToolCallRecord,
): AssistantMessage[] {
  return [
    ...messages,
    {
      id: record.id,
      role: "tool",
      content: record.summary,
      toolCall: record,
      createdAt: record.startedAt,
    },
  ];
}
