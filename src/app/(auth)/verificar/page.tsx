import { Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verificá tu correo",
};

export default function VerificarPage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3B82F6]/10">
        <Mail className="h-7 w-7 text-[#3B82F6]" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold text-[#FAFAFA]">Revisá tu correo</h1>
      <p className="text-sm text-[#A1A1AA] text-balance">
        Mandamos un link de acceso. Hacé click ahí para continuar.
        El link expira en 24 horas.
      </p>
      <p className="text-xs text-[#71717A]">
        No lo encontrás? Revisá la carpeta de spam o correo no deseado.
      </p>
    </div>
  );
}
