"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";

import {
  uploadOnboardingImage,
  grantAiConsent,
  extractWorkoutPhotosForOnboarding,
  saveOnboardingStep,
} from "@/app/actions/onboarding";
import { useOnboardingStore } from "@/stores/onboarding-wizard-store";
import type { OnboardingStep3Data } from "@/types/onboarding";

import { Button } from "@/components/ui/button";
import type { WorkoutPhotoExtraction } from "@/lib/ai/extract-workout-photos";

// WorkoutPhotoExtraction shape from AI module — subset for display
type WorkoutSummary = Pick<
  WorkoutPhotoExtraction,
  "estimatedExperienceLevel" | "trainingFrequencyPerWeek" | "detectedExercises"
>;

interface Step3WorkoutProps {
  draftId: string;
  aiConsentAlreadyGranted: boolean;
  extractionUsed: boolean;
}

interface UploadedImage {
  key: string;
  url: string;
}

const EXPERIENCE_LABELS: Record<string, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
  UNKNOWN: "Sin determinar",
};

export function Step3Workout({
  draftId,
  aiConsentAlreadyGranted,
  extractionUsed,
}: Step3WorkoutProps) {
  // Bug 10: granular selectors
  const goNext = useOnboardingStore((s) => s.goNext);
  const goBack = useOnboardingStore((s) => s.goBack);
  const setStepData = useOnboardingStore((s) => s.setStepData);
  const payload = useOnboardingStore((s) => s.payload);

  const existing = payload.step3;
  const [photos, setPhotos] = useState<UploadedImage[]>(() =>
    (existing?.workoutPhotoKeys ?? []).map((k) => ({ key: k, url: "" })),
  );
  const [uploading, setUploading] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [manualDays, setManualDays] = useState<number>(3);
  const [manualLevel, setManualLevel] = useState("INTERMEDIATE");

  const fileRef0 = useRef<HTMLInputElement>(null);
  const fileRef1 = useRef<HTMLInputElement>(null);
  const fileRef2 = useRef<HTMLInputElement>(null);
  const fileRefs = [fileRef0, fileRef1, fileRef2];

  async function handleFileUpload(file: File, slot: number) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar 10 MB.");
      return;
    }
    setUploading(slot);
    const fd = new FormData();
    fd.append("draftId", draftId);
    fd.append("purpose", "workout");
    fd.append("file", file);

    const result = await uploadOnboardingImage(fd);
    setUploading(null);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setPhotos((prev) => {
      const next = [...prev];
      next[slot] = result.value;
      return next;
    });
  }

  async function handleExtract() {
    const keys = photos.map((p) => p.key).filter(Boolean);
    if (keys.length === 0) {
      toast.error("Subí al menos una foto de entrenamiento.");
      return;
    }

    setProcessing(true);
    try {
      if (!aiConsentAlreadyGranted) {
        const cResult = await grantAiConsent(draftId);
        if (!cResult.ok) {
          toast.error(cResult.error.message);
          return;
        }
      }

      const result = await extractWorkoutPhotosForOnboarding(draftId, keys);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setSummary(result.value as WorkoutSummary);
      setManualDays((result.value as WorkoutSummary).trainingFrequencyPerWeek ?? 3);
      setManualLevel(result.value.estimatedExperienceLevel ?? "INTERMEDIATE");
      toast.success("Fotos procesadas.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleConfirm() {
    const data: OnboardingStep3Data = {
      workoutPhotoKeys: photos.map((p) => p.key).filter(Boolean),
      skipped: false,
    };
    const result = await saveOnboardingStep(draftId, 3, data);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setStepData("step3", data);
    goNext();
  }

  async function handleSkip() {
    const data: OnboardingStep3Data = { workoutPhotoKeys: [], skipped: true };
    const result = await saveOnboardingStep(draftId, 3, data);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setStepData("step3", data);
    goNext();
  }

  const hasPhotos = photos.some((p) => p.key);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-[#FAFAFA]">
            Fotos de entrenamiento
          </h2>
          <p className="mt-1 text-sm text-[#71717A]">
            Opcional. Sube fotos de tu bitácora para que la IA estime tu nivel y
            dias de entrenamiento.
          </p>
        </div>

        {/* Upload slots */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((slot) => {
            const photo = photos[slot];
            return (
              <div key={slot} className="space-y-1.5">
                <input
                  ref={fileRefs[slot]}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, slot);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRefs[slot]?.current?.click()}
                  disabled={uploading === slot}
                  className={`flex w-full aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                    photo
                      ? "border-[#22C55E]/40 bg-[#052E16]"
                      : "border-[#3F3F46] bg-[#27272A] hover:border-[#52525B]"
                  }`}
                  aria-label={`Foto ${slot + 1}`}
                >
                  {uploading === slot ? (
                    <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
                  ) : photo ? (
                    <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
                  ) : (
                    <Upload className="h-5 w-5 text-[#52525B]" />
                  )}
                </button>
                {photo && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotos((prev) => {
                        const next = [...prev];
                        next.splice(slot, 1);
                        return next;
                      });
                    }}
                    className="flex w-full items-center justify-center gap-1 text-xs text-[#71717A] hover:text-[#EF4444]"
                  >
                    <X className="h-3 w-3" />
                    Quitar
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Extract button */}
        {extractionUsed ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-[#F59E0B] shrink-0" />
            <p className="text-xs text-[#A1A1AA]">
              IA ya usada para este borrador.
            </p>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleExtract}
            disabled={!hasPhotos || processing || !aiConsentAlreadyGranted}
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizando...
              </>
            ) : (
              "Procesar con IA"
            )}
          </Button>
        )}

        {!aiConsentAlreadyGranted && (
          <p className="text-xs text-[#71717A]">
            El procesamiento con IA requiere el consentimiento otorgado en el paso 2.
          </p>
        )}

        {/* Summary */}
        {summary && (
          <div className="rounded-xl border border-brand-primary/30 bg-[rgba(255,106,26,0.05)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
                Resultado IA
              </p>
              <button
                type="button"
                onClick={() => setEditMode((v) => !v)}
                className="flex items-center gap-1 text-xs text-[#71717A] hover:text-[#FAFAFA]"
              >
                <Pencil className="h-3 w-3" />
                {editMode ? "Cerrar" : "Editar"}
              </button>
            </div>

            {editMode ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-[#A1A1AA]">Nivel estimado</label>
                  <select
                    value={manualLevel}
                    onChange={(e) => setManualLevel(e.target.value)}
                    className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA]"
                  >
                    {Object.entries(EXPERIENCE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[#A1A1AA]">
                    Dias por semana ({manualDays})
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={7}
                    value={manualDays}
                    onChange={(e) => setManualDays(Number(e.target.value))}
                    className="w-full accent-brand-primary"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#FAFAFA]">
                Nivel:{" "}
                <span className="font-semibold">
                  {EXPERIENCE_LABELS[summary.estimatedExperienceLevel] ?? summary.estimatedExperienceLevel}
                </span>{" "}
                · {summary.trainingFrequencyPerWeek ?? "?"} días/semana ·{" "}
                {summary.detectedExercises.length} ejercicios detectados
              </p>
            )}

            <Button type="button" onClick={handleConfirm} className="w-full">
              Confirmar y continuar →
            </Button>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={goBack} className="flex-1">
          Atrás
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleSkip}
          className="flex-1 text-[#71717A]"
        >
          Saltar
        </Button>
        {hasPhotos && !summary && (
          <Button type="button" onClick={handleConfirm} className="flex-1">
            Sin IA →
          </Button>
        )}
      </div>
    </div>
  );
}
