"use client";

// =============================================================================
// BLACKLINE FITNESS — Import routine from image (OCR)
// Owner: frontend-react + ai-orchestrator.
//
// Flow:
//   1. Trainer uploads an image (photo, screenshot, scan of a routine).
//   2. Gemini extracts the routine structure via OCR.
//   3. Trainer previews the extracted routine (editable name).
//   4. Trainer confirms → server action creates template + days + exercises.
//   5. Redirect to routine detail page for fine-tuning.
// =============================================================================

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  ImagePlus,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { extractRoutineFromImage } from "@/lib/ai/ocr-routine";
import type { OcrRoutineResult } from "@/lib/ai/ocr-routine";
import { createRoutineFromOcr } from "@/app/actions/routines";
import { hasGeminiKey } from "@/lib/demo/settings-store";
import { PageHeader } from "@/components/shared/page-header";

// ---------------------------------------------------------------------------
// Goal display helpers
// ---------------------------------------------------------------------------

const GOAL_LABELS: Record<string, string> = {
  HYPERTROPHY: "Hipertrofia",
  STRENGTH: "Fuerza",
  ENDURANCE: "Resistencia",
  FAT_LOSS: "Perdida de grasa",
  GENERAL: "General",
};

const GOAL_COLORS: Record<string, string> = {
  HYPERTROPHY: "text-brand-primary",
  STRENGTH: "text-[#EF4444]",
  ENDURANCE: "text-brand-primary",
  FAT_LOSS: "text-[#22C55E]",
  GENERAL: "text-[#A1A1AA]",
};

// ---------------------------------------------------------------------------
// Step type
// ---------------------------------------------------------------------------

