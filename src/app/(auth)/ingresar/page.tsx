"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function IngresarPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Forja Demo</h1>
        <p className="text-sm text-[#71717A]">
          Demo interactiva del sistema de gestión para entrenadores.
          Tus datos se guardan solo en este navegador.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          className="w-full h-12 bg-[#FF6A1A] hover:bg-[#E55A0E] text-white font-semibold"
          onClick={() => router.push("/inicio")}
        >
          Ingresar como demo
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <p className="text-xs text-center text-[#52525B]">
          Coach Demo · demo@forja.app
        </p>
      </div>

      <p className="text-[11px] text-center text-[#52525B]">
        Versión demo · Sin servidor · Datos en localStorage
      </p>
    </div>
  );
}
