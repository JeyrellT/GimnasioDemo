"use client";

// =============================================================================
// BLACKLINE FITNESS — ParqCompletionDialog
// Owner: frontend-react.
// Modal con el cuestionario PAR-Q+ 2024. El coach (o el cliente) responde 10
// preguntas Si/No, el estado (GREEN/REVIEW/RED) se computa server-side y se
// persiste en ClientProfile.parqStatus + ParqAnswer rows.
// =============================================================================

import * as React from "react";
import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
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

interface ParqCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientUserId: string;
  clientName: string;
  /** Called after a successful save so the parent can re-fetch profile data. */
  onCompleted: (status: "GREEN" | "REVIEW" | "RED") => void;
}

export function ParqCompletionDialog({
  open,
  onOpenChange,
  clientUserId,
  clientName,
  onCompleted,
}: ParqCompletionDialogProps) {
  const [answers, setAnswers] = useState<Record<string, "yes" | "no">>({});
  const [saving, setSaving] = useState(false);

  // Reset state when dialog closes so a re-open starts fresh.
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
      toast.error("Respondé las 10 preguntas antes de guardar.");
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
        // Should never happen with a complete form, but stay defensive.
        toast.error("El PAR-Q no quedó marcado como completado.");
        return;
      }
      toast.success(
        status === "GREEN"
          ? "PAR-Q guardado — sin restricciones."
          : status === "REVIEW"
            ? "PAR-Q guardado — requiere revisión."
            : "PAR-Q guardado — requiere autorización médica.",
      );
      onCompleted(status);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Completar PAR-Q+ 2024</DialogTitle>
          <DialogDescription>
            Cuestionario de aptitud física para {clientName}. Respondé con
            honestidad — la información es confidencial.
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
                {q.critical && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider font-bold text-[#EF4444]">
                    crítica
                  </span>
                )}
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
                ? "Requerirá autorización médica"
                : "Revisión médica recomendada"}
            </AlertTitle>
            <AlertDescription>
              {criticalYes
                ? "Hay respuestas críticas. El cliente quedará marcado en ROJO hasta validación médica."
                : "Algunas respuestas requieren revisión. El cliente quedará en estado AMARILLO."}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!allAnswered || saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Guardando..." : "Guardar PAR-Q"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
