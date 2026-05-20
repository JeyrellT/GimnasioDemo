"use client";

// =============================================================================
// BLACKLINE FITNESS — Coach AI Assistant (Floating Bubble + Chat Panel)
// Owner: frontend-react + ai-orchestrator.
//
// Floating bubble that opens a full chat panel. The AI coach can:
//   - Chat about training, exercises, programming
//   - Execute system actions (create routines, add metrics, search exercises)
//   - Process routine images via OCR and create with one tap
//   - Chain multiple actions in a single conversation turn
//
// UI states:
//   - Closed: floating bubble (bottom-right)
//   - Open: chat panel (fullscreen mobile / side panel desktop)
// =============================================================================

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  createCoachChat,
  type CoachChatSession,
  type SendMessageResult,
} from "@/lib/ai/coach-chat";
import { extractRoutineFromImage } from "@/lib/ai/ocr-routine";
import { hasGeminiKey } from "@/lib/demo/settings-store";
import { TOOL_LABELS, type ToolCallResult } from "@/lib/ai/coach-tools";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string;
  /** Tool calls executed during this message */
  toolCalls?: ToolCallResult[];
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let msgCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++msgCounter}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("FileReader did not return a string."));
        return;
      }
      const b64 = result.split(",")[1];
      if (!b64) {
        reject(new Error("Failed to extract base64."));
        return;
      }
      resolve(b64);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Typing indicator (bouncing dots) */
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 px-4 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10">
        <Sparkles className="h-3.5 w-3.5 text-brand-primary" />
      </div>
      <div className="mt-2 flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#52525B] animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#52525B] animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#52525B] animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

