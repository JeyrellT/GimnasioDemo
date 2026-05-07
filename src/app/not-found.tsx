import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#09090B] px-6 text-center">
      <p className="text-7xl font-bold tabular text-[#3F3F46]">404</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Página no encontrada</h1>
        <p className="text-[#A1A1AA] text-base max-w-xs text-balance">
          La página que buscás no existe o fue movida.
        </p>
      </div>
      <Link
        href="/inicio"
        className="flex items-center gap-2 rounded-lg border border-[#3F3F46] px-6 py-3 text-sm font-semibold text-[#FAFAFA] min-h-[44px] hover:bg-[#18181B] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Ir al inicio
      </Link>
    </div>
  );
}
