"use client";

// =============================================================================
// BLACKLINE FITNESS — Trainer assistant chat page
// Owner: frontend-react + ai-orchestrator.
//
// Phase 1 — read-only conversation:
//   - Coach types a question. Gemini decides if it needs a tool.
//   - If yes, we execute the tool (server action) and feed the result back.
//   - Loop until Gemini emits final text.
//
// Future phases will add: image drops, write tools with confirmation cards,
// IndexedDB-backed conversation history.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Loader2,
  Paperclip,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  Wrench,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { listMyClients } from "@/app/actions/clients";
import { useAssistantStore } from "@/stores/assistant-store";
import { hasGeminiKey } from "@/lib/demo/settings-store";
import type {
  AssistantAttachment,
  AssistantMessage,
  PendingConfirmation,
  ToolCallRecord,
} from "@/lib/ai/agent/types";

const STARTERS = [
  "¿Qué clientes activos tengo?",
  "Buscame ejercicios para espalda con barra",
  "Listame mis rutinas de hipertrofia",
  "¿Cuánta proteína por día para hipertrofia según la evidencia?",
  "Dame las tendencias top 5 ACSM 2026",
];

export default function AsistentePage() {
  const messages = useAssistantStore((s) => s.messages);
  const pendingAttachments = useAssistantStore((s) => s.pendingAttachments);
  const isThinking = useAssistantStore((s) => s.isThinking);
  const pendingConfirmation = useAssistantStore((s) => s.pendingConfirmation);
  const lastError = useAssistantStore((s) => s.lastError);
  const stickyClient = useAssistantStore((s) => s.stickyClient);
  const hasHydrated = useAssistantStore((s) => s.hasHydrated);
  const sendMessage = useAssistantStore((s) => s.sendMessage);
  const addAttachment = useAssistantStore((s) => s.addAttachment);
  const removeAttachment = useAssistantStore((s) => s.removeAttachment);
  const setStickyClient = useAssistantStore((s) => s.setStickyClient);
  const confirmPending = useAssistantStore((s) => s.confirmPending);
  const rejectPending = useAssistantStore((s) => s.rejectPending);
  const reset = useAssistantStore((s) => s.reset);
  const dismissError = useAssistantStore((s) => s.dismissError);

  const [input, setInput] = useState("");
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    setHasKey(hasGeminiKey());
  }, []);

  // Auto-scroll to bottom when new messages arrive — deps are change-triggers,
  // not values read inside.
  // biome-ignore lint/correctness/useExhaustiveDependencies: triggers only
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isThinking]);

  // Clipboard paste — pick up images even when the textarea isn't focused.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void addAttachment(file);
          }
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addAttachment]);

  // -- No API key guard --------------------------------------------------
  if (hasKey === false) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Asistente"
          description="Tu copiloto IA para Blackline Fitness."
        />
        <div className="rounded-2xl border border-[#27272A] bg-[#18181B] p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-brand-primary mb-3" />
          <h2 className="text-lg font-semibold text-[#FAFAFA]">
            Configurá tu API key de Gemini
          </h2>
          <p className="text-sm text-[#A1A1AA] mt-2 max-w-md mx-auto">
            El asistente usa Gemini para entender tus preguntas y consultar tus
            datos. Pegá tu key en Ajustes y vuelve.
          </p>
          <Link
            href="/trainer/ajustes"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-lg bg-brand-primary text-black text-sm font-medium hover:opacity-90"
          >
            Ir a Ajustes
          </Link>
        </div>
      </div>
    );
  }

  const inputDisabled = isThinking || pendingConfirmation !== null;
  const canSend =
    !inputDisabled && (input.trim().length > 0 || pendingAttachments.length > 0);

  async function handleSubmit() {
    if (!canSend) return;
    const text = input;
    setInput("");
    await sendMessage(text);
  }

  function handleFilesPicked(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      void addAttachment(file);
    }
  }

  // Drag-drop handlers — we use a counter because dragenter/leave fire on
  // child elements and would otherwise flicker the overlay.
  function handleDragEnter(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragging(false);
  }
  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    handleFilesPicked(e.dataTransfer.files);
  }

  return (
    <div
      className="space-y-4 flex flex-col h-[calc(100vh-8rem)] relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 rounded-2xl border-2 border-dashed border-brand-primary bg-brand-primary/10 flex flex-col items-center justify-center pointer-events-none">
          <ImagePlus className="h-12 w-12 text-brand-primary mb-2" />
          <p className="text-sm font-medium text-brand-primary">
            Soltá la imagen para adjuntarla
          </p>
        </div>
      )}
      <PageHeader
        title="Asistente"
        description="Hacele preguntas sobre tus clientes, rutinas o ejercicios."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StickyClientControl
              value={stickyClient}
              onChange={setStickyClient}
            />
            {messages.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] px-3 py-1.5 rounded-lg border border-[#27272A] hover:border-[#3F3F46]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Nueva conversación
              </button>
            )}
          </div>
        }
      />

      {/* Hydration skeleton — visible during the very first paint while IDB rehydrates */}
      {!hasHydrated && messages.length === 0 && (
        <div className="text-xs text-[#71717A] -mt-2">Cargando conversación…</div>
      )}

      {/* Conversation pane */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-[#27272A] bg-[#18181B] p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <EmptyState
            onPick={(text) => {
              setInput(text);
            }}
          />
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {isThinking && (
          <div className="flex items-center gap-2 text-sm text-[#A1A1AA] pl-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            Pensando…
          </div>
        )}
      </div>

      {/* Pending write confirmation */}
      {pendingConfirmation && (
        <ConfirmationCard
          pending={pendingConfirmation}
          onConfirm={() => void confirmPending()}
          onReject={() => void rejectPending()}
        />
      )}

      {/* Error banner */}
      {lastError && (
        <div className="flex items-start gap-3 rounded-xl border border-[#7F1D1D] bg-[#2D1414] px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-[#F87171] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#FCA5A5] flex-1">{lastError}</p>
          <button
            type="button"
            onClick={dismissError}
            className="text-[#A1A1AA] hover:text-[#FAFAFA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Attachment preview row */}
      {pendingAttachments.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {pendingAttachments.map((att) => (
            <AttachmentChip
              key={att.id}
              attachment={att}
              onRemove={() => removeAttachment(att.id)}
            />
          ))}
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        className="flex items-end gap-2"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          hidden
          onChange={(e) => {
            handleFilesPicked(e.target.files);
            if (e.target) e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={inputDisabled}
          className="inline-flex items-center justify-center h-12 w-12 rounded-xl border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46] disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Adjuntar imagen"
          title="Adjuntar imagen (también podés pegar o soltar)"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder={
            pendingConfirmation
              ? "Resolvé la confirmación arriba antes de seguir…"
              : pendingAttachments.length > 0
                ? "Agregá un mensaje para acompañar la imagen… (opcional)"
                : "Escribí tu pregunta o soltá una imagen (Enter para enviar)"
          }
          rows={2}
          disabled={inputDisabled}
          className="flex-1 rounded-xl bg-[#18181B] border border-[#27272A] focus:border-brand-primary focus:outline-none px-4 py-3 text-sm text-[#FAFAFA] resize-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-brand-primary text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Enviar"
        >
          {isThinking ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StickyClientControl — badge + popover picker
// ---------------------------------------------------------------------------

interface StickyClient {
  clientId: string;
  name: string;
}

function StickyClientControl({
  value,
  onChange,
}: {
  value: StickyClient | null;
  onChange: (next: StickyClient | null) => void;
}) {
  const [open, setOpen] = useState(false);

  // Active state — pill with name + ✕ to clear.
  if (value) {
    return (
      <div className="relative">
        <div className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/40 text-brand-primary">
          <User className="h-3.5 w-3.5" />
          <span className="font-medium truncate max-w-[160px]">{value.name}</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="ml-1 text-[10px] uppercase opacity-70 hover:opacity-100"
            aria-label="Cambiar cliente activo"
          >
            cambiar
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-1 hover:text-[#FAFAFA]"
            aria-label="Limpiar cliente activo"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        {open && (
          <StickyClientPickerPopover
            onSelect={(c) => {
              onChange(c);
              setOpen(false);
            }}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  // Idle state — small button to open the picker.
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] px-3 py-1.5 rounded-lg border border-dashed border-[#3F3F46] hover:border-[#52525B]"
      >
        <User className="h-3.5 w-3.5" />
        Cliente activo
      </button>
      {open && (
        <StickyClientPickerPopover
          onSelect={(c) => {
            onChange(c);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

interface ClientPickRow {
  id: string;
  name: string;
}

function StickyClientPickerPopover({
  onSelect,
  onClose,
}: {
  onSelect: (client: StickyClient) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ClientPickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial load of active clients.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listMyClients().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setRows(res.value.clients.map((c) => ({ id: c.id, name: c.name })));
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Click outside / Escape to close.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const filtered = query.trim()
    ? rows.filter((c) =>
        c.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : rows;

  return (
    <div
      ref={containerRef}
      className="absolute top-full right-0 mt-1.5 w-72 rounded-xl border border-[#27272A] bg-[#0A0A0A] shadow-xl z-30"
    >
      <div className="p-2 border-b border-[#27272A]">
        <input
          // biome-ignore lint/a11y/noAutofocus: el popover se abrió por click intencional del coach
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente…"
          className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-1.5 text-sm text-[#FAFAFA] focus:border-brand-primary focus:outline-none"
        />
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {loading && (
          <div className="text-xs text-[#71717A] px-3 py-2">Cargando…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-xs text-[#71717A] px-3 py-2">
            {query.trim() ? "Sin coincidencias." : "Aún no tenés clientes."}
          </div>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect({ clientId: c.id, name: c.name })}
            className="w-full text-left px-3 py-2 text-sm text-[#D4D4D8] hover:bg-[#18181B] hover:text-[#FAFAFA] flex items-center gap-2"
          >
            <User className="h-3.5 w-3.5 text-[#71717A]" />
            <span className="truncate">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AttachmentChip — thumbnail + remove button shown above the input bar
// ---------------------------------------------------------------------------

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: AssistantAttachment;
  onRemove: () => void;
}) {
  return (
    <div className="relative flex-shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:${attachment.mimeType};base64,${attachment.data}`}
        alt={attachment.fileName}
        className="h-16 w-16 rounded-lg object-cover border border-[#27272A]"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#0A0A0A] border border-[#3F3F46] flex items-center justify-center text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#52525B]"
        aria-label={`Quitar ${attachment.fileName}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Sparkles className="h-10 w-10 text-brand-primary mb-3" />
      <h3 className="text-base font-semibold text-[#FAFAFA]">
        Tu copiloto está listo
      </h3>
      <p className="text-sm text-[#A1A1AA] mt-1 max-w-md">
        Hacele preguntas sobre clientes, rutinas y ejercicios. Puede también
        crear rutinas, registrar mediciones y asignar planes — siempre te pide
        confirmación antes de tocar la DB.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="text-xs px-3 py-1.5 rounded-full border border-[#27272A] bg-[#0A0A0A] text-[#D4D4D8] hover:border-brand-primary"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  if (message.role === "tool" && message.toolCall) {
    return <ToolCallCard record={message.toolCall} />;
  }

  const isUser = message.role === "user";
  const hasAttachments = !!message.attachments?.length;
  const hasText = message.content.trim().length > 0;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        {hasAttachments && (
          <div className="flex flex-wrap gap-2 justify-end">
            {message.attachments?.map((att) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={att.id}
                src={`data:${att.mimeType};base64,${att.data}`}
                alt={att.fileName}
                className="max-w-[200px] max-h-[200px] rounded-xl object-cover border border-[#27272A]"
              />
            ))}
          </div>
        )}
        {hasText && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              isUser
                ? "bg-brand-primary text-white"
                : "bg-[#27272A] text-[#FAFAFA]"
            }`}
          >
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallCard({ record }: { record: ToolCallRecord }) {
  const [expanded, setExpanded] = useState(false);
  const dotColor =
    record.status === "running"
      ? "bg-[#FBBF24]"
      : record.status === "success"
        ? "bg-[#22C55E]"
        : record.status === "rejected"
          ? "bg-[#71717A]"
          : "bg-[#EF4444]";
  const elapsed =
    record.finishedAt && record.startedAt
      ? `${record.finishedAt - record.startedAt}ms`
      : null;

  return (
    <div className="rounded-xl border border-[#27272A] bg-[#0A0A0A]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-[#D4D4D8] hover:bg-[#18181B]"
      >
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <Wrench className="h-3.5 w-3.5 text-[#A1A1AA]" />
        <span className="font-mono text-[#A1A1AA] truncate">{record.name}</span>
        <span className="text-[#71717A] truncate flex-1">— {record.summary}</span>
        {elapsed && <span className="text-[#71717A] text-[10px]">{elapsed}</span>}
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-[#A1A1AA]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-[#A1A1AA]" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-[#27272A] px-3 py-2 space-y-2 text-xs">
          {Object.keys(record.args).length > 0 && (
            <div>
              <div className="text-[#71717A] uppercase tracking-wide text-[10px] mb-1">
                Argumentos
              </div>
              <pre className="text-[#D4D4D8] font-mono whitespace-pre-wrap break-all bg-[#18181B] rounded-md p-2 max-h-40 overflow-auto">
                {JSON.stringify(record.args, null, 2)}
              </pre>
            </div>
          )}
          {record.resultText && (
            <div>
              <div className="text-[#71717A] uppercase tracking-wide text-[10px] mb-1">
                {record.status === "error"
                  ? "Error"
                  : record.status === "rejected"
                    ? "Cancelado"
                    : "Resultado"}
              </div>
              <pre
                className={`font-mono whitespace-pre-wrap break-all rounded-md p-2 max-h-60 overflow-auto ${
                  record.status === "error"
                    ? "text-[#FCA5A5] bg-[#2D1414]"
                    : record.status === "rejected"
                      ? "text-[#A1A1AA] bg-[#18181B]"
                      : "text-[#D4D4D8] bg-[#18181B]"
                }`}
              >
                {formatResultText(record.resultText)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatResultText(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

// ---------------------------------------------------------------------------
// Confirmation card — shown when the agent wants to run a write tool
// ---------------------------------------------------------------------------

function ConfirmationCard({
  pending,
  onConfirm,
  onReject,
}: {
  pending: PendingConfirmation;
  onConfirm: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#FBBF24]/40 bg-[#1F1B0A] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-[#FBBF24] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#FAFAFA]">
            El asistente quiere ejecutar una acción
          </p>
          <p className="text-sm text-[#D4D4D8] mt-1">{pending.summary}</p>
          <p className="text-xs text-[#A1A1AA] mt-1 font-mono">
            {pending.toolName}
          </p>
        </div>
      </div>

      {Object.keys(pending.args).length > 0 && (
        <details className="rounded-md bg-[#0A0A0A] border border-[#27272A]">
          <summary className="cursor-pointer text-xs text-[#A1A1AA] hover:text-[#FAFAFA] px-3 py-2">
            Ver argumentos completos
          </summary>
          <pre className="text-xs text-[#D4D4D8] font-mono whitespace-pre-wrap break-all p-3 pt-0 max-h-48 overflow-auto">
            {JSON.stringify(pending.args, null, 2)}
          </pre>
        </details>
      )}

      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onReject}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#27272A] hover:border-[#3F3F46]"
        >
          <X className="h-4 w-4" />
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#FBBF24] text-black hover:opacity-90"
        >
          <Check className="h-4 w-4" />
          Confirmar
        </button>
      </div>
    </div>
  );
}
