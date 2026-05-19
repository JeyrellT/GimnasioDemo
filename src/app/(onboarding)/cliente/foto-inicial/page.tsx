"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, SkipForward, CheckCircle, X, AlertCircle } from "lucide-react";
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
  // Bug 6: track per-slot upload failures for targeted retry feedback
  const [failedViews, setFailedViews] = useState<PhotoView[]>([]);

  // Bug 5: revoke all blob URLs when photos state changes (cleanup previous URLs)
  useEffect(() => {
    const previews = Object.values(photos)
      .map((p) => p.preview)
      .filter((p): p is string => p !== null);

    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photos]);

  function handleFileChange(view: PhotoView, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen.");
      return;
    }
    // Bug 5: file-size guard
    if (file.size > 10_485_760) {
      toast.error("Imagen muy grande (máx 10MB).");
      return;
    }
    const preview = URL.createObjectURL(file);
    setPhotos((prev) => ({
      ...prev,
      [view]: { view, file, preview },
    }));
    // Clear failure state for this slot if user retries
    setFailedViews((prev) => prev.filter((v) => v !== view));
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
    setFailedViews([]);

    const newFailures: PhotoView[] = [];

    for (const photo of photosToUpload) {
      if (!photo.file) continue;
      const formData = new FormData();
      formData.append("file", photo.file);
      formData.append("view", photo.view);

      try {
        const res = await fetch("/api/upload/presigned", { method: "POST", body: formData });
        if (!res.ok) {
          newFailures.push(photo.view);
        }
      } catch {
        newFailures.push(photo.view);
      }
    }

    setUploading(false);

    // Bug 6: surface per-slot failures instead of silently returning
    if (newFailures.length > 0) {
      setFailedViews(newFailures);
      const labels = newFailures
        .map((v) => photoConfigs.find((c) => c.view === v)?.label ?? v)
        .join(", ");
      toast.error(`No se pudieron subir: ${labels}. Volvé a intentar.`);
      return;
    }

    router.push("/onboarding/cliente/resumen");
  }

  const viewLabel = (view: PhotoView) =>
    photoConfigs.find((c) => c.view === view)?.label ?? view;

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

      {/* Bug 6: per-slot retry banner */}
      {failedViews.length > 0 && (
        <div className="rounded-xl border border-[#EF4444]/30 bg-[#450A0A]/30 px-4 py-3 space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#EF4444] shrink-0" aria-hidden="true" />
            <p className="text-sm font-semibold text-[#EF4444]">
              Error al subir fotos
            </p>
          </div>
          <ul className="ml-6 list-disc space-y-0.5">
            {failedViews.map((v) => (
              <li key={v} className="text-xs text-[#FCA5A5]">
                La foto <strong>{viewLabel(v)}</strong> no pudo subirse. Volvé a intentar.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {photoConfigs.map(({ view, label, guide }) => {
          const photo = photos[view];
          const hasFailed = failedViews.includes(view);
          return (
            <div
              key={view}
              className={cn(
                "rounded-xl border bg-[#18181B] overflow-hidden",
                hasFailed ? "border-[#EF4444]/40" : "border-[#3F3F46]",
              )}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#3F3F46]">
                <div>
                  <p className="text-sm font-semibold text-[#FAFAFA]">{label}</p>
                  <p className="text-xs text-[#71717A]">{guide}</p>
                </div>
                {photo.preview && !hasFailed && (
                  <CheckCircle className="h-5 w-5 text-[#22C55E]" aria-hidden="true" />
                )}
                {hasFailed && (
                  <AlertCircle className="h-5 w-5 text-[#EF4444]" aria-hidden="true" />
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
          className="flex w-full items-center justify-center rounded-xl bg-brand-primary py-3.5 text-sm font-semibold text-white min-h-[48px] hover:bg-brand-primary-hover disabled:opacity-60 transition-colors"
        >
          {uploading ? "Subiendo fotos..." : failedViews.length > 0 ? "Reintentar" : "Continuar"}
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
