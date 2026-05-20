"use client";

// =============================================================================
// BLACKLINE FITNESS — Import routine from image (OCR)
// Owner: frontend-react + ai-orchestrator.
//
// Flow:
//   1. Trainer uploads an image (photo, screenshot, scan of a routine).
//   2. Gemini extracts the routine structure via OCR.
//   3. Trainer reviews & edits the extracted routine (fully editable).
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
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { extractRoutineFromImage } from "@/lib/ai/ocr-routine";
import type {
  OcrRoutineResult,
  OcrRoutineDay,
  OcrRoutineExercise,
} from "@/lib/ai/ocr-routine";
import { createRoutineFromOcr } from "@/app/actions/routines";
import { hasGeminiKey } from "@/lib/demo/settings-store";
import { PageHeader } from "@/components/shared/page-header";

// ---------------------------------------------------------------------------
// Goal display helpers
// ---------------------------------------------------------------------------

const GOAL_OPTIONS = [
  { value: "HYPERTROPHY", label: "Hipertrofia" },
  { value: "STRENGTH", label: "Fuerza" },
  { value: "ENDURANCE", label: "Resistencia" },
  { value: "FAT_LOSS", label: "Perdida de grasa" },
  { value: "GENERAL", label: "General" },
] as const;

const GOAL_LABELS: Record<string, string> = Object.fromEntries(
  GOAL_OPTIONS.map((g) => [g.value, g.label]),
);

const GOAL_COLORS: Record<string, string> = {
  HYPERTROPHY: "text-brand-primary",
  STRENGTH: "text-[#EF4444]",
  ENDURANCE: "text-brand-primary",
  FAT_LOSS: "text-[#22C55E]",
  GENERAL: "text-[#A1A1AA]",
};

// ---------------------------------------------------------------------------
// Shared input styles
// ---------------------------------------------------------------------------

const miniInputCls =
  "rounded-md border border-[#3F3F46] bg-[#27272A] px-2 py-1 text-xs text-[#FAFAFA] " +
  "focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/30 " +
  "transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const textInputCls =
  "w-full rounded-md border border-[#3F3F46] bg-[#27272A] px-2.5 py-1.5 text-sm text-[#FAFAFA] " +
  "placeholder-[#52525B] " +
  "focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/30 transition-colors";

// ---------------------------------------------------------------------------
// Step type
// ---------------------------------------------------------------------------

type Step = "upload" | "processing" | "preview" | "saving";

// ---------------------------------------------------------------------------
// Deep-clone helper
// ---------------------------------------------------------------------------