type Step = "upload" | "processing" | "preview" | "saving";

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ImportarRutinaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OcrRoutineResult | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [dragOver, setDragOver] = useState(false);

  // ── Gemini key check ────────────────────────────────────────────────────

  const hasKey = hasGeminiKey();

  // ── File handling ───────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    // Show image preview
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStep("processing");

    const extractionResult = await extractRoutineFromImage(file);

    if (!extractionResult.ok) {
      toast.error(extractionResult.error.message);
      setStep("upload");
      URL.revokeObjectURL(url);
      setPreview(null);
      return;
    }

    const routine = extractionResult.value;
    setResult(routine);
    setEditedName(routine.name);
    // Expand all days by default
    setExpandedDays(new Set(routine.days.map((_, i) => i)));
    setStep("preview");
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so the same file can be re-uploaded
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    } else {
      toast.error("Solo se aceptan imagenes (JPG, PNG, WebP, HEIC).");
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  // ── Reset flow ──────────────────────────────────────────────────────────

  function handleReset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setResult(null);
    setEditedName("");
    setEditingName(false);
    setExpandedDays(new Set());
    setStep("upload");
  }

  // ── Expand/collapse days ────────────────────────────────────────────────

  function toggleDay(index: number) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  // ── Confirm and create ──────────────────────────────────────────────────

  async function handleConfirm() {
    if (!result) return;

    setStep("saving");
    const finalName = editedName.trim() || result.name;

    const createResult = await createRoutineFromOcr({
      name: finalName,
      goal: result.goal,
      splitDays: result.splitDays,
      durationWeeks: result.durationWeeks,
      days: result.days,
    });

    if (createResult.ok) {
      toast.success("Rutina importada exitosamente.");
      router.push(`/trainer/rutinas/${createResult.value.routineId}`);
    } else {
      toast.error(createResult.error.message);
      setStep("preview");
    }
  }

  // ── No API key guard ────────────────────────────────────────────────────

  if (!hasKey) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Importar rutina"
          description="Subi una foto o screenshot para crear la rutina automaticamente."
        />
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-[#3F3F46] bg-[#18181B]/80 px-8 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#3F3F46] bg-[#27272A]">
            <Sparkles className="h-7 w-7 text-[#52525B]" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#FAFAFA]">
              Configura tu API key de Gemini
            </h3>
            <p className="mt-1 max-w-sm text-sm text-[#A1A1AA]">
              Para usar el reconocimiento de imagenes, necesitas configurar tu
              clave de API de Google Gemini en Ajustes.
            </p>
          </div>
          <Link
            href="/trainer/ajustes"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover transition-colors"
          >
            Ir a Ajustes
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Importar rutina"
        description="Subi una foto o screenshot de una rutina y la IA la convierte en plantilla."
        actions={
          <Link
            href="/trainer/rutinas"
            className="flex items-center gap-2 rounded-lg border border-[#3F3F46] bg-[#27272A] px-4 py-2 text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#52525B] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        }
      />

      {/* ─── STEP: Upload ────────────────────────────────────────────── */}
      {step === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={[
            "relative flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed cursor-pointer",
            "bg-[#18181B]/80 backdrop-blur-sm px-8 py-20 text-center overflow-hidden",
            "transition-all duration-200",
            dragOver
              ? "border-brand-primary bg-brand-primary/5 scale-[1.01]"
              : "border-[#3F3F46] hover:border-[#52525B] hover:bg-[#27272A]/40",
          ].join(" ")}
        >
          {/* Radial glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className={[
              "h-48 w-48 rounded-full blur-3xl transition-colors duration-300",
              dragOver ? "bg-brand-primary/10" : "bg-brand-primary/5",
            ].join(" ")} />
          </div>

          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#3F3F46] bg-[#27272A] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            {dragOver ? (
              <Upload className="h-9 w-9 text-brand-primary" strokeWidth={1.5} />
            ) : (
              <ImagePlus className="h-9 w-9 text-[#52525B]" strokeWidth={1.5} />
            )}
          </div>

          <div className="relative flex flex-col gap-1">
            <h3 className="text-base font-semibold text-[#FAFAFA]">
              {dragOver ? "Soltar imagen" : "Subir imagen de rutina"}
            </h3>
            <p className="max-w-xs text-sm text-[#A1A1AA] text-balance">
              Arrastra una imagen o haz clic para seleccionar. Acepta fotos, screenshots, escaneos de rutinas.
            </p>
          </div>

          <div className="relative flex items-center gap-3 text-xs text-[#52525B]">
            <Camera className="h-3.5 w-3.5" />
            <span>JPG, PNG, WebP, HEIC</span>
            <span className="text-[#3F3F46]">|</span>
            <span>Max 10MB</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Seleccionar imagen de rutina"
          />
        </div>
      )}

      {/* ─── STEP: Processing ────────────────────────────────────────── */}
      {step === "processing" && (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-[#3F3F46] bg-[#18181B]/80 px-8 py-16 text-center">
          {/* Image preview thumbnail */}
          {preview && (
            <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-[#3F3F46]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Imagen subida"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-[#FAFAFA]">
              Analizando rutina...
            </h3>
            <p className="text-sm text-[#A1A1AA]">
              La IA esta leyendo la imagen. Esto puede tardar unos segundos.
            </p>
          </div>
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:0ms]" />
            <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:150ms]" />
            <span className="h-2 w-2 rounded-full bg-brand-primary animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}

      {/* ─── STEP: Preview ───────────────────────────────────────────── */}
      {(step === "preview" || step === "saving") && result && (
        <div className="space-y-4">
          {/* Routine header card */}
          <div className="rounded-2xl border border-[#3F3F46] bg-[#18181B]/80 backdrop-blur-sm p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* Thumbnail */}
                {preview && (
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#3F3F46]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Imagen original"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {/* Editable name */}
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingName(false);
                          if (e.key === "Escape") {
                            setEditedName(result.name);
                            setEditingName(false);
                          }
                        }}
                        autoFocus
                        maxLength={100}
                        className="w-full rounded-md border border-brand-primary/50 bg-[#27272A] px-2 py-1 text-sm font-semibold text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingName(false)}
                        className="rounded-md p-1 text-[#22C55E] hover:bg-[#22C55E]/10"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      className="group flex items-center gap-1.5 text-left"
                    >
                      <h3 className="truncate text-base font-semibold text-[#FAFAFA] group-hover:text-brand-primary transition-colors">
                        {editedName || result.name}
                      </h3>
                      <Pencil className="h-3 w-3 shrink-0 text-[#52525B] group-hover:text-brand-primary transition-colors" />
                    </button>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={GOAL_COLORS[result.goal] ?? "text-[#A1A1AA]"}>
                      {GOAL_LABELS[result.goal] ?? result.goal}
                    </span>
                    <span className="text-[#3F3F46]">|</span>
                    <span className="text-[#71717A]">{result.splitDays} dias/sem</span>
                    <span className="text-[#3F3F46]">|</span>
                    <span className="text-[#71717A]">{result.durationWeeks} semanas</span>
                    <span className="text-[#3F3F46]">|</span>
                    <span className="text-[#71717A]">
                      {result.days.reduce((acc, d) => acc + d.exercises.length, 0)} ejercicios
                    </span>
                  </div>
                </div>
              </div>

              {/* Sparkle badge */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10">
                <Sparkles className="h-4 w-4 text-brand-primary" />
              </div>
            </div>
          </div>

          {/* Days accordion */}
          <div className="space-y-2">
            {result.days.map((day, dayIndex) => {
              const isExpanded = expandedDays.has(dayIndex);
              return (
                <div
                  key={dayIndex}
                  className="rounded-xl border border-[#3F3F46] bg-[#18181B]/80 overflow-hidden"
                >
                  {/* Day header — clickable */}
                  <button
                    type="button"
                    onClick={() => toggleDay(dayIndex)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#27272A]/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-primary/10 text-xs font-bold text-brand-primary">
                        {dayIndex + 1}
                      </span>
                      <span className="text-sm font-medium text-[#FAFAFA]">
                        {day.name}
                      </span>
                      <span className="text-xs text-[#52525B]">
                        {day.exercises.length} ejercicio{day.exercises.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-[#52525B]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#52525B]" />
                    )}
                  </button>

                  {/* Exercises list */}
                  {isExpanded && (
                    <div className="border-t border-[#27272A] divide-y divide-[#27272A]">
                      {day.exercises.map((ex, exIndex) => (
                        <div
                          key={exIndex}
                          className="flex items-center gap-3 px-4 py-2.5"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#27272A] text-xs font-medium text-[#71717A]">
                            {exIndex + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-[#FAFAFA]">
                              {ex.nameEs}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              <span className="text-xs text-[#71717A]">
                                {ex.targetSets}x{ex.targetRepsMin === ex.targetRepsMax
                                  ? ex.targetRepsMin
                                  : `${ex.targetRepsMin}-${ex.targetRepsMax}`}
                              </span>
                              <span className="text-xs text-[#52525B]">
                                {ex.restSeconds}s desc
                              </span>
                              {ex.notes && (
                                <span className="text-xs text-brand-primary/70 italic truncate max-w-[180px]">
                                  {ex.notes}
                                </span>
                              )}
                            </div>
                          </div>
                          <Dumbbell className="h-3.5 w-3.5 shrink-0 text-[#3F3F46]" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={step === "saving"}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#3F3F46] bg-[#27272A] py-3.5 text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#52525B] transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reintentar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={step === "saving"}
              className={[
                "flex flex-[2] items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white",
                "min-h-[48px] transition-all duration-200",
                "bg-gradient-to-r from-brand-primary to-brand-primary-hover",
                "shadow-[0_0_20px_rgba(255,106,26,0.30)]",
                "hover:shadow-[0_0_28px_rgba(255,106,26,0.45)] hover:brightness-110",
                "active:scale-[0.98]",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none",
              ].join(" ")}
            >
              {step === "saving" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando rutina...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Crear rutina
                </>
              )}
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-[#52525B]">
            Despues de crear, podras ajustar los ejercicios, series y repeticiones desde el editor.
          </p>
        </div>
      )}
    </div>
  );
}
