"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
// TODO(backend-api): implementar recordParq() en actions/metrics.ts o actions/onboarding.ts
// que persista las respuestas del PAR-Q+ y actualice clientProfile.parqStatus.

// PAR-Q+ 2024 questions (10). follow-up required on Sí to these indices: 0,1,2,4,9
const QUESTIONS = [
  {
    code: "P1",
    text: "¿Te ha dicho un médico que tenés alguna afección cardíaca y que solo deberías hacer actividad física recomendada por un médico?",
    needsFollowUp: true,
  },
  {
    code: "P2",
    text: "¿Sentís dolor en el pecho cuando hacés actividad física?",
    needsFollowUp: true,
  },
  {
    code: "P3",
    text: "¿Has sentido dolor en el pecho fuera de la actividad física en el último mes?",
    needsFollowUp: true,
  },
  {
    code: "P4",
    text: "¿Te has desmayado o has perdido el equilibrio por mareos en el último mes?",
    needsFollowUp: false,
  },
  {
    code: "P5",
    text: "¿Tenés algún problema de huesos o articulaciones que se agrava con la actividad física?",
    needsFollowUp: true,
  },
  {
    code: "P6",
    text: "¿Estás tomando medicamentos para la presión arterial o para el corazón?",
    needsFollowUp: false,
  },
  {
    code: "P7",
    text: "¿Sabés de alguna otra razón por la cual no deberías hacer actividad física?",
    needsFollowUp: false,
  },
  {
    code: "P8",
    text: "¿Tenés diabetes, condición tiroidea, renal o hepática conocida?",
    needsFollowUp: false,
  },
  {
    code: "P9",
    text: "¿Tenés asma, EPOC, o problemas pulmonares conocidos?",
    needsFollowUp: false,
  },
  {
    code: "P10",
    text: "¿Estás embarazada o has tenido un bebé en los últimos 6 meses?",
    needsFollowUp: true,
  },
] as const;

type Answer = boolean | null;

interface ParqFormProps {
  onComplete: (status: "GREEN" | "REVIEW" | "RED") => void;
}

export function ParqForm({ onComplete }: ParqFormProps) {
  const [answers, setAnswers] = useState<Answer[]>(Array(QUESTIONS.length).fill(null));
  const [followUps, setFollowUps] = useState<string[]>(Array(QUESTIONS.length).fill(""));
  const [loading, setLoading] = useState(false);

  const anyYes = answers.some((a) => a === true);
  const allAnswered = answers.every((a) => a !== null);

  const setAnswer = (index: number, value: boolean) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const setFollowUp = (index: number, value: string) => {
    setFollowUps((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      toast.error("Respondé todas las preguntas antes de continuar.");
      return;
    }
    setLoading(true);
    try {
      // TODO(backend-api): llamar a recordParq() cuando esté implementado.
      // Por ahora derivamos el status directamente en el cliente.
      const yesCount = answers.filter((a) => a === true).length;
      // Preguntas críticas (cardíacas, desmayo): índices 0, 1, 2, 3 → status RED
      const criticalYes = [0, 1, 2, 3].some((i) => answers[i] === true);
      const status: "GREEN" | "REVIEW" | "RED" = criticalYes
        ? "RED"
        : yesCount > 0
          ? "REVIEW"
          : "GREEN";

      await new Promise((res) => setTimeout(res, 300)); // simula latencia
      onComplete(status);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#A1A1AA]">
        Respondé honestamente. Esta información es confidencial y ayuda a tu entrenador a cuidarte.
      </p>

      <div className="space-y-5">
        {QUESTIONS.map((q, i) => (
          <div key={q.code} className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-4 space-y-3">
            <p className="text-sm text-[#FAFAFA] leading-relaxed">
              <span className="font-semibold text-[#A1A1AA] mr-2">{i + 1}.</span>
              {q.text}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAnswer(i, true)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                  answers[i] === true
                    ? "border-[#EF4444] bg-[#450A0A] text-[#EF4444]"
                    : "border-[#3F3F46] bg-[#27272A] text-[#A1A1AA] hover:border-[#52525B]"
                }`}
                aria-pressed={answers[i] === true}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setAnswer(i, false)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                  answers[i] === false
                    ? "border-[#22C55E] bg-[#052E16] text-[#22C55E]"
                    : "border-[#3F3F46] bg-[#27272A] text-[#A1A1AA] hover:border-[#52525B]"
                }`}
                aria-pressed={answers[i] === false}
              >
                No
              </button>
            </div>
            {/* Follow-up field — shown when Sí and question requires it */}
            {answers[i] === true && q.needsFollowUp && (
              <div className="space-y-1.5">
                <Label htmlFor={`followup-${q.code}`} className="text-xs text-[#A1A1AA]">
                  Contá más detalle (opcional pero útil para tu entrenador)
                </Label>
                <Textarea
                  id={`followup-${q.code}`}
                  value={followUps[i]}
                  onChange={(e) => setFollowUp(i, e.target.value)}
                  placeholder="Describe brevemente..."
                  rows={2}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {anyYes && allAnswered && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Revisión médica recomendada</AlertTitle>
          <AlertDescription>
            Respondiste Sí a al menos una pregunta. Antes de seguir, necesitamos validación médica. Tu entrenador fue notificado. Podés continuar el onboarding, pero no podrás iniciar sesiones hasta que tu entrenador confirme que es seguro.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!allAnswered || loading}
        className="w-full"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {loading ? "Guardando..." : "Continuar"}
      </Button>
    </div>
  );
}