function cloneResult(r: OcrRoutineResult): OcrRoutineResult {
  return JSON.parse(JSON.stringify(r));
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ImportarRutinaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  // Editable copy of OCR result — all mutations happen here.
  const [data, setData] = useState<OcrRoutineResult | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  // Track which exercise is in inline-edit mode: "dayIdx-exIdx" or null
  const [editingExKey, setEditingExKey] = useState<string | null>(null);
  // Track which day name is being edited
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);

  const hasKey = hasGeminiKey();

  // ── Computed stats ──────────────────────────────────────────────────────

  const totalExercises = data
    ? data.days.reduce((acc, d) => acc + d.exercises.length, 0)
    : 0;

  // ── File handling ───────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
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

    const routine = cloneResult(extractionResult.value);
    setData(routine);
    setExpandedDays(new Set(routine.days.map((_, i) => i)));
    setStep("preview");
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
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

  // ── Reset ───────────────────────────────────────────────────────────────

  function handleReset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setData(null);
    setExpandedDays(new Set());
    setEditingExKey(null);
    setEditingDayIdx(null);
    setStep("upload");
  }

  // ── Day/exercise expand ─────────────────────────────────────────────────

  function toggleDay(index: number) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  // ── Mutation helpers (immutable updates) ────────────────────────────────

  function updateRoutineField<K extends keyof OcrRoutineResult>(
    field: K,
    value: OcrRoutineResult[K],
  ) {
    setData((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function updateDayName(dayIdx: number, name: string) {
    setData((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d, i) =>
        i === dayIdx ? { ...d, name } : d,
      );
      return { ...prev, days };
    });
  }

  function deleteDay(dayIdx: number) {
    setData((prev) => {
      if (!prev) return prev;
      const days = prev.days.filter((_, i) => i !== dayIdx);
      if (days.length === 0) {
        toast.error("La rutina necesita al menos un dia.");
        return prev;
      }
      return { ...prev, days, splitDays: days.length };
    });
    // Adjust expanded set
    setExpandedDays((prev) => {
      const next = new Set<number>();
      for (const idx of prev) {
        if (idx < dayIdx) next.add(idx);
        else if (idx > dayIdx) next.add(idx - 1);
      }
      return next;
    });
    setEditingDayIdx(null);
  }

  function updateExercise(
    dayIdx: number,
    exIdx: number,
    patch: Partial<OcrRoutineExercise>,
  ) {
    setData((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d, di) => {
        if (di !== dayIdx) return d;
        const exercises = d.exercises.map((ex, ei) =>
          ei === exIdx ? { ...ex, ...patch } : ex,
        );
        return { ...d, exercises };
      });
      return { ...prev, days };
    });
  }

  function deleteExercise(dayIdx: number, exIdx: number) {
    setData((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d, di) => {
        if (di !== dayIdx) return d;
        const exercises = d.exercises.filter((_, ei) => ei !== exIdx);
        return { ...d, exercises };
      });
      // Remove day if empty
      const filtered = days.filter((d) => d.exercises.length > 0);
      if (filtered.length < days.length) {
        toast("Dia sin ejercicios eliminado.");
      }
      return {
        ...prev,
        days: filtered.length > 0 ? filtered : days, // keep at least one day
        splitDays: filtered.length > 0 ? filtered.length : days.length,
      };
    });
    setEditingExKey(null);
  }

  // ── Confirm and create ──────────────────────────────────────────────────

  async function handleConfirm() {
    if (!data) return;

    // Validate before sending
    if (!data.name.trim()) {
      toast.error("El nombre de la rutina no puede estar vacio.");
      return;
    }
    for (let di = 0; di < data.days.length; di++) {
      const day = data.days[di]!;
      if (day.exercises.length === 0) {
        toast.error(`${day.name} no tiene ejercicios.`);
        return;
      }
      for (let ei = 0; ei < day.exercises.length; ei++) {
        const ex = day.exercises[ei]!;
        if (!ex.nameEs.trim()) {
          toast.error(`Ejercicio ${ei + 1} en ${day.name} no tiene nombre.`);
          return;
        }
      }
    }

    setStep("saving");
    setEditingExKey(null);
    setEditingDayIdx(null);

    const createResult = await createRoutineFromOcr({
      name: data.name.trim(),
      goal: data.goal,
      splitDays: data.days.length,
      durationWeeks: data.durationWeeks,
      days: data.days,
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
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div
              className={[
                "h-48 w-48 rounded-full blur-3xl transition-colors duration-300",
                dragOver ? "bg-brand-primary/10" : "bg-brand-primary/5",
              ].join(" ")}
            />
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
              Arrastra una imagen o haz clic para seleccionar. Acepta fotos,
              screenshots, escaneos de rutinas.
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

      {/* ─── STEP: Preview (fully editable) ──────────────────────────── */}
      {(step === "preview" || step === "saving") && data && (
        <div className="space-y-4">
          {/* ── Routine header card (editable) ────────────────────────── */}
          <div className="rounded-2xl border border-[#3F3F46] bg-[#18181B]/80 backdrop-blur-sm p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-start gap-3">
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

              <div className="min-w-0 flex-1 space-y-3">
                {/* Routine name */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => updateRoutineField("name", e.target.value)}
                    maxLength={100}
                    className={textInputCls}
                    placeholder="Nombre de la rutina"
                  />
                </div>

                {/* Goal + Duration row */}
                <div className="flex flex-wrap gap-3">
                  {/* Goal selector */}
                  <div className="flex-1 min-w-[140px]">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                      Objetivo
                    </label>
                    <select
                      value={data.goal}
                      onChange={(e) =>
                        updateRoutineField(
                          "goal",
                          e.target.value as OcrRoutineResult["goal"],
                        )
                      }
                      className={`${textInputCls} cursor-pointer`}
                    >
                      {GOAL_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="w-24">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                      Semanas
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={52}
                      value={data.durationWeeks}
                      onChange={(e) =>
                        updateRoutineField(
                          "durationWeeks",
                          Math.max(1, Math.min(52, Number(e.target.value) || 1)),
                        )
                      }
                      className={textInputCls}
                    />
                  </div>
                </div>

                {/* Stats summary */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={GOAL_COLORS[data.goal] ?? "text-[#A1A1AA]"}>
                    {GOAL_LABELS[data.goal] ?? data.goal}
                  </span>
                  <span className="text-[#3F3F46]">|</span>
                  <span className="text-[#71717A]">
                    {data.days.length} dias/sem
                  </span>
                  <span className="text-[#3F3F46]">|</span>
                  <span className="text-[#71717A]">
                    {totalExercises} ejercicios
                  </span>
                  <div className="ml-auto">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary/10">
                      <Sparkles className="h-3.5 w-3.5 text-brand-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Days accordion (fully editable) ───────────────────────── */}
          <div className="space-y-2">
            {data.days.map((day, dayIdx) => {
              const isExpanded = expandedDays.has(dayIdx);
              const isEditingDay = editingDayIdx === dayIdx;

              return (
                <div
                  key={dayIdx}
                  className="rounded-xl border border-[#3F3F46] bg-[#18181B]/80 overflow-hidden"
                >
                  {/* Day header */}
                  <div className="flex items-center gap-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleDay(dayIdx)}
                      className="flex flex-1 items-center gap-2.5 text-left hover:opacity-80 transition-opacity"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-primary/10 text-xs font-bold text-brand-primary">
                        {dayIdx + 1}
                      </span>

                      {isEditingDay ? (
                        <input
                          type="text"
                          value={day.name}
                          onChange={(e) =>
                            updateDayName(dayIdx, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape")
                              setEditingDayIdx(null);
                          }}
                          onBlur={() => setEditingDayIdx(null)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          maxLength={80}
                          className={`${textInputCls} max-w-[300px]`}
                        />
                      ) : (
                        <span className="text-sm font-medium text-[#FAFAFA] truncate">
                          {day.name}
                        </span>
                      )}

                      <span className="text-xs text-[#52525B] shrink-0">
                        {day.exercises.length} ej.
                      </span>
                    </button>

                    {/* Day actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDayIdx(
                            isEditingDay ? null : dayIdx,
                          );
                        }}
                        className="rounded-md p-1.5 text-[#52525B] hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
                        title="Editar nombre del dia"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {data.days.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDay(dayIdx);
                          }}
                          className="rounded-md p-1.5 text-[#52525B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                          title="Eliminar dia"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleDay(dayIdx)}
                        className="rounded-md p-1.5 text-[#52525B] hover:text-[#FAFAFA] transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Exercises list */}
                  {isExpanded && (
                    <div className="border-t border-[#27272A] divide-y divide-[#27272A]">
                      {day.exercises.map((ex, exIdx) => {
                        const exKey = `${dayIdx}-${exIdx}`;
                        const isEditing = editingExKey === exKey;

                        return (
                          <div key={exIdx} className="group">
                            {/* ── Compact row (read mode) ─────────── */}
                            {!isEditing && (
                              <div className="flex items-center gap-3 px-4 py-2.5">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#27272A] text-xs font-medium text-[#71717A]">
                                  {exIdx + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm text-[#FAFAFA]">
                                    {ex.nameEs}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                    <span className="text-xs text-[#22C55E] font-medium">
                                      {ex.targetSets}x
                                      {ex.targetRepsMin === ex.targetRepsMax
                                        ? ex.targetRepsMin
                                        : `${ex.targetRepsMin}-${ex.targetRepsMax}`}
                                    </span>
                                    <span className="text-xs text-[#52525B]">
                                      {ex.restSeconds}s desc
                                    </span>
                                    {ex.notes && (
                                      <span className="text-xs text-brand-primary/70 italic truncate max-w-[200px]">
                                        {ex.notes}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Edit / Delete buttons */}
                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => setEditingExKey(exKey)}
                                    className="rounded-md p-1.5 text-[#52525B] hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                    title="Editar ejercicio"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteExercise(dayIdx, exIdx)
                                    }
                                    className="rounded-md p-1.5 text-[#52525B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                                    title="Eliminar ejercicio"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* ── Expanded edit form ──────────────── */}
                            {isEditing && (
                              <div className="bg-[#1E1E22] px-4 py-3 space-y-2.5">
                                {/* Exercise name */}
                                <div>
                                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                                    Ejercicio
                                  </label>
                                  <input
                                    type="text"
                                    value={ex.nameEs}
                                    onChange={(e) =>
                                      updateExercise(dayIdx, exIdx, {
                                        nameEs: e.target.value,
                                      })
                                    }
                                    className={textInputCls}
                                    placeholder="Nombre del ejercicio"
                                    autoFocus
                                  />
                                </div>

                                {/* Sets / Reps / Rest row */}
                                <div className="flex flex-wrap gap-3">
                                  <div className="w-16">
                                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                                      Series
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={20}
                                      value={ex.targetSets}
                                      onChange={(e) =>
                                        updateExercise(dayIdx, exIdx, {
                                          targetSets: Math.max(
                                            1,
                                            Math.min(
                                              20,
                                              Number(e.target.value) || 1,
                                            ),
                                          ),
                                        })
                                      }
                                      className={miniInputCls + " w-full text-center"}
                                    />
                                  </div>
                                  <div className="w-16">
                                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                                      Reps min
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={100}
                                      value={ex.targetRepsMin}
                                      onChange={(e) =>
                                        updateExercise(dayIdx, exIdx, {
                                          targetRepsMin: Math.max(
                                            1,
                                            Math.min(
                                              100,
                                              Number(e.target.value) || 1,
                                            ),
                                          ),
                                        })
                                      }
                                      className={miniInputCls + " w-full text-center"}
                                    />
                                  </div>
                                  <div className="w-16">
                                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                                      Reps max
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={100}
                                      value={ex.targetRepsMax}
                                      onChange={(e) =>
                                        updateExercise(dayIdx, exIdx, {
                                          targetRepsMax: Math.max(
                                            1,
                                            Math.min(
                                              100,
                                              Number(e.target.value) || 1,
                                            ),
                                          ),
                                        })
                                      }
                                      className={miniInputCls + " w-full text-center"}
                                    />
                                  </div>
                                  <div className="w-20">
                                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                                      Descanso
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        min={0}
                                        max={600}
                                        value={ex.restSeconds}
                                        onChange={(e) =>
                                          updateExercise(dayIdx, exIdx, {
                                            restSeconds: Math.max(
                                              0,
                                              Math.min(
                                                600,
                                                Number(e.target.value) || 0,
                                              ),
                                            ),
                                          })
                                        }
                                        className={miniInputCls + " w-full text-center pr-5"}
                                      />
                                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[#52525B]">
                                        s
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Notes */}
                                <div>
                                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[#52525B]">
                                    Notas
                                  </label>
                                  <input
                                    type="text"
                                    value={ex.notes ?? ""}
                                    onChange={(e) =>
                                      updateExercise(dayIdx, exIdx, {
                                        notes: e.target.value || null,
                                      })
                                    }
                                    placeholder="Ej: Drop set, tempo 3-1-1, RPE 8..."
                                    maxLength={200}
                                    className={textInputCls}
                                  />
                                </div>

                                {/* Close + Delete row */}
                                <div className="flex items-center justify-between pt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteExercise(dayIdx, exIdx)
                                    }
                                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Eliminar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingExKey(null)}
                                    className="flex items-center gap-1.5 rounded-md bg-brand-primary/10 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-primary/20 transition-colors"
                                  >
                                    <Check className="h-3 w-3" />
                                    Listo
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Action buttons ─────────────────────────────────────────── */}
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

          {/* Hint */}
          <p className="text-center text-xs text-[#52525B]">
            Toca el lapiz en cualquier ejercicio para editarlo antes de crear.
          </p>
        </div>
      )}
    </div>
  );
}
