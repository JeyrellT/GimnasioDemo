"use client";

// =============================================================================
// BLACKLINE FITNESS — Coach assistant FAB (thin launcher)
// Owner: frontend-react.
//
// Floating button visible on every authenticated trainer page (mounted from
// src/app/(app)/_client-layout.tsx). Single responsibility: open the
// dedicated /trainer/asistente surface where the actual chat engine lives.
//
// Why thin: until 2026-05-20 this FAB had ~614 lines with its own chat engine
// (coach-chat.ts), tool executor (coach-tools.ts), state, and rendering. After
// the unification we keep the FAB as a discoverability anchor on every page
// but route all interaction to the dedicated page so:
//   - One conversation source of truth (Zustand + IndexedDB).
//   - One tool registry, one system prompt, one engine.
//   - Write confirmations, sticky client, multimodal, RAG, persistence all
//     work the same regardless of where the coach starts.
//
// Badge: shows a dot when the persisted conversation has any messages — a
// subtle "you have an ongoing thread" cue. The page hydrates from IDB so
// we read the count from the same store.
// =============================================================================

import { usePathname, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { useAssistantStore } from "@/stores/assistant-store";

const ASSISTANT_PATH = "/trainer/asistente";

export function CoachAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const messageCount = useAssistantStore((s) => s.messages.length);

  // Don't render on the assistant page itself — the FAB would just point to
  // where the coach already is.
  if (pathname?.startsWith(ASSISTANT_PATH)) return null;

  const hasThread = messageCount > 0;

  return (
    <button
      type="button"
      onClick={() => router.push(ASSISTANT_PATH)}
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 h-14 w-14 rounded-full bg-brand-primary text-black shadow-lg flex items-center justify-center hover:opacity-90 hover:scale-105 transition-all"
      aria-label="Abrir asistente IA"
      title={hasThread ? "Continuar conversación con el asistente" : "Abrir asistente IA"}
    >
      <Sparkles className="h-6 w-6" />
      {hasThread && (
        <span
          className="absolute top-1 right-1 h-3 w-3 rounded-full bg-[#22C55E] border-2 border-[#09090B]"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
