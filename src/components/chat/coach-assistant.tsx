"use client";

// =============================================================================
// BLACKLINE FITNESS — Coach AI Assistant (FAB + Chat Panel)
// Owner: frontend-react + ai-orchestrator.
//
// Floating action button that opens a chat panel. The trainer can:
//   1. Chat about training, exercises, programming.
//   2. Upload routine images → auto-detect + create with one tap.
//   3. Ask questions about technique, periodization, etc.
//
// Renders as:
//   - Mobile: full-screen overlay above bottom nav
//   - Desktop: fixed right-side panel (~420px)
// =============================================================================

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Minus,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { createCoachChat, type CoachChatSession } from "@/lib/ai/coach-chat";
import { extractRoutineFromImage } from "@/lib/ai/ocr-routine";
import type { OcrRoutineResult } from "@/lib/ai/ocr-routine";
import { createRoutineFromOcr } from "@/app/actions/routines";
import { hasGeminiKey } from "@/lib/demo/settings-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string;
  /** Attached routine data from OCR detection */
  routineData?: OcrRoutineResult;
  /** Whether the routine has been created already */
  routineCreated?: boolean;
  timestamp: number;
}

type PanelState = "closed" | "open" | "minimized";

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
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to extract base64 from FileReader result."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// GOAL display
// ---------------------------------------------------------------------------

