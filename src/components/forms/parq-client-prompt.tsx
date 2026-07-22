"use client";

// =============================================================================
// BLACKLINE FITNESS — ParqClientPrompt
// Owner: frontend-react.
// Modal del lado del CLIENTE para completar el PAR-Q+ 2024. Se abre desde
// /client/rutinas cuando ClientProfile.parqStatus === NOT_COMPLETED. Al
// guardar, persiste vía recordClientParq y notifica al coach.
// =============================================================================

import * as React from "react";
import { useState } from "react";
import { Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { recordClientParq } from "@/app/actions/clients";
import { PARQ_QUESTIONS } from "@/lib/validation/parq.schema";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface ParqClientPromptProps {
  open: boolean;
  /** Authenticated client's User.id — server still verifies session match. */
  clientUserId: string;
  /** Triggered by user dismissing the dialog. The PAR-Q remains pending. */
  onDismiss: () => void;
  /** Triggered after a successful save with the resulting status. */
  onCompleted: (status: "GREEN" | "REVIEW" | "RED") => void;
}

export function ParqClientPrompt({
  open,
  clientUserId,
  onDismiss,
  onCompleted,
}: ParqClientPromptProps) {
  const [answers, setAnswers] = useState<Record<string, "yes" | "no">>({});
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!open) {
      setAnswers({});
      setSaving(false);
    }
  }, [open]);

  const allAnswered = PARQ_QUESTIONS.every((q) => answers[q.code] !== undefined);
  const anyYes = Object.values(answers).some((v) => v === "yes");
  const criticalYes = PARQ_QUESTIONS.filter((q) => q.critical).some(
    (q) => answers[q.code] === "yes",
  );

  function setAnswer(code: string, val: "yes" | "no") {
    setAnswers((prev) => ({ ...prev, [code]: val }));
  }

  async function handleSubmit() {
    if (!allAnswered) {
      toast.error("Respondé las 10 preguntas antes de continuar.");
      return;
    }
    setSaving(true);
    try {
      const result = await recordClientParq(clientUserId, answers);
      if (!result.ok) {
        toast.error(result.error.message ?? "No se pudo guardar el PAR-Q.");
        return;
      }
      const status = result.value.parqStatus;
      if (status === "NOT_COMPLETED") {
        toast.error("El PAR-Q no quedó marcado como completado.");
        return;
      }
      toast.success(
        status === "GREEN"
          ? "¡Listo! Sin restricciones — empezá a entrenar."
          : status === "REVIEW"
            ? "PAR-Q guardado. Tu entrenador revisará tus respuestas."
            : "PAR-Q guardado. Tu entrenador fue notificado — esperá su validación.",
      );
      onCompleted(status);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onDismiss() : undefined)}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-primary" aria-hidden="true" />
            <DialogTitle>Tu PAR-Q+ — antes de empezar</DialogTitle>
          </div>
          <DialogDescription>
            Cuestionario de aptitud física. Respondé honestamente, esto ayuda a
            tu entrenador a cuidarte. Solo vos y tu entrenador ven las
            respuestas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {PARQ_QUESTIONS.map((q, i) => (
            <div
              key={q.code}
              className="rounded-xl border border-[#3F3F46] bg-[#09090B] p-4 space-y-3"
            >
              <p className="text-sm text-[#FAFAFA] leading-relaxed">
                <span className="font-semibold text-[#A1A1AA] mr-2">
                  {i + 1}.
                </span>
                {q.text}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAnswer(q.code, "yes")}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                    answers[q.code] === "yes"
                      ? "border-[#EF4444] bg-[#450A0A] text-[#EF4444]"
                      : "border-[#3F3F46] bg-[#27272A] text-[#A1A1AA] hover:border-[#52525B]"
                  }`}
                  aria-pressed={answers[q.code] === "yes"}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setAnswer(q.code, "no")}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                    answers[q.code] === "no"
                      ? "border-[#22C55E] bg-[#052E16] text-[#22C55E]"
                      : "border-[#3F3F46] bg-[#27272A] text-[#A1A1AA] hover:border-[#52525B]"
                  }`}
                  aria-pressed={answers[q.code] === "no"}
                >
                  No
                </button>
              </div>
            </div>
          ))}
        </div>

        {anyYes && allAnswered && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>
              {criticalYes
                ? "Vamos a esperar autorización médica"
                : "Tu entrenador revisará tus respuestas"}
            </AlertTitle>
            <AlertDescription>
              {criticalYes
                ? "Recomendamos que consultes con tu médico antes de empezar. Tu entrenador será notificado."
                : "Podés continuar, pero tu entrenador puede ajustar el plan según tu respuesta."}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onDismiss}
            disabled={saving}
          >
            Después
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!allAnswered || saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Guardando..." : "Enviar PAR-Q"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
