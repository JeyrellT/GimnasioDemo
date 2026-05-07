"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, SkipForward, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PhotoView = "FRONT" | "SIDE" | "BACK";

interface PhotoState {
  view: PhotoView;
  file: File | null;
  preview: string | null;
}

const photoConfigs: Array<{
  view: PhotoView;
  label: string;
  guide: string;
}> = [
  {
    view: "FRONT",
    label: "Frontal",
    guide: "De frente, brazos a los lados, cuerpo completo.",
  },
  {
    view: "SIDE",
    label: "Lateral",
    guide: "De perfil izquierdo, brazos a los lados.",
  },
  {
    view: "BACK",
    label: "Posterior",
    guide: "De espaldas, brazos a los lados.",
  },
];

export default function FotoInicialPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Record<PhotoView, PhotoState>>({
    FRONT: { view: "FRONT", file: null, preview: null },
    SIDE: { view: "SIDE", file: null, preview: null },
    BACK: { view: "BACK", file: null, preview: null },
  });
  const [uploading, setUploading] = useState(false);

  function handleFileChange(view: PhotoView, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen.");
      return;
    }
    const preview = URL.createObjectURL(file);
    setPhotos((prev) => ({
      ...prev,
      [view]: { view, file, preview },
    }));
  }

  function clearPhoto(view: PhotoView) {
    setPhotos((prev) => ({
      ...prev,
      [view]: { view, file: null, preview: null },
    }));
  }

  async function handleContinue() {
    const photosToUpload = Object.values(photos).filter((p) => p.file);
    if (photosToUpload.length === 0) {
      router.push("/onboarding/cliente/resumen");
      return;
    }

    setUploading(true);
    for (const photo of photosToUpload) {
      if (!photo.file) continue;
      const formData = new FormData();
      formData.append("file", photo.file);
      formData.append("view", photo.view);

      const res = await fetch("/api/upload/presigned", { method: "POST", body: formData });
      if (!res.ok) {
        toast.error("No se pudo subir una de las fotos. Reintentá.");
        setUploading(false);
        return;
      }
    }
    setUploading(false);
    router.push("/onboarding/cliente/resumen");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Fotos iniciales</h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Las fotos de progreso son opcionales pero muy útiles para medir
          cambios visuales. Solo vos y tu entrenador las ven. Se almacenan
          cifradas sin datos EXIF.
        </p>
      </div>

      <div className="space-y-4">
        {photoConfigs.map(({ view, label, guide }) => {
          const photo = photos[view];
          return (
            <div key={view} className="rounded-xl border border-[#3F3F46] bg-[#18181B] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#3F3F46]">
                <div>
                  <p className="text-sm font-semibold text-[#FAFAFA]">{label}</p>
                  <p className="text-xs text-[#71717A]">{guide}</p>
                </div>
                {photo.preview && (
                  <CheckCircle className="h-5 w-5 text-[#22C55E]" aria-hidden="true" />
                )}
              </div>

              {photo.preview ? (
                <div className="relative">
                  <img
                    src={photo.preview}
                    alt={`Vista ${label}`}
                    className="h-48 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => clearPhoto(view)}
                    aria-label={`Eliminar foto ${label}`}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <label
                  className="flex cursor-pointer flex-col items-center gap-2 p-6 hover:bg-[#27272A] transition-colors"
                >
                  <Camera className="h-8 w-8 text-[#71717A]" aria-hidden="true" />
                  <span className="text-xs text-[#A1A1AA]">
                    Tocá para tomar o seleccionar foto
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileChange(view, e)}
                    className="sr-only"
                    aria-label={`Foto ${label}`}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={uploading}
          className="flex w-full items-center justify-center rounded-xl bg-[#FF6A1A] py-3.5 text-sm font-semibold text-white min-h-[48px] hover:bg-[#E55A0E] disabled:opacity-60 transition-colors"
        >
          {uploading ? "Subiendo fotos..." : "Continuar"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/onboarding/cliente/resumen")}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#3F3F46] py-3.5 text-sm font-medium text-[#A1A1AA] min-h-[48px] hover:bg-[#18181B] transition-colors"
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
          Saltear
        </button>
      </div>
    </div>
  );
}
