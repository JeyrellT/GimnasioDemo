"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { submitConsents } from "@/app/actions/consents";
import { toast } from "sonner";

const consents = [
  {
    id: "TERMS_AND_PRIVACY" as const,
    label: "Términos y Política de Privacidad",
    description:
      "Aceptás los Términos y Condiciones y la Política de Privacidad de Blackline Fitness como proveedor de servicios profesional.",
    required: true,
  },
  {
    id: "HEALTH_DATA" as const,
    label: "Tratamiento de datos sensibles de salud",
    description:
      "Como entrenador, sos procesador de datos sensibles de tus clientes bajo la Ley 8968. Aceptás las obligaciones correspondientes y el uso de Blackline Fitness como plataforma para ese tratamiento.",
    required: true,
  },
  {
    id: "MARKETING" as const,
    label: "Comunicaciones sobre nuevas funciones (opcional)",
    description:
      "Recibís emails con novedades de Blackline Fitness, tips profesionales y anuncios de nuevas funciones.",
    required: false,
  },
];

export default function EntrenadorConsentimientosPage() {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
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
      router.push("/onboarding/entrenador/perfil");
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Empecemos</h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Como entrenador, sos responsable de los datos de tus clientes. Leé
          estos consentimientos con atención.
        </p>
      </div>

      <div className="space-y-3">
        {consents.map((consent) => (
          <div
            key={consent.id}
            className="rounded-xl border border-[#3F3F46] bg-[#18181B] overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4">
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
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-[#3F3F46] bg-[#27272A] accent-[#FF6A1A]"
              />
              <div className="flex-1">
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
                aria-label={expanded[consent.id] ? "Ocultar" : "Ver detalles"}
                className="shrink-0 p-1 text-[#71717A] hover:text-[#A1A1AA]"
              >
                {expanded[consent.id] ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {expanded[consent.id] && (
              <div className="border-t border-[#3F3F46] bg-[#27272A] px-4 py-3">
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
        className="flex w-full items-center justify-center rounded-xl bg-[#FF6A1A] py-3.5 text-sm font-semibold text-white min-h-[48px] hover:bg-[#E55A0E] disabled:opacity-50 transition-colors"
      >
        {submitting ? "Guardando..." : "Continuar"}
      </button>
    </div>
  );
}
