"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { saveOnboardingStep } from "@/app/actions/onboarding";
import { useOnboardingStore } from "@/stores/onboarding-wizard-store";
import type { OnboardingStep8Data } from "@/types/onboarding";

import { Button } from "@/components/ui/button";
import { ConsentCheckbox } from "@/components/shared/consent-checkbox";

const CONSENT_VERSION = "1.0";

interface Step8ConsentsProps {
  draftId: string;
  /** True if AI was used in step 2 or 3 — pre-checks the AI consent box. */
  aiWasUsed: boolean;
}

export function Step8Consents({ draftId, aiWasUsed }: Step8ConsentsProps) {
  const { goNext, goBack, setStepData, payload } = useOnboardingStore();
  const existing = payload.step8;

  const [terms, setTerms] = useState(existing?.consentTerms ?? false);
  const [health, setHealth] = useState(existing?.consentHealthData ?? false);
  const [ai, setAi] = useState(existing?.consentAiProcessing ?? aiWasUsed);
  const [marketing, setMarketing] = useState(existing?.consentMarketing ?? false);
  const [saving, setSaving] = useState(false);

  const canSubmit = terms && health;

  async function handleSubmit() {
    if (!canSubmit) {
      toast.error("Los dos primeros consentimientos son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const data: OnboardingStep8Data = {
        consentTerms: true,
        consentHealthData: true,
        consentAiProcessing: ai,
        consentMarketing: marketing,
      };
      const result = await saveOnboardingStep(draftId, 8, data);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setStepData("step8", data);
      goNext();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] p-5 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-[#FAFAFA]">
            Consentimientos LPDP
          </h2>
          <p className="mt-1 text-sm text-[#71717A]">
            Para registrar al cliente necesitamos su autorizacion sobre el
            tratamiento de datos. Los dos primeros son obligatorios.
          </p>
        </div>

        <div className="space-y-5">
          {/* Obligatorio 1 */}
          <ConsentCheckbox
            id="consent-terms"
            checked={terms}
            onCheckedChange={setTerms}
            required
            version={CONSENT_VERSION}
            label="El cliente acepta los Terminos de Servicio y la Politica de Privacidad de Forja."
            policyHref="/legal/terminos"
            policyLabel="Ver terminos"
          />

          {/* Obligatorio 2 */}
          <ConsentCheckbox
            id="consent-health"
            checked={health}
            onCheckedChange={setHealth}
            required
            version={CONSENT_VERSION}
            label="El cliente autoriza el tratamiento de datos sensibles de salud (PAR-Q, mediciones antropometricas, fotos de progreso) por Forja y el entrenador, segun la Ley 8968."
            policyHref="/legal/privacidad"
            policyLabel="Ver politica"
          />

          {/* Opcional: IA */}
          <ConsentCheckbox
            id="consent-ai"
            checked={ai}
            onCheckedChange={setAi}
            required={false}
            version={CONSENT_VERSION}
            label="El cliente autoriza el procesamiento de la cedula y fotos de entrenamiento por Google Gemini (servidor en EE.UU.) para extraccion automatica de datos."
            policyHref="/legal/privacidad"
            policyLabel="Mas informacion"
          />

          {aiWasUsed && !ai && (
            <p className="text-xs text-[#F59E0B] pl-8">
              Se uso IA en pasos anteriores. Se recomienda marcar este consentimiento para coherencia.
            </p>
          )}

          {/* Opcional: Marketing */}
          <ConsentCheckbox
            id="consent-marketing"
            checked={marketing}
            onCheckedChange={setMarketing}
            required={false}
            version={CONSENT_VERSION}
            label="El cliente acepta recibir novedades, consejos y ofertas de Forja por correo electronico."
          />
        </div>
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
