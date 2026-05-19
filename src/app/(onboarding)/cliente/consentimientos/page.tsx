"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { submitConsents } from "@/app/actions/consents";
import { toast } from "sonner";

interface ConsentItem {
  id: "TERMS_AND_PRIVACY" | "HEALTH_DATA" | "AI_PROCESSING" | "MARKETING";
  label: string;
  description: string;
  required: boolean;
  defaultOpen?: boolean;
}

const consents: ConsentItem[] = [
  {
    id: "TERMS_AND_PRIVACY",
    label: "Términos y Política de Privacidad",
    description:
      "Aceptás los Términos y Condiciones y la Política de Privacidad de Blackline Fitness. Podés leerlos en blacklinefitness.app/legal antes de aceptar.",
    required: true,
    defaultOpen: true,
  },
  {
    id: "HEALTH_DATA",
    label: "Tratamiento de datos sensibles de salud",
    description:
      "Blackline Fitness almacena tus datos de salud (peso, medidas, respuestas PAR-Q+) para que tu entrenador pueda diseñar rutinas seguras y adecuadas. Estos datos se almacenan cifrados y nunca se venden a terceros. Sin este consentimiento, no podés usar la plataforma.",
    required: true,
  },
  {
    id: "AI_PROCESSING",
    label: "Procesamiento por IA (opcional)",
    description:
      "Permitís que Blackline Fitness use inteligencia artificial (Gemini de Google) para leer tu cédula y la pantalla de tu báscula automáticamente, ahorrándote tipeo. Si no aceptás, podés ingresar esos datos manualmente. Las fotos de progreso NUNCA se envían a IA.",
    required: false,
  },
  {
    id: "MARKETING",
    label: "Comunicaciones de marketing (opcional)",
    description:
      "Recibís emails con novedades de Blackline Fitness y tips de entrenamiento. Podés cancelar la suscripción en cualquier momento desde tu perfil.",
    required: false,
  },
];

export default function ConsentimientosPage() {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({
    TERMS_AND_PRIVACY: false,
    HEALTH_DATA: false,
    AI_PROCESSING: false,
    MARKETING: false,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    TERMS_AND_PRIVACY: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const requiredChecked = consents
    .filter((c) => c.required)
    .every((c) => checked[c.id]);

  async function handleContinue() {
    setSubmitting(true);
    const result = await submitConsents({
      consents: consents.map((c) => ({
        type: c.id,
        granted: !!checked[c.id],
        version: "1.0",
      })),
    });
    setSubmitting(false);
    if (result.ok) {
      router.push("/onboarding/cliente/cedula");
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Antes de empezar</h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Antes de armarte la rutina, necesito conocerte. Esto toma 4 minutos.
          Primero confirmá estos consentimientos.
        </p>
      </div>

      <div className="space-y-3">
        {consents.map((consent) => (
          <div
            key={consent.id}
            className="rounded-xl border border-[#3F3F46] bg-[#18181B] overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  id={`consent-${consent.id}`}
                  checked={!!checked[consent.id]}
                  onChange={(e) =>
                    setChecked((prev) => ({
                      ...prev,
                      [consent.id]: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 cursor-pointer rounded border-[#3F3F46] bg-[#27272A] accent-[#3B82F6]"
                  aria-describedby={`consent-desc-${consent.id}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={`consent-${consent.id}`}
                  className="block text-sm font-medium text-[#FAFAFA] cursor-pointer"
                >
                  {consent.label}
                  {consent.required && (
                    <span className="ml-1.5 text-xs text-[#EF4444]">
                      (obligatorio)
                    </span>
                  )}
                  {!consent.required && (
                    <span className="ml-1.5 text-xs text-[#71717A]">
                      (opcional)
                    </span>
                  )}
                </label>
              </div>
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [consent.id]: !prev[consent.id],
                  }))
                }
                aria-expanded={!!expanded[consent.id]}
                aria-controls={`consent-desc-${consent.id}`}
                aria-label={expanded[consent.id] ? "Ocultar detalles" : "Ver detalles"}
                className="shrink-0 p-1 text-[#71717A] hover:text-[#A1A1AA] transition-colors"
              >
                {expanded[consent.id] ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {expanded[consent.id] && (
              <div
                id={`consent-desc-${consent.id}`}
                className="border-t border-[#3F3F46] bg-[#27272A] px-4 py-3"
              >
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {consent.description}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!requiredChecked || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] py-3.5 text-sm font-semibold text-white min-h-[48px] hover:bg-[#2563EB] disabled:opacity-50 transition-colors"
      >
        {submitting ? "Guardando..." : "Continuar"}
      </button>

      {!requiredChecked && (
        <p className="text-center text-xs text-[#71717A]">
          Necesitás aceptar los consentimientos obligatorios para continuar.
        </p>
      )}
    </div>
  );
}
