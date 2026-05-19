"use client";

import { useRef, useState, type RefObject } from "react";
import { Loader2, Upload, X, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { uploadOnboardingImage, saveOnboardingStep } from "@/app/actions/onboarding";
import { useOnboardingStore } from "@/stores/onboarding-wizard-store";
import type { OnboardingStep6Data } from "@/types/onboarding";

import { Button } from "@/components/ui/button";

interface Step6PhotosProps {
  draftId: string;
}

interface UploadedImage {
  key: string;
  url: string;
}

type View = "frente" | "perfil" | "espalda";

const VIEW_LABELS: Record<View, string> = {
  frente: "Frente",
  perfil: "Perfil",
  espalda: "Espalda",
};

const PURPOSE_MAP: Record<View, string> = {
  frente: "progress_front",
  perfil: "progress_side",
  espalda: "progress_back",
};

const KEY_MAP: Record<View, keyof OnboardingStep6Data> = {
  frente: "frontPhotoKey",
  perfil: "sidePhotoKey",
  espalda: "backPhotoKey",
};

export function Step6Photos({ draftId }: Step6PhotosProps) {
  const { goNext, goBack, setStepData, payload } = useOnboardingStore();
  const existing = payload.step6;

  const [photos, setPhotos] = useState<Partial<Record<View, UploadedImage>>>(
    () => {
      const obj: Partial<Record<View, UploadedImage>> = {};
      if (existing?.frontPhotoKey) obj.frente = { key: existing.frontPhotoKey, url: "" };
      if (existing?.sidePhotoKey) obj.perfil = { key: existing.sidePhotoKey, url: "" };
      if (existing?.backPhotoKey) obj.espalda = { key: existing.backPhotoKey, url: "" };
      return obj;
    },
  );
  const [uploading, setUploading] = useState<View | null>(null);

  const fileRefs: Record<View, RefObject<HTMLInputElement | null>> = {
    frente: useRef<HTMLInputElement>(null),
    perfil: useRef<HTMLInputElement>(null),
    espalda: useRef<HTMLInputElement>(null),
  };

  async function handleFileUpload(file: File, view: View) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar 10 MB.");
      return;
    }
    setUploading(view);
    const fd = new FormData();
    fd.append("draftId", draftId);
    fd.append("purpose", PURPOSE_MAP[view]);
    fd.append("file", file);

    const result = await uploadOnboardingImage(fd);
    setUploading(null);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setPhotos((prev) => ({ ...prev, [view]: result.value }));
  }

  async function handleSave() {
    const data: OnboardingStep6Data = {
      frontPhotoKey: photos.frente?.key,
      sidePhotoKey: photos.perfil?.key,
      backPhotoKey: photos.espalda?.key,
      skipped: false,
    };
    const result = await saveOnboardingStep(draftId, 6, data);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setStepData("step6", data);
    goNext();
  }

  async function handleSkip() {
    const data: OnboardingStep6Data = { skipped: true };
    const result = await saveOnboardingStep(draftId, 6, data);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setStepData("step6", data);
    goNext();
  }

  const hasAnyPhoto = Object.values(photos).some((p) => p?.key);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-[#FAFAFA]">
            Fotos iniciales de progreso
          </h2>
          <p className="mt-1 text-sm text-[#71717A]">
            Opcional. Son la linea base para comparar avances.
          </p>
        </div>

        {/* Privacy notice */}
        <div className="flex items-start gap-2.5 rounded-lg border border-[#22C55E]/20 bg-[#052E16] px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 text-[#22C55E] mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-xs text-[#71717A]">
            Estas fotos <strong className="text-[#FAFAFA]">NO</strong> se
            procesan con IA. Solo se guardan cifradas para el seguimiento de
            progreso del cliente.
          </p>
        </div>

        {/* Upload grid */}
        <div className="grid grid-cols-3 gap-3">
          {(["frente", "perfil", "espalda"] as View[]).map((view) => {
            const photo = photos[view];
            const isUploading = uploading === view;
            return (
              <div key={view} className="space-y-2">
                <input
                  ref={fileRefs[view]}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, view);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRefs[view].current?.click()}
                  disabled={isUploading}
                  aria-label={`Foto ${VIEW_LABELS[view]}`}
                  className={`flex w-full aspect-[3/4] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                    photo
                      ? "border-[#22C55E]/40 bg-[#052E16]"
                      : "border-[#3F3F46] bg-[#27272A] hover:border-[#52525B]"
                  }`}
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
                  ) : photo ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle2 className="h-6 w-6 text-[#22C55E]" />
                      <span className="text-xs text-[#22C55E]">Lista</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5 text-[#52525B]" />
                      <span className="text-xs text-[#71717A]">
                        {VIEW_LABELS[view]}
                      </span>
                    </div>
                  )}
                </button>
                {photo && (
                  <button
                    type="button"
                    onClick={() =>
                      setPhotos((prev) => {
                        const next = { ...prev };
                        delete next[view];
                        return next;
                      })
                    }
                    className="flex w-full items-center justify-center gap-1 text-xs text-[#71717A] hover:text-[#EF4444]"
                  >
                    <X className="h-3 w-3" />
                    Quitar
                  </button>
                )}
                {!photo && (
                  <p className="text-center text-xs text-[#52525B]">
                    {VIEW_LABELS[view]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Nav */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={goBack} className="flex-1">
          Atras
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleSkip}
          className="flex-1 text-[#71717A]"
        >
          Saltar
        </Button>
        {hasAnyPhoto && (
          <Button type="button" onClick={handleSave} className="flex-1">
            Siguiente →
          </Button>
        )}
      </div>

      {!hasAnyPhoto && (
        <p className="text-center text-xs text-[#52525B]">
          Subi al menos una foto o usa "Saltar" para continuar.
        </p>
      )}
    </div>
  );
}
