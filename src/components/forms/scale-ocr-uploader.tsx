"use client";

// =============================================================================
// FORJA — ScaleOcrUploader
// Owner: frontend-react.
// Drop zone para foto de báscula, OCR via /api/ocr/bascula, campos editables.
// =============================================================================

import * as React from "react";
import { Upload, AlertTriangle, CheckCircle, Loader2, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ScaleData } from "@/types/profile";
import { hasGeminiKey } from "@/lib/demo/settings-store";
import { extractScaleBrowser } from "@/lib/demo/ocr-scale-browser";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ScaleOcrUploaderProps {
  onExtracted: (data: ScaleData) => void;
  onError?: (message: string) => void;
  className?: string;
}

type UploaderState =
  | { phase: "idle" }
  | { phase: "preview"; file: File; objectUrl: string }
  | { phase: "processing"; file: File; objectUrl: string }
  | {
      phase: "extracted";
      file: File;
      objectUrl: string;
      data: ScaleData;
      confidence: number;
    }
  | { phase: "error"; message: string; file?: File; objectUrl?: string };

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ScaleOcrUploader({
  onExtracted,
  onError,
  className,
}: ScaleOcrUploaderProps) {
  const [state, setState] = React.useState<UploaderState>({ phase: "idle" });
  const [editableData, setEditableData] = React.useState<Partial<ScaleData>>({});
  const inputRef = React.useRef<HTMLInputElement>(null);
  const liveRegionRef = React.useRef<HTMLParagraphElement>(null);
  const isDraggingOver = React.useRef(false);
  const [dragging, setDragging] = React.useState(false);

  // Limpieza de object URLs
  React.useEffect(() => {
    return () => {
      if (
        state.phase === "preview" ||
        state.phase === "processing" ||
        state.phase === "extracted" ||
        (state.phase === "error" && state.objectUrl)
      ) {
        URL.revokeObjectURL(
          (
            state as {
              objectUrl?: string;
            }
          ).objectUrl ?? "",
        );
      }
    };
  }, [state]);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setState({ phase: "error", message: "Solo se aceptan imágenes (JPG, PNG, WEBP)." });
      onError?.("Solo se aceptan imágenes (JPG, PNG, WEBP).");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setState({ phase: "preview", file, objectUrl });
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `Imagen seleccionada: ${file.name}`;
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    isDraggingOver.current = false;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isDraggingOver.current) {
      isDraggingOver.current = true;
      setDragging(true);
    }
  }

  function handleDragLeave() {
    isDraggingOver.current = false;
    setDragging(false);
  }

  async function handleDetect() {
    if (state.phase !== "preview") return;
    const { file, objectUrl } = state;
    setState({ phase: "processing", file, objectUrl });

    try {
      const { data, confidence } = await extractScaleBrowser(file);

      setEditableData(data);
      setState({ phase: "extracted", file, objectUrl, data, confidence });

      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Datos detectados. Confianza: ${Math.round(confidence * 100)}%.`;
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "No se pudieron detectar los datos.";
      setState({ phase: "error", message: msg, file, objectUrl });
      onError?.(msg);
    }
  }

  function handleReset() {
    setEditableData({});
    setState({ phase: "idle" });
  }

  function handleConfirm() {
    const data: ScaleData = {
      ...(state.phase === "extracted" ? state.data : {}),
      ...editableData,
    };
    onExtracted(data);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const previewUrl =
    state.phase === "preview" ||
    state.phase === "processing" ||
    state.phase === "extracted" ||
    (state.phase === "error" && state.objectUrl)
      ? (state as { objectUrl?: string }).objectUrl
      : null;

  // Re-evaluate key presence on every render so adding the key mid-session works.
  const geminiReady = hasGeminiKey();

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Aria live region */}
      <p
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* No Gemini key — guide user to settings */}
      {!geminiReady && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.08)] px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-sm text-[#F59E0B]">
              Ingresá tu API key de Gemini en Ajustes para habilitar OCR.
            </p>
            <Link
              href="/trainer/ajustes"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#F59E0B] underline underline-offset-2 hover:text-[#FBBF24]"
            >
              <Settings className="h-3 w-3" aria-hidden="true" />
              Ir a Ajustes
            </Link>
          </div>
        </div>
      )}

      {/* Drop zone o preview */}
      {!previewUrl ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Arrastrá una imagen o tocá para subirla"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={cn(
            "flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-6 transition-all duration-150",
            "focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2",
            dragging
              ? "border-[#3B82F6] bg-[#27272A]"
              : "border-[#3F3F46] bg-[#18181B] hover:border-[#3B82F6] hover:bg-[#27272A]",
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#27272A]">
            <Upload className="h-6 w-6 text-[#71717A]" aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[#FAFAFA]">
              Arrastrá la foto de la báscula o tocá para abrirla
            </p>
            <p className="mt-1 text-xs text-[#71717A]">JPG, PNG, WEBP — máx. 10 MB</p>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-[#3F3F46]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Vista previa de la foto de báscula"
            className="max-h-[220px] w-full object-contain bg-[#09090B]"
          />
          {state.phase === "processing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(9,9,11,0.7)]">
              <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" aria-hidden="true" />
              <span className="sr-only">Procesando imagen...</span>
            </div>
          )}
        </div>
      )}

      {/* Input file oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {/* Botones según phase */}
      {state.phase === "preview" && (
        <div className="flex gap-2">
          {geminiReady && (
            <button
              type="button"
              onClick={handleDetect}
              className="flex-1 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-[#09090B] transition-colors hover:bg-[#2563EB] focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2"
            >
              Detectar datos
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#3F3F46] px-4 py-3 text-sm font-semibold text-[#FAFAFA] transition-colors hover:bg-[#27272A] focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2"
          >
            Cambiar foto
          </button>
        </div>
      )}

      {/* Campos extraídos + editables */}
      {(state.phase === "extracted" || state.phase === "error") && previewUrl && (
        <ExtractedFields
          data={editableData}
          confidence={state.phase === "extracted" ? state.confidence : undefined}
          onChange={setEditableData}
        />
      )}

      {/* Error */}
      {state.phase === "error" && state.message && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)] px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" aria-hidden="true" />
          <p className="text-sm text-[#EF4444]">{state.message}</p>
        </div>
      )}

      {/* Botón confirmar */}
      {state.phase === "extracted" && (
        <button
          type="button"
          onClick={handleConfirm}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-[#09090B] transition-colors hover:bg-[#2563EB] focus-visible:outline-2 focus-visible:outline-[#3B82F6] focus-visible:outline-offset-2"
        >
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          Confirmar y guardar
        </button>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-componente: campos extraídos editables
// -----------------------------------------------------------------------------

interface ExtractedFieldsProps {
  data: Partial<ScaleData>;
  confidence?: number;
  onChange: (data: Partial<ScaleData>) => void;
}

const EDITABLE_KEYS: (keyof ScaleData)[] = [
  "weightKg",
  "bodyFatPct",
  "muscleMassKg",
  "visceralFat",
  "basalMetabolicRate",
];

function ExtractedFields({ data, confidence, onChange }: ExtractedFieldsProps) {
  function handleChange(key: keyof ScaleData, raw: string) {
    const num = parseFloat(raw);
    onChange({
      ...data,
      [key]: raw === "" ? undefined : isNaN(num) ? undefined : num,
    });
  }

  return (
    <div className="space-y-3">
      {confidence !== undefined && (
        <div className="flex items-center justify-between text-xs text-[#71717A]">
          <span>Confianza del OCR</span>
          <span
            className={cn(
              "font-semibold",
              confidence >= 0.8
                ? "text-[#22C55E]"
                : confidence >= 0.6
                  ? "text-[#F59E0B]"
                  : "text-[#EF4444]",
            )}
          >
            {Math.round(confidence * 100)}%
          </span>
        </div>
      )}

      {confidence !== undefined && confidence < 0.6 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.08)] px-3 py-2"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F59E0B]" aria-hidden="true" />
          <p className="text-xs text-[#F59E0B]">
            Confianza baja. Revisá los datos antes de guardar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {EDITABLE_KEYS.map((key) => {
          const fieldId = `scale-field-${key}`;
          return (
            <div key={key} className="flex flex-col gap-1">
              <label
                htmlFor={fieldId}
                className="text-xs font-medium text-[#A1A1AA]"
              >
                {readableFieldName(key)}
              </label>
              <input
                id={fieldId}
                type="number"
                step="0.1"
                value={data[key] ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
                className="min-h-[44px] rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                aria-label={readableFieldName(key)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function readableFieldName(key: keyof ScaleData): string {
  const MAP: Record<keyof ScaleData, string> = {
    weightKg: "Peso (kg)",
    bodyFatPct: "% Grasa",
    muscleMassKg: "Masa muscular (kg)",
    visceralFat: "Grasa visceral",
    basalMetabolicRate: "Metabolismo basal (kcal)",
    confidence: "Confianza",
  };
  return MAP[key] ?? key;
}
