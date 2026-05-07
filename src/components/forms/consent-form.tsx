"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsentCheckbox } from "@/components/shared/consent-checkbox";
import { grantMultipleConsents } from "@/app/actions/consents";

// Consent version tokens — bump these when the text changes
const CONSENT_VERSION = "1.0.0";

interface ConsentFormProps {
  onSuccess: () => void;
  role?: "CLIENT" | "TRAINER";
}

export function ConsentForm({ onSuccess, role = "CLIENT" }: ConsentFormProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [sensitiveDataAccepted, setSensitiveDataAccepted] = useState(false);
  const [aiProcessingAccepted, setAiProcessingAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = termsAccepted && sensitiveDataAccepted;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const result = await grantMultipleConsents({
        consents: [
          {
            type: "TERMS_AND_PRIVACY",
            granted: termsAccepted,
            version: CONSENT_VERSION,
          },
          {
            type: "HEALTH_DATA",
            granted: sensitiveDataAccepted,
            version: CONSENT_VERSION,
          },
          {
            type: "AI_PROCESSING",
            granted: aiProcessingAccepted,
            version: CONSENT_VERSION,
          },
          {
            type: "MARKETING",
            granted: marketingAccepted,
            version: CONSENT_VERSION,
          },
        ],
      });
      if (!result.ok) {
        toast.error("No se guardaron los consentimientos. Reintentá.");
        return;
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#A1A1AA]">
        {role === "CLIENT"
          ? "Para usar Forja, necesitamos tu consentimiento sobre cómo tratamos tus datos. Los dos primeros son obligatorios."
          : "Como entrenador procesarás datos sensibles de salud de tus clientes. Estas aceptaciones son obligatorias para operar en la plataforma."}
      </p>

      <div className="space-y-4">
        {/* Obligatorio 1 */}
        <ConsentCheckbox
          id="consent-terms"
          checked={termsAccepted}
          onCheckedChange={setTermsAccepted}
          required
          version={CONSENT_VERSION}
          label="Acepto los Términos de Servicio y la Política de Privacidad de Forja."
          policyHref="/legal/terminos"
          policyLabel="Ver términos"
        />

        {/* Obligatorio 2 */}
        <ConsentCheckbox
          id="consent-health"
          checked={sensitiveDataAccepted}
          onCheckedChange={setSensitiveDataAccepted}
          required
          version={CONSENT_VERSION}
          label="Autorizo el tratamiento de mis datos sensibles de salud (PAR-Q, mediciones antropométricas, fotos de progreso) por parte de Forja y mi entrenador vinculado, según lo establece la Ley 8968."
          policyHref="/legal/privacidad"
          policyLabel="Ver política"
        />

        {/* Opcional: IA */}
        <ConsentCheckbox
          id="consent-ai"
          checked={aiProcessingAccepted}
          onCheckedChange={setAiProcessingAccepted}
          required={false}
          version={CONSENT_VERSION}
          label="Autorizo el procesamiento de la foto de mi cédula y báscula por Google Gemini (servicio en EE.UU.) para extracción automática de datos. Podés usar la app sin esta opción ingresando los datos manualmente."
          policyHref="/legal/privacidad"
          policyLabel="Más información"
        />

        {/* Opcional: Marketing */}
        <ConsentCheckbox
          id="consent-marketing"
          checked={marketingAccepted}
          onCheckedChange={setMarketingAccepted}
          required={false}
          version={CONSENT_VERSION}
          label="Quiero recibir novedades, consejos y ofertas de Forja por correo electrónico. Podés cancelar en cualquier momento."
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {loading ? "Guardando..." : "Continuar"}
      </Button>
    </div>
  );
}
