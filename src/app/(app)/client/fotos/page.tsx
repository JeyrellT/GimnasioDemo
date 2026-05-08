"use client";

import { Camera } from "lucide-react";

export default function ClientFotosPage() {
  return (
    <div className="max-w-md mx-auto py-12 px-6 text-center space-y-4">
      <Camera className="h-12 w-12 text-neutral-600 mx-auto" />
      <h2 className="text-xl font-bold text-neutral-50">Fotos de progreso</h2>
      <p className="text-sm text-neutral-400">
        La captura de fotos estará disponible en la versión completa con
        almacenamiento en la nube.
      </p>
    </div>
  );
}