const GOAL_LABELS: Record<string, string> = {
  HYPERTROPHY: "Hipertrofia",
  STRENGTH: "Fuerza",
  ENDURANCE: "Resistencia",
  FAT_LOSS: "Perdida de grasa",
  GENERAL: "General",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10">
        <Sparkles className="h-4 w-4 text-brand-primary" />
      </div>
      <div className="ml-2 flex gap-1">
        <span className="h-2 w-2 rounded-full bg-[#52525B] animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-[#52525B] animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-[#52525B] animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function RoutineCard({
  routine,
  created,
  creating,
  onCreateClick,
}: {
  routine: OcrRoutineResult;
  created: boolean;
  creating: boolean;
  onCreateClick: () => void;
}) {
  const totalExercises = routine.days.reduce(
    (acc, d) => acc + d.exercises.length,
    0,
  );

  return (
    <div className="mt-2 rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-3 space-y-2">
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10">
          <Sparkles className="h-4 w-4 text-brand-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#FAFAFA] truncate">
            {routine.name}
          </p>
          <p className="text-xs text-brand-primary">
            {GOAL_LABELS[routine.goal] ?? routine.goal}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-md bg-[#27272A] px-2 py-0.5 text-xs text-[#A1A1AA]">
          {routine.days.length} dias
        </span>
        <span className="rounded-md bg-[#27272A] px-2 py-0.5 text-xs text-[#A1A1AA]">
          {totalExercises} ejercicios
        </span>
        <span className="rounded-md bg-[#27272A] px-2 py-0.5 text-xs text-[#A1A1AA]">
          {routine.durationWeeks} semanas
        </span>
      </div>

      {/* Day summary */}
      <div className="space-y-1">
        {routine.days.slice(0, 3).map((day, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-primary/10 text-[10px] font-bold text-brand-primary">
              {i + 1}
            </span>
            <span className="text-[#A1A1AA] truncate">{day.name}</span>
            <span className="text-[#52525B] shrink-0">
              {day.exercises.length} ej.
            </span>
          </div>
        ))}
        {routine.days.length > 3 && (
          <p className="text-[10px] text-[#52525B] pl-7">
            +{routine.days.length - 3} dias mas...
          </p>
        )}
      </div>

      {/* Action */}
      {created ? (
        <div className="flex items-center gap-2 rounded-lg bg-[#22C55E]/10 px-3 py-2 text-xs font-medium text-[#22C55E]">
          <Check className="h-3.5 w-3.5" />
          Rutina creada exitosamente
        </div>
      ) : (
        <button
          type="button"
          onClick={onCreateClick}
          disabled={creating}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover transition-colors disabled:opacity-60"
        >
          {creating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              Crear rutina
            </>
          )}
        </button>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onCreateRoutine,
  creatingRoutineId,
}: {
  message: ChatMessage;
  onCreateRoutine: (msgId: string) => void;
  creatingRoutineId: string | null;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-2">
        <p className="text-[10px] text-[#52525B] text-center">{message.content}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2 px-4 py-1.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 self-end">
          <Sparkles className="h-4 w-4 text-brand-primary" />
        </div>
      )}

      <div
        className={`flex max-w-[85%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
      >
        {/* Image preview */}
        {message.imageUrl && (
          <div className="h-32 w-40 overflow-hidden rounded-xl border border-[#3F3F46]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.imageUrl}
              alt="Imagen adjunta"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Text bubble */}
        {message.content && (
          <div
            className={[
              "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              isUser
                ? "bg-brand-primary text-white rounded-br-md"
                : "bg-[#27272A] text-[#FAFAFA] rounded-bl-md",
            ].join(" ")}
          >
            {/* Render markdown-lite: bold, line breaks */}
            {message.content.split("\n").map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {renderBoldText(line)}
              </span>
            ))}
          </div>
        )}

        {/* Routine card */}
        {message.routineData && (
          <RoutineCard
            routine={message.routineData}
            created={!!message.routineCreated}
            creating={creatingRoutineId === message.id}
            onCreateClick={() => onCreateRoutine(message.id)}
          />
        )}
      </div>
    </div>
  );
}

/** Simple bold-text renderer: **text** → <strong>text</strong> */
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

// ---------------------------------------------------------------------------
// Welcome suggestions
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  "Arma una rutina push/pull/legs",
  "Que ejercicios para espalda alta?",
  "Como periodizar hipertrofia?",
  "Diferencia entre RPE y RIR",
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CoachAssistant() {
  const router = useRouter();

  const [panelState, setPanelState] = useState<PanelState>("closed");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [creatingRoutineId, setCreatingRoutineId] = useState<string | null>(
    null,
  );

  const chatRef = useRef<CoachChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Focus input when panel opens
  useEffect(() => {
    if (panelState === "open") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [panelState]);

  // Initialize chat session lazily
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

  // ── Send text message ────────────────────────────────────────────────
  const sendMessage = useCallback(
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

      const result = await chat.sendMessage(text.trim());

      if (result.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: result.value,
            timestamp: Date.now(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: `Error: ${result.error.message}`,
            timestamp: Date.now(),
          },
        ]);
      }

      setIsThinking(false);
    },
    [getChat, isThinking],
  );

  // ── Send image ───────────────────────────────────────────────────────
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

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: "Analiza esta imagen",
        imageUrl,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      // Try routine extraction first
      const ocrResult = await extractRoutineFromImage(file);

      if (ocrResult.ok) {
        // Routine detected! Show card + chat analysis
        let base64: string;
        try {
          base64 = await fileToBase64(file);
        } catch {
          base64 = "";
        }

        // Also get a conversational response about the routine
        const chatResult = base64
          ? await chat.sendMessage(
              "El coach subio una imagen de una rutina de entrenamiento. Detecte la rutina con OCR. Resume brevemente lo que ves y ofrece importarla al sistema.",
              { base64, mimeType: file.type },
            )
          : null;

        const assistantContent =
          chatResult && chatResult.ok
            ? chatResult.value
            : `Detecte una rutina: **${ocrResult.value.name}** con ${ocrResult.value.days.length} dias y ${ocrResult.value.days.reduce((a, d) => a + d.exercises.length, 0)} ejercicios. Podes crearla con el boton de abajo.`;

        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: assistantContent,
            routineData: ocrResult.value,
            timestamp: Date.now(),
          },
        ]);
      } else {
        // Not a routine — send to chat for general analysis
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
          return;
        }

        const chatResult = await chat.sendMessage("Analiza esta imagen:", {
          base64,
          mimeType: file.type,
        });

        if (chatResult.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: chatResult.value,
              timestamp: Date.now(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: `Error: ${chatResult.error.message}`,
              timestamp: Date.now(),
            },
          ]);
        }
      }

      setIsThinking(false);
    },
    [getChat, isThinking],
  );

  // ── Create routine from OCR card ─────────────────────────────────────
  const handleCreateRoutine = useCallback(
    async (msgId: string) => {
      const msg = messages.find((m) => m.id === msgId);
      if (!msg?.routineData || msg.routineCreated) return;

      setCreatingRoutineId(msgId);

      const data = msg.routineData;
      const result = await createRoutineFromOcr({
        name: data.name.trim(),
        goal: data.goal,
        splitDays: data.days.length,
        durationWeeks: data.durationWeeks,
        days: data.days,
      });

      if (result.ok) {
        // Mark as created
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, routineCreated: true } : m,
          ),
        );

        // Add system message
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: `Rutina **${data.name}** creada exitosamente. Podes verla y editarla en tus rutinas.`,
            timestamp: Date.now(),
          },
        ]);

        toast.success("Rutina creada exitosamente.");
      } else {
        toast.error(result.error.message);
      }

      setCreatingRoutineId(null);
    },
    [messages],
  );

  // ── Form submit ──────────────────────────────────────────────────────
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (input.trim()) sendMessage(input);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) sendImage(file);
    e.target.value = "";
  }

  // ── Reset chat ───────────────────────────────────────────────────────
  function handleReset() {
    chatRef.current?.reset();
    chatRef.current = null;
    setMessages([]);
    setIsThinking(false);
    setInput("");
  }

  // ── Toggle panel ─────────────────────────────────────────────────────
  function togglePanel() {
    setPanelState((prev) => (prev === "closed" ? "open" : "closed"));
  }

  // ── No API key? Don't render ─────────────────────────────────────────
  if (!hasGeminiKey()) return null;

  const isOpen = panelState === "open";

  return (
    <>
      {/* ═══ FAB Button ═══════════════════════════════════════════════════ */}
      <button
        type="button"
        onClick={togglePanel}
        aria-label={isOpen ? "Cerrar asistente" : "Abrir asistente IA"}
        className={[
          "fixed z-50 flex items-center justify-center rounded-full shadow-lg transition-all duration-300",
          // Position: above bottom nav on mobile, bottom-right on desktop
          "bottom-20 right-4 sm:bottom-6 sm:right-6",
          "h-14 w-14",
          isOpen
            ? "bg-[#27272A] border border-[#3F3F46] text-[#A1A1AA] hover:text-[#FAFAFA]"
            : "bg-gradient-to-br from-brand-primary to-brand-primary-hover text-white shadow-[0_0_24px_rgba(255,106,26,0.35)] hover:shadow-[0_0_32px_rgba(255,106,26,0.50)] hover:scale-105",
        ].join(" ")}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageSquare className="h-5 w-5" />
        )}
      </button>

      {/* ═══ Chat Panel ═══════════════════════════════════════════════════ */}
      <div
        className={[
          "fixed z-50 flex flex-col overflow-hidden transition-all duration-300 ease-out",
          // Mobile: full screen overlay above bottom nav
          "inset-x-0 bottom-0 top-0 sm:inset-auto",
          // Desktop: right-side panel
          "sm:bottom-20 sm:right-6 sm:w-[400px] sm:max-h-[600px] sm:rounded-2xl",
          "border border-[#3F3F46] bg-[#0F0F12] shadow-2xl backdrop-blur-xl",
          isOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-8 opacity-0 pointer-events-none",
        ].join(" ")}
        role="dialog"
        aria-label="Asistente IA"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-[#3F3F46]/60 bg-[#18181B]/90 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10">
            <Sparkles className="h-4.5 w-4.5 text-brand-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">
              BL Assistant
            </h2>
            <p className="text-[10px] text-[#52525B]">
              Asistente IA para coaches
            </p>
          </div>
          <div className="flex items-center gap-1">
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
              onClick={() => setPanelState("closed")}
              className="rounded-lg p-2 text-[#52525B] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors sm:hidden"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Messages ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-3">
          {messages.length === 0 ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center gap-5 px-6 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
                <Sparkles
                  className="h-7 w-7 text-brand-primary"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#FAFAFA]">
                  Hola, soy tu asistente
                </h3>
                <p className="mt-1 max-w-[280px] text-sm text-[#71717A]">
                  Preguntame sobre entrenamiento o subi una foto de rutina para
                  importarla.
                </p>
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="rounded-full border border-[#3F3F46] bg-[#18181B] px-3 py-1.5 text-xs text-[#A1A1AA] hover:border-brand-primary/40 hover:text-[#FAFAFA] hover:bg-brand-primary/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onCreateRoutine={handleCreateRoutine}
                  creatingRoutineId={creatingRoutineId}
                />
              ))}
              {isThinking && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ── Input area ─────────────────────────────────────────────── */}
        <div className="border-t border-[#3F3F46]/60 bg-[#18181B]/90 px-3 py-3">
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2"
          >
            {/* Image upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isThinking}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#3F3F46] bg-[#27272A] text-[#71717A] hover:text-brand-primary hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-colors disabled:opacity-50"
              title="Subir imagen"
            >
              <ImageIcon className="h-4.5 w-4.5" />
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
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isThinking ? "Pensando..." : "Pregunta algo..."
                }
                disabled={isThinking}
                maxLength={2000}
                className="w-full rounded-xl border border-[#3F3F46] bg-[#27272A] py-2.5 pl-4 pr-11 text-sm text-[#FAFAFA] placeholder-[#52525B] outline-none transition-colors focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 disabled:opacity-50"
              />
            </div>

            {/* Send button */}
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-white transition-all hover:bg-brand-primary-hover disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isThinking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>

          <p className="mt-1.5 text-center text-[10px] text-[#3F3F46]">
            Gemini 2.5 Flash — las respuestas pueden contener errores
          </p>
        </div>
      </div>
    </>
  );
}
