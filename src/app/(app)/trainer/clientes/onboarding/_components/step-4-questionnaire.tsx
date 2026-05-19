"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { saveOnboardingStep } from "@/app/actions/onboarding";
import { useOnboardingStore } from "@/stores/onboarding-wizard-store";
import type { OnboardingStep4Data } from "@/types/onboarding";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const GOALS = [
  { value: "FAT_LOSS", label: "Bajar de peso" },
  { value: "MUSCLE_GAIN", label: "Ganar musculo" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
  { value: "PERFORMANCE", label: "Rendimiento" },
  { value: "GENERAL_HEALTH", label: "Salud general" },
] as const;

const PAR_Q = [
  { code: "P1", text: "?Te ha dicho un medico que tenes alguna afeccion cardiaca y que solo deberias hacer actividad fisica recomendada por un medico?", critical: true },
  { code: "P2", text: "?Sentis dolor en el pecho cuando haces actividad fisica?", critical: true },
  { code: "P3", text: "?Has sentido dolor en el pecho fuera de la actividad fisica en el ultimo mes?", critical: true },
  { code: "P4", text: "?Te has desmayado o has perdido el equilibrio por mareos en el ultimo mes?", critical: true },
  { code: "P5", text: "?Tenes algun problema de huesos o articulaciones que se agrava con la actividad fisica?", critical: false },
  { code: "P6", text: "?Estas tomando medicamentos para la presion arterial o para el corazon?", critical: false },
  { code: "P7", text: "?Sabes de alguna otra razon por la cual no deberias hacer actividad fisica?", critical: false },
  { code: "P8", text: "?Tenes diabetes, condicion tiroidea, renal o hepatica conocida?", critical: false },
  { code: "P9", text: "?Tenes asma, EPOC, o problemas pulmonares conocidos?", critical: false },
  { code: "P10", text: "?Estas embarazada o has tenido un bebe en los ultimos 6 meses?", critical: false },
] as const;

interface Step4QuestionnaireProps {
  draftId: string;
}

export function Step4Questionnaire({ draftId }: Step4QuestionnaireProps) {
  const { goNext, goBack, setStepData, payload } = useOnboardingStore();
  const existing = payload.step4;

  const [goal, setGoal] = useState<string>(existing?.goal ?? "");
  const [goalNotes, setGoalNotes] = useState(existing?.goalNotes ?? "");
  const [trainingDays, setTrainingDays] = useState<string>(
    String(existing?.trainingDaysPerWeek ?? ""),
  );
  const [takesMedication, setTakesMedication] = useState<boolean | null>(
    existing?.takesMedication ?? null,
  );
  const [medicationNotes, setMedicationNotes] = useState(
    existing?.medicationNotes ?? "",
  );
  const [hasInjuries, setHasInjuries] = useState<boolean | null>(
    existing?.hasInjuries ?? null,
  );
  const [injuryNotes, setInjuryNotes] = useState(existing?.injuryNotes ?? "");

  const [parqAnswers, setParqAnswers] = useState<Record<string, "yes" | "no">>(
    existing?.parqAnswers ?? {},
  );
  const [saving, setSaving] = useState(false);

  const allParqAnswered = PAR_Q.every((q) => parqAnswers[q.code] !== undefined);
  const anyYes = Object.values(parqAnswers).some((v) => v === "yes");
  const criticalYes = PAR_Q.filter((q) => q.critical).some(
    (q) => parqAnswers[q.code] === "yes",
  );

  function computeParqStatus(): OnboardingStep4Data["parqStatus"] {
    if (!allParqAnswered) return "NOT_COMPLETED";
    if (criticalYes) return "RED";
    if (anyYes) return "REVIEW";
    return "GREEN";
  }

  function setParqAnswer(code: string, val: "yes" | "no") {
    setParqAnswers((prev) => ({ ...prev, [code]: val }));
  }

  const canSubmit = goal !== "" && allParqAnswered;

  async function handleSubmit() {
    if (!canSubmit) {
      if (!goal) toast.error("Seleccioná un objetivo.");
      else toast.error("Respondé todas las preguntas del PAR-Q.");
      return;
    }

    setSaving(true);
    try {
      const data: OnboardingStep4Data = {
        goal: goal as OnboardingStep4Data["goal"],
        goalNotes: goalNotes || undefined,
        parqAnswers,
        parqStatus: computeParqStatus(),
        trainingDaysPerWeek: trainingDays ? Number(trainingDays) : undefined,
        hasInjuries: hasInjuries ?? undefined,
        injuryNotes: injuryNotes || undefined,
        takesMedication: takesMedication ?? undefined,
        medicationNotes: medicationNotes || undefined,
      };
      const result = await saveOnboardingStep(draftId, 4, data);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setStepData("step4", data);
      goNext();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Lifestyle */}
      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#A1A1AA]">
          Objetivos y estilo de vida
        </h2>

        {/* Goal */}
        <div className="space-y-2">
          <Label>Objetivo principal *</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GOALS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setGoal(value)}
                className={`rounded-lg border py-2.5 text-xs font-semibold transition-colors min-h-[44px] ${
                  goal === value
                    ? "border-[#3B82F6] bg-[rgba(255,106,26,0.15)] text-[#3B82F6]"
                    : "border-[#3F3F46] bg-[#27272A] text-[#A1A1AA] hover:border-[#52525B]"
                }`}
                aria-pressed={goal === value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Goal notes */}
        <div className="space-y-1.5">
          <Label>Notas sobre el objetivo (opcional)</Label>
          <Textarea
            value={goalNotes}
            onChange={(e) => setGoalNotes(e.target.value)}
            placeholder="Contexto adicional, eventos, plazos..."
            rows={2}
          />
        </div>

        {/* Training days */}
        <div className="space-y-1.5">
          <Label>?Cuantos dias por semana podas entrenar?</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={7}
            value={trainingDays}
            onChange={(e) => setTrainingDays(e.target.value)}
            placeholder="3"
            className="w-28"
          />
        </div>

        {/* Medication */}
        <div className="space-y-2">
          <Label>?Tomas medicamentos?</Label>
          <div className="flex gap-2">
            {(["Si", "No"] as const).map((opt) => {
              const val = opt === "Si";
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTakesMedication(val)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                    takesMedication === val
                      ? "border-[#3B82F6] bg-[rgba(255,106,26,0.15)] text-[#3B82F6]"
                      : "border-[#3F3F46] bg-[#27272A] text-[#A1A1AA] hover:border-[#52525B]"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {takesMedication && (
            <Textarea
              value={medicationNotes}
              onChange={(e) => setMedicationNotes(e.target.value)}
              placeholder="?Cuales medicamentos?"
              rows={2}
            />
          )}
        </div>

        {/* Injuries */}
        <div className="space-y-2">
          <Label>?Tenes lesiones o molestias fisicas?</Label>
          <div className="flex gap-2">
            {(["Si", "No"] as const).map((opt) => {
              const val = opt === "Si";
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setHasInjuries(val)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                    hasInjuries === val
                      ? "border-[#3B82F6] bg-[rgba(255,106,26,0.15)] text-[#3B82F6]"
                      : "border-[#3F3F46] bg-[#27272A] text-[#A1A1AA] hover:border-[#52525B]"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {hasInjuries && (
            <Textarea
              value={injuryNotes}
              onChange={(e) => setInjuryNotes(e.target.value)}
              placeholder="Describe la lesion o zona afectada..."
              rows={2}
            />
          )}
        </div>
      </div>

      {/* PAR-Q */}
      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#A1A1AA]">
            PAR-Q+ 2024
          </h2>
          <p className="mt-1 text-xs text-[#71717A]">
            Respondé honestamente. Informacion confidencial para tu entrenador.
          </p>
        </div>

        <div className="space-y-4">
          {PAR_Q.map((q, i) => (
            <div
              key={q.code}
              className="rounded-xl border border-[#3F3F46] bg-[#09090B] p-4 space-y-3"
            >
              <p className="text-sm text-[#FAFAFA] leading-relaxed">
                <span className="font-semibold text-[#A1A1AA] mr-2">{i + 1}.</span>
                {q.text}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setParqAnswer(q.code, "yes")}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                    parqAnswers[q.code] === "yes"
                      ? "border-[#EF4444] bg-[#450A0A] text-[#EF4444]"
                      : "border-[#3F3F46] bg-[#27272A] text-[#A1A1AA] hover:border-[#52525B]"
                  }`}
                  aria-pressed={parqAnswers[q.code] === "yes"}
                >
                  Si
                </button>
                <button
                  type="button"
                  onClick={() => setParqAnswer(q.code, "no")}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                    parqAnswers[q.code] === "no"
                      ? "border-[#22C55E] bg-[#052E16] text-[#22C55E]"
                      : "border-[#3F3F46] bg-[#27272A] text-[#A1A1AA] hover:border-[#52525B]"
                  }`}
                  aria-pressed={parqAnswers[q.code] === "no"}
                >
                  No
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Warning */}
        {anyYes && allParqAnswered && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Revision medica recomendada</AlertTitle>
            <AlertDescription>
              {criticalYes
                ? "Hay respuestas criticas. El cliente sera marcado con estado ROJO hasta validacion medica."
                : "Algunas respuestas requieren revision. El entrenador sera notificado."}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Nav */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={goBack} className="flex-1">
          Atras
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="flex-1"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Guardando..." : "Siguiente →"}
        </Button>
      </div>
    </div>
  );
}
