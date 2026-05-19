"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, CheckCircle, SkipForward } from "lucide-react";
import { toast } from "sonner";

interface OcrResult {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  confidence: number;
}

export default function CedulaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [edited, setEdited] = useState<Partial<OcrResult>>({});

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen.");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    void uploadAndOcr(file);
  }

  async function uploadAndOcr(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/ocr/cedula", {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!res.ok) {
      toast.error("No se pudo leer la cédula. Podés ingresar los datos manualmente.");
      return;
    }

    const data = (await res.json()) as { extracted: OcrResult };
    setOcrResult(data.extracted);
    setEdited({});
  }

  const displayedResult = ocrResult ? { ...ocrResult, ...edited } : null;

  function handleSkip() {
    router.push("/onboarding/cliente/parq");
  }

  function handleContinue() {
    router.push("/onboarding/cliente/parq");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Tu cédula</h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Subí una foto de tu cédula. La leemos automáticamente para ahorrarte
          tipeo. Esta foto no se almacena permanentemente.
        </p>
      </div>

      {/* Upload area */}
      {!preview ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#3F3F46] bg-[#18181B] p-8 hover:border-[#3B82F6] hover:bg-[#3B82F6]/5 transition-colors"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#27272A]">
              <Upload className="h-7 w-7 text-[#A1A1AA]" aria-hidden="true" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#FAFAFA]">
                Seleccioná o tomá una foto
              </p>
              <p className="text-xs text-[#71717A] mt-1">JPG, PNG — max 10MB</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Seleccionar foto de cédula"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative overflow-hidden rounded-xl border border-[#3F3F46]">
            <img
              src={preview}
              alt="Vista previa de cédula"
              className="w-full object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center text-white">
                  <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <p className="text-sm">Leyendo cédula...</p>
                </div>
              </div>
            )}
            {!uploading && (
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setOcrResult(null);
                }}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white hover:bg-black/80"
              >
                Cambiar
              </button>
            )}
          </div>

          {/* OCR result editable */}
          {displayedResult && (
            <div className="space-y-3 rounded-xl border border-[#22C55E]/30 bg-[#052E16] p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#22C55E]" aria-hidden="true" />
                <p className="text-sm font-medium text-[#22C55E]">
                  Datos leídos. Revisalos y corregí si algo está mal.
                </p>
              </div>
              {[
                { key: "firstName" as const, label: "Nombre" },
                { key: "lastName" as const, label: "Apellidos" },
                { key: "dateOfBirth" as const, label: "Fecha de nacimiento" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <label
                    htmlFor={`ocr-${key}`}
                    className="block text-xs font-medium text-[#A1A1AA]"
                  >
                    {label}
                  </label>
                  <input
                    id={`ocr-${key}`}
                    type={key === "dateOfBirth" ? "date" : "text"}
                    value={
                      (edited[key] ?? displayedResult[key] ?? "") as string
                    }
                    onChange={(e) =>
                      setEdited((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] focus-visible:border-[#3B82F6] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {displayedResult && (
          <button
            type="button"
            onClick={handleContinue}
            className="flex w-full items-center justify-center rounded-xl bg-[#3B82F6] py-3.5 text-sm font-semibold text-white min-h-[48px] hover:bg-[#2563EB] transition-colors"
          >
            Continuar
          </button>
        )}
        <button
          type="button"
          onClick={handleSkip}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#3F3F46] py-3.5 text-sm font-medium text-[#A1A1AA] min-h-[48px] hover:bg-[#18181B] transition-colors"
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
          Saltear por ahora
        </button>
      </div>
    </div>
  );
}