/** Tool execution card shown inline in assistant messages */
function ToolCard({ result }: { result: ToolCallResult }) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
        result.success
          ? "bg-[#22C55E]/10 text-[#22C55E]"
          : "bg-[#EF4444]/10 text-[#EF4444]",
      ].join(" ")}
    >
      {result.success ? (
        <Check className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="font-medium truncate">{result.label}</span>
      {result.navigateTo && (
        <Link
          href={result.navigateTo}
          className="ml-auto flex items-center gap-1 shrink-0 text-brand-primary hover:underline"
        >
          Ver
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/** Simple bold-text renderer: **text** -> <strong>text</strong> */
function renderBoldText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Single message bubble */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-2">
        <p className="text-[10px] text-[#52525B] text-center">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2 px-4 py-1.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 self-start mt-0.5">
          <Sparkles className="h-3.5 w-3.5 text-brand-primary" />
        </div>
      )}

      <div
        className={`flex max-w-[85%] flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}
      >
        {/* Image preview */}
        {message.imageUrl && (
          <div className="h-28 w-36 overflow-hidden rounded-xl border border-[#3F3F46]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.imageUrl}
              alt="Imagen adjunta"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Tool call cards (before text) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full space-y-1">
            {message.toolCalls.map((tc, i) => (
              <ToolCard key={i} result={tc} />
            ))}
          </div>
        )}

        {/* Text bubble */}
        {message.content && (
          <div
            className={[
              "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              isUser
                ? "bg-brand-primary text-white rounded-br-sm"
                : "bg-[#27272A] text-[#E4E4E7] rounded-bl-sm",
            ].join(" ")}
          >
            {message.content.split("\n").map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {renderBoldText(line)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick suggestions
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  { label: "Mis clientes", msg: "Mostra mis clientes activos" },
  { label: "Crear rutina PPL", msg: "Crea una rutina push pull legs de hipertrofia de 6 dias" },
  { label: "Ejercicios de pecho", msg: "Busca ejercicios de pecho con barra y mancuerna" },
  { label: "Mis rutinas", msg: "Mostra mis rutinas" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CoachAssistant() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  /** Tool labels shown in real-time while AI is working */
  const [pendingToolLabel, setPendingToolLabel] = useState<string | null>(null);

  const chatRef = useRef<CoachChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Init chat lazily
  const getChat = useCallback((): CoachChatSession | null => {
    if (chatRef.current) return chatRef.current;
    const result = createCoachChat();
    if (!result.ok) {
      toast.error(result.error.message);
      return null;
    }
    chatRef.current = result.value;
    return chatRef.current;
  }, []);

  // ── Send text message ─────────────────────────────────────────────
  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isThinking) return;

      const chat = getChat();
      if (!chat) return;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsThinking(true);
      setPendingToolLabel(null);

      const result = await chat.sendMessage(text.trim());

      if (result.ok) {
        const { text: responseText, toolCalls } = result.value;
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: responseText,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            timestamp: Date.now(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: result.error.message,
            timestamp: Date.now(),
          },
        ]);
      }

      setIsThinking(false);
      setPendingToolLabel(null);
    },
    [getChat, isThinking],
  );

  // ── Send image ────────────────────────────────────────────────────
  const sendImage = useCallback(
    async (file: File) => {
      if (isThinking) return;

      const chat = getChat();
      if (!chat) return;

      // Validate
      const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      if (!ALLOWED.includes(file.type)) {
        toast.error("Solo se aceptan imagenes JPG, PNG, WebP o HEIC.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("La imagen es muy grande. Maximo 10MB.");
        return;
      }

      const imageUrl = URL.createObjectURL(file);

      // Add user image message
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "user",
          content: "",
          imageUrl,
          timestamp: Date.now(),
        },
      ]);
      setIsThinking(true);
      setPendingToolLabel("Analizando imagen...");

      // 1. Try routine OCR first
      const ocrResult = await extractRoutineFromImage(file);

      if (ocrResult.ok) {
        // Routine detected! Send context to AI
        setPendingToolLabel("Rutina detectada, procesando...");
        const chatResult = await chat.sendRoutineContext(ocrResult.value);

        if (chatResult.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: chatResult.value.text,
              toolCalls: chatResult.value.toolCalls.length > 0
                ? chatResult.value.toolCalls
                : undefined,
              timestamp: Date.now(),
            },
          ]);
        } else {
          // Fallback: show summary ourselves
          const r = ocrResult.value;
          const totalEx = r.days.reduce((a, d) => a + d.exercises.length, 0);
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: `Detecte una rutina: **${r.name}** — ${r.days.length} dias, ${totalEx} ejercicios. Decime "creala" para guardarla en el sistema.`,
              timestamp: Date.now(),
            },
          ]);
        }
      } else {
        // 2. Not a routine — send image to chat for general analysis
        setPendingToolLabel("Consultando IA...");
        let base64: string;
        try {
          base64 = await fileToBase64(file);
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: "No pude leer la imagen. Intenta con otra.",
              timestamp: Date.now(),
            },
          ]);
          setIsThinking(false);
          setPendingToolLabel(null);
          return;
        }

        const chatResult = await chat.sendMessage(
          "Analiza esta imagen y decime que ves. Si tiene datos de medidas corporales, peso o composicion corporal, ofrece registrarlos.",
          { base64, mimeType: file.type },
        );

        if (chatResult.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: chatResult.value.text,
              toolCalls: chatResult.value.toolCalls.length > 0
                ? chatResult.value.toolCalls
                : undefined,
              timestamp: Date.now(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: chatResult.error.message,
              timestamp: Date.now(),
            },
          ]);
        }
      }

      setIsThinking(false);
      setPendingToolLabel(null);
    },
    [getChat, isThinking],
  );

  // ── Handlers ──────────────────────────────────────────────────────
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (input.trim()) sendTextMessage(input);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) sendImage(file);
    e.target.value = "";
  }

  function handleReset() {
    chatRef.current?.reset();
    chatRef.current = null;
    setMessages([]);
    setIsThinking(false);
    setInput("");
    setPendingToolLabel(null);
  }

  // ── Guard: no API key → don't render ──────────────────────────────
  if (!hasGeminiKey()) return null;

  return (
    <>
      {/* ═══ Floating Bubble ═════════════════════════════════════════════ */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Cerrar asistente" : "Abrir asistente IA"}
        className={[
          "fixed z-[60] flex items-center justify-center rounded-full transition-all duration-300",
          "bottom-20 right-4 sm:bottom-6 sm:right-6",
          "h-14 w-14",
          isOpen
            ? "bg-[#27272A] border border-[#3F3F46] text-[#A1A1AA] hover:text-[#FAFAFA] scale-90"
            : [
                "bg-gradient-to-br from-brand-primary to-brand-primary-hover text-white",
                "shadow-[0_0_24px_rgba(255,106,26,0.35)]",
                "hover:shadow-[0_0_32px_rgba(255,106,26,0.50)] hover:scale-110",
                "active:scale-95",
              ].join(" "),
        ].join(" ")}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageSquare className="h-5 w-5" />
        )}
      </button>

      {/* ═══ Chat Panel ═════════════════════════════════════════════════ */}
      <div
        className={[
          "fixed z-[55] flex flex-col overflow-hidden transition-all duration-300 ease-out",
          // Mobile: full screen
          "inset-0 sm:inset-auto",
          // Desktop: right-side panel
          "sm:bottom-24 sm:right-6 sm:w-[420px] sm:max-h-[620px] sm:rounded-2xl",
          "border border-[#3F3F46]/80 bg-[#0C0C0F]/95 shadow-2xl backdrop-blur-xl",
          isOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-4 opacity-0 pointer-events-none sm:translate-y-8",
        ].join(" ")}
        role="dialog"
        aria-label="Asistente IA"
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-[#3F3F46]/60 bg-[#18181B]/80 px-4 py-3 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 border border-brand-primary/20">
            <Sparkles className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">
              BL Assistant
            </h2>
            <p className="text-[10px] text-[#52525B] leading-tight">
              Asistente IA con acceso al sistema
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg p-2 text-[#52525B] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
              title="Nueva conversacion"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-[#52525B] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors sm:hidden"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Messages ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-3 min-h-0">
          {messages.length === 0 ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center gap-5 px-6 py-8 text-center h-full">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary/15 to-brand-primary/5 border border-brand-primary/20">
                <Sparkles
                  className="h-7 w-7 text-brand-primary"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#FAFAFA]">
                  Tu asistente de entrenamiento
                </h3>
                <p className="mt-1.5 max-w-[280px] text-sm text-[#71717A] leading-relaxed">
                  Puedo buscar ejercicios, crear rutinas, registrar medidas y
                  analizar imagenes. Preguntame lo que necesites.
                </p>
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap justify-center gap-2 max-w-[320px]">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => sendTextMessage(s.msg)}
                    className="rounded-full border border-[#3F3F46] bg-[#18181B] px-3 py-1.5 text-xs text-[#A1A1AA] hover:border-brand-primary/40 hover:text-[#FAFAFA] hover:bg-brand-primary/5 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Capabilities hint */}
              <div className="grid grid-cols-2 gap-2 text-[10px] text-[#3F3F46] max-w-[280px]">
                <span>Crear rutinas</span>
                <span>Buscar ejercicios</span>
                <span>Registrar medidas</span>
                <span>Importar con foto</span>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isThinking && (
                <div>
                  <TypingIndicator />
                  {pendingToolLabel && (
                    <div className="flex items-center gap-2 px-4 py-1 ml-9">
                      <Loader2 className="h-3 w-3 animate-spin text-[#52525B]" />
                      <span className="text-[10px] text-[#52525B]">
                        {pendingToolLabel}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ── Input area ───────────────────────────────────────────── */}
        <div className="border-t border-[#3F3F46]/60 bg-[#18181B]/80 px-3 py-3 shrink-0">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {/* Image upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isThinking}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#3F3F46] bg-[#27272A] text-[#71717A] hover:text-brand-primary hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-colors disabled:opacity-40"
              title="Subir imagen (rutina, bascula, medidas)"
            >
              <ImageIcon className="h-4 w-4" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Subir imagen"
            />

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isThinking ? "Procesando..." : "Escribe algo..."}
              disabled={isThinking}
              maxLength={2000}
              className="flex-1 rounded-xl border border-[#3F3F46] bg-[#27272A] py-2.5 pl-4 pr-3 text-sm text-[#FAFAFA] placeholder-[#52525B] outline-none transition-colors focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 disabled:opacity-40 min-h-[40px]"
            />

            {/* Send */}
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-white transition-all hover:bg-brand-primary-hover active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isThinking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>

          <p className="mt-1.5 text-center text-[10px] text-[#27272A]">
            Gemini 2.5 Flash — las respuestas pueden contener errores
          </p>
        </div>
      </div>
    </>
  );
}
