"use client";

import { useRouter } from "next/navigation";
import { ParqForm } from "@/components/forms/parq-form";

export default function ParqPage() {
  const router = useRouter();

  function handleComplete(status: "GREEN" | "REVIEW" | "RED") {
    if (status === "RED" || status === "REVIEW") {
      router.push("/onboarding/cliente/antropometria");
    } else {
      router.push("/onboarding/cliente/antropometria");
    }
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
    </div>
  );
}
