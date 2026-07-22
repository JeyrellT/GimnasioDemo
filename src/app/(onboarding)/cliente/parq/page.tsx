"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ParqForm } from "@/components/forms/parq-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const NEXT_STEP = "/onboarding/cliente/antropometria";

export default function ParqPage() {
  const router = useRouter();
  const [showRedDialog, setShowRedDialog] = useState(false);

  function handleComplete(status: "GREEN" | "REVIEW" | "RED") {
    if (status === "RED") {
      setShowRedDialog(true);
      return;
    }

    if (status === "REVIEW") {
      toast.warning(
        "Tu entrenador revisará tus respuestas antes de comenzar.",
        { duration: 5000 },
      );
    }

    router.push(NEXT_STEP);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">PAR-Q+</h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Respondé con honestidad. Esto ayuda a tu entrenador a prescribirte
          ejercicio de forma segura. Solo vos y tu entrenador ven estas
          respuestas.
        </p>
      </div>
      <ParqForm onComplete={handleComplete} />

      {/* RED status — medical contraindication dialog */}
      <Dialog open={showRedDialog} onOpenChange={setShowRedDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Atención — recomendamos consulta médica</DialogTitle>
            <DialogDescription className="pt-1">
              Basado en tus respuestas, hay factores de salud que requieren
              evaluación médica antes de iniciar un programa de ejercicio.
              Recomendamos que consultes con tu médico y obtengas autorización
              por escrito antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <button
              type="button"
              onClick={() => setShowRedDialog(false)}
              className="flex w-full items-center justify-center rounded-lg border border-[#3F3F46] bg-[#27272A] px-4 py-2.5 text-sm font-medium text-[#FAFAFA] transition-colors hover:bg-[#3F3F46]"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRedDialog(false);
                router.push(NEXT_STEP);
              }}
              className="flex w-full items-center justify-center rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-2.5 text-sm font-medium text-[#EF4444] transition-colors hover:bg-[#EF4444]/20"
            >
              Acepto el riesgo y continuar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
