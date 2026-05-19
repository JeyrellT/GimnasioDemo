"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import {
  uploadOnboardingImage,
  grantAiConsent,
  extractCedulaForOnboarding,
  saveOnboardingStep,
} from "@/app/actions/onboarding";
import { useOnboardingStore } from "@/stores/onboarding-wizard-store";
import type { OnboardingCedulaExtraction } from "@/types/onboarding";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsentCheckbox } from "@/components/shared/consent-checkbox";

interface Step2CedulaProps {
  draftId: string;
  aiConsentAlreadyGranted: boolean;
  extractionUsed: boolean;
}

interface UploadedImage {
  key: string;
  url: string;
}

export function Step2Cedula({
  draftId,
  aiConsentAlreadyGranted,
  extractionUsed,
}: Step2CedulaProps) {
  const { goNext, goBack, setStepData, payload } = useOnboardingStore();

  const existing = payload.step2;

  const [consentGiven, setConsentGiven] = useState(aiConsentAlreadyGranted);
  const [frente, setFrente] = useState<UploadedImage | null>(
    existing?.cedulaImageKey
      ? { key: existing.cedulaImageKey, url: "" }
      : null,
  );
  const [dorso, setDorso] = useState<UploadedImage | null>(null);
  const [uploading, setUploading] = useState<"frente" | "dorso" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extraction, setExtraction] = useState<OnboardingCedulaExtraction | null>(
    existing?.extracted ?? null,
  );

  // Editable extraction fields
  const [editedName, setEditedName] = useState(extraction?.fullName ?? "");
  const [editedId, setEditedId] = useState(extraction?.idNumber ?? "");
  const [editedDob, setEditedDob] = useState(extraction?.dateOfBirth ?? "");

  const frenteRef = useRef<HTMLInputElement>(null);
  const dorsoRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(
    file: File,
    side: "frente" | "dorso",
  ) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar 10 MB.");
      return;
    }
    setUploading(side);
    const fd = new FormData();
    fd.append("draftId", draftId);
    fd.append("purpose", side === "frente" ? "cedula_front" : "cedula_back");
    fd.append("file", file);

    const result = await uploadOnboardingImage(fd);
    setUploading(null);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    if (side === "frente") setFrente(result.value);
    else setDorso(result.value);
  }

  async function handleExtract() {
    if (!frente) return;

    setProcessing(true);
    try {
      // Grant AI consent if not already done
      if (!consentGiven) {
        const cResult = await grantAiConsent(draftId);
        if (!cResult.ok) {
          toast.error(cResult.error.message);
          return;
        }
        setConsentGiven(true);
      }

      const result = await extractCedulaForOnboarding(draftId, frente.key);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setExtraction(result.value);
      setEditedName(result.value.fullName ?? "");
      setEditedId(result.value.idNumber ?? "");
      setEditedDob(result.value.dateOfBirth ?? "");
      toast.success("Cédula procesada correctamente.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleConfirmExtraction() {
    if (!extraction || !frente) return;

    const approvedExtraction: OnboardingCedulaExtraction = {
      ...extraction,
      fullName: editedName || undefined,
      idNumber: editedId || undefined,
      dateOfBirth: editedDob || undefined,
      approved: true,
    };

    const data = {
      cedulaImageKey: frente.key,
      extracted: approvedExtraction,
    };

    const result = await saveOnboardingStep(draftId, 2, data);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setStepData("step2", data);
    toast.success("Datos confirmados.");
    goNext();
  }

  async function handleSkip() {
    const result = await saveOnboardingStep(draftId, 2, {
      skipped: true,
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setStepData("step2", { skipped: true });
    goNext();
  }

  const canExtract = consentGiven && frente !== null && !extractionUsed;
  const hasExtraction = extraction !== null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-[#FAFAFA]">
            Cédula de identidad
          </h2>
          <p className="mt-1 text-sm text-[#71717A]">
            Opcional. La IA puede extraer datos automáticamente de la imagen.
          </p>
        </div>

        {/* Consent */}
        {!aiConsentAlreadyGranted && (
          <div className="rounded-lg border border-[#3F3F46] bg-[#09090B] p-4">
            <ConsentCheckbox
              id="cedula-ai-consent"
              checked={consentGiven}
              onCheckedChange={setConsentGiven}
              required
              version="1.0"
              label="Acepto que Google Gemini procese la imagen de la cédula. La imagen se borra a los 30 días."
              policyHref="/legal/privacidad"
              policyLabel="Más información"
            />
          </div>
        )}

        {/* Upload zones */}
        <div className="grid grid-cols-2 gap-3">
          {/* Frente */}
          <div className="space-y-2">
            <Label className="text-xs text-[#A1A1AA]">Frente *</Label>
            <input
              ref={frenteRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f, "frente");
              }}
            />
            <button
              type="button"
              onClick={() => frenteRef.current?.click()}
              disabled={uploading === "frente"}
              className={`relative flex w-full aspect-[3/2] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                frente
                  ? "border-[#22C55E]/40 bg-[#052E16]"
                  : "border-[#3F3F46] bg-[#27272A] hover:border-[#52525B]"
              }`}
              aria-label="Subir frente de cédula"
            >
              {uploading === "frente" ? (
                <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
              ) : frente ? (
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle2 className="h-6 w-6 text-[#22C55E]" />
                  <span className="text-xs text-[#22C55E]">Subida</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5 text-[#52525B]" />
                  <span className="text-xs text-[#71717A]">Frente</span>
                </div>
              )}
            </button>
            {frente && (
              <button
                type="button"
                onClick={() => setFrente(null)}
                className="flex items-center gap-1 text-xs text-[#71717A] hover:text-[#EF4444]"
              >
                <X className="h-3 w-3" />
                Quitar
              </button>
            )}
          </div>

          {/* Dorso */}
          <div className="space-y-2">
            <Label className="text-xs text-[#A1A1AA]">Dorso (opcional)</Label>
            <input
              ref={dorsoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f, "dorso");
              }}
            />
            <button
              type="button"
              onClick={() => dorsoRef.current?.click()}
              disabled={uploading === "dorso"}
              className={`relative flex w-full aspect-[3/2] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                dorso
                  ? "border-[#22C55E]/40 bg-[#052E16]"
                  : "border-[#3F3F46] bg-[#27272A] hover:border-[#52525B]"
              }`}
              aria-label="Subir dorso de cédula"
            >
              {uploading === "dorso" ? (
                <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
              ) : dorso ? (
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle2 className="h-6 w-6 text-[#22C55E]" />
                  <span className="text-xs text-[#22C55E]">Subida</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5 text-[#52525B]" />
                  <span className="text-xs text-[#71717A]">Dorso</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Extract button */}
        {extractionUsed ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-[#F59E0B] shrink-0" />
            <p className="text-xs text-[#A1A1AA]">
              IA usada para este borrador. Editá los datos manualmente si necesitás cambios.
            </p>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleExtract}
            disabled={!canExtract || processing}
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Procesando con IA...
              </>
            ) : (
              "Procesar con IA"
            )}
          </Button>
        )}

        {/* Extraction result */}
        {hasExtraction && (
          <div className="rounded-xl border border-brand-primary/30 bg-[rgba(255,106,26,0.05)] p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
              Datos extraídos — revisá y confirmá
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#A1A1AA]">Nombre completo</Label>
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Sin datos"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#A1A1AA]">Número de cédula</Label>
                <Input
                  value={editedId}
                  onChange={(e) => setEditedId(e.target.value)}
                  placeholder="Sin datos"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#A1A1AA]">Fecha de nacimiento</Label>
                <Input
                  type="date"
                  value={editedDob}
                  onChange={(e) => setEditedDob(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={handleConfirmExtraction}
              className="w-full"
            >
              Confirmar y continuar →
            </Button>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          className="flex-1"
        >
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
      </div>
    </div>
  );
}
