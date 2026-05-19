"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createOnboardingDraft } from "@/app/actions/onboarding";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export default function InvitarPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function startWizard() {
    setCreating(true);
    try {
      const fd = new FormData();
      fd.set("mode", "TRAINER_SIDE");
      const result = await createOnboardingDraft(fd);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      router.push(`/trainer/clientes/onboarding/${result.value.draftId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-lg space-y-8">
      <PageHeader
        title="Crear cliente nuevo"
        description="Registra un cliente nuevo paso a paso con el asistente de onboarding."
      />

      <div className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-8 flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,106,26,0.12)] border border-[rgba(255,106,26,0.2)]">
          <UserPlus className="h-8 w-8 text-[#3B82F6]" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-[#FAFAFA]">
            Asistente de onboarding
          </h2>
          <p className="text-sm text-[#71717A] max-w-xs mx-auto">
            9 pasos guiados: datos personales, cuestionario de salud, medidas
            corporales, plan y consentimientos LPDP.
          </p>
        </div>

        <ul className="w-full space-y-2 text-left">
          {[
            "Datos basicos y cédula (IA opcional)",
            "PAR-Q y cuestionario de estilo de vida",
            "Antropometria y fotos de progreso",
            "Plan de precio y rutina asignada",
            "Consentimientos LPDP automatizados",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-[#A1A1AA]">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(255,106,26,0.15)] text-[10px] font-bold text-[#3B82F6]"
                aria-hidden="true"
              >
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>

        <Button
          onClick={startWizard}
          disabled={creating}
          className="w-full h-12 text-base font-semibold"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Iniciando...
            </>
          ) : (
            "Empezar onboarding →"
          )}
        </Button>
      </div>
    </div>
  );
}
