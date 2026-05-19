import { Construction } from "lucide-react";
import Link from "next/link";

export default function AdminBibliotecaPage() {
  return (
    <div className="max-w-md mx-auto py-12 px-6 text-center space-y-4">
      <Construction className="h-12 w-12 text-[#3B82F6] mx-auto" />
      <h2 className="text-xl font-bold text-[#FAFAFA]">Proximamente</h2>
      <p className="text-sm text-[#A1A1AA]">
        Esta seccion estara disponible pronto.
      </p>
      <Link
        href="/inicio"
        className="inline-block px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-semibold rounded-lg"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
