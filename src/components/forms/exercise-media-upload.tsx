"use client";

// =============================================================================
// FORJA — ExerciseMediaUpload
// Owner: frontend-react.
//
// Drag-and-drop thumbnail uploader for exercises.
// Sends FormData to uploadExerciseThumbnail server action; shows preview while
// uploading. Notifies parent via onUploaded / onDeleted callbacks.
//
// Example usage in exercise-form.tsx:
// <ExerciseMediaUpload
//   exerciseId={exercise?.id ?? null}
//   initialThumbnailUrl={exercise?.thumbnailUrl ?? null}
//   onUploaded={(url) => setValue("thumbnailUrl", url)}
//   onDeleted={() => setValue("thumbnailUrl", null)}
// />
//
// New exercise flow (exerciseId === null):
//   - Upload still works; the action returns { url, key } without persisting.
//   - Parent receives the URL via onUploaded and must persist it when the
//     Exercise record is created.
//
// Edit exercise flow (exerciseId === string):
//   - Action verifies ownership and persists the URL on the Exercise record.
//   - Old thumbnail is deleted from storage (best effort).
// =============================================================================

import * as React from "react";
import { Image, Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  deleteExerciseThumbnail,
  uploadExerciseThumbnail,
} from "@/app/actions/exercise-media";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ExerciseMediaUploadProps {
  /** null when creating a new exercise (no DB record yet). */
  exerciseId: string | null;
  /** Current thumbnail URL (if any). */
  initialThumbnailUrl: string | null;
  /** Called when upload succeeds with the new URL. */
  onUploaded: (url: string) => void;
  /** Called when delete succeeds. */
  onDeleted?: () => void;
  className?: string;
}

type Phase =
  | { name: "idle" }
  | { name: "preview"; previewUrl: string }
  | { name: "uploading"; previewUrl: string }
  | { name: "filled"; thumbnailUrl: string }
  | { name: "error"; message: string; previousThumbnailUrl: string | null };

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — mirrors server-side guard

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ExerciseMediaUpload({
  exerciseId,
  initialThumbnailUrl,
  onUploaded,
  onDeleted,
  className,
}: ExerciseMediaUploadProps) {
  const [phase, setPhase] = React.useState<Phase>(
    initialThumbnailUrl
      ? { name: "filled", thumbnailUrl: initialThumbnailUrl }
      : { name: "idle" },
  );
  const [isDragging, setIsDragging] = React.useState(false);
  const [showOverlay, setShowOverlay] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragCounterRef = React.useRef(0); // track nested drag events reliably

  // Revoke object URL when phase leaves preview/uploading
  const prevPhaseRef = React.useRef<Phase>(phase);
  React.useEffect(() => {
    const prev = prevPhaseRef.current;
    if (
      (prev.name === "preview" || prev.name === "uploading") &&
      phase.name !== "preview" &&
      phase.name !== "uploading"
    ) {
      URL.revokeObjectURL(prev.previewUrl);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      const p = prevPhaseRef.current;
      if (p.name === "preview" || p.name === "uploading") {
        URL.revokeObjectURL(p.previewUrl);
      }
    };
  }, []);

  // ── File handling ─────────────────────────────────────────────────────────

  function validateFile(file: File): string | null {
    if (!file.type.startsWith("image/")) {
      return "Solo se aceptan imágenes (JPG, PNG, WEBP, GIF).";
    }
    if (file.size > MAX_BYTES) {
      return "La imagen supera el límite de 5 MB.";
    }
    return null;
  }

  async function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPhase({ name: "uploading", previewUrl });
    setShowOverlay(false);

    const formData = new FormData();
    formData.append("file", file);
    if (exerciseId) {
      formData.append("exerciseId", exerciseId);
    }

    const result = await uploadExerciseThumbnail(formData);

    if (!result.ok) {
      const previousThumbnailUrl =
        initialThumbnailUrl ??
        (phase.name === "filled" ? phase.thumbnailUrl : null);
      setPhase({ name: "error", message: result.error.message, previousThumbnailUrl });
      toast.error(result.error.message);
      return;
    }

    const { url } = result.value;
    setPhase({ name: "filled", thumbnailUrl: url });
    onUploaded(url);
    toast.success("Imagen subida correctamente.");
  }

  // ── Drag events ───────────────────────────────────────────────────────────

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); // required to allow drop
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  // ── Input change ──────────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Reset so selecting the same file again triggers onChange
    e.target.value = "";
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!exerciseId) {
      // New exercise: simply clear local state — nothing persisted yet
      setPhase({ name: "idle" });
      onDeleted?.();
      setPendingDelete(false);
      setShowOverlay(false);
      return;
    }

    setPendingDelete(true);
    const result = await deleteExerciseThumbnail(exerciseId);
    setPendingDelete(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    setPhase({ name: "idle" });
    setShowOverlay(false);
    onDeleted?.();
    toast.success("Imagen eliminada.");
  }

  // ── Retry from error ──────────────────────────────────────────────────────

  function handleRetry() {
    const prev =
      phase.name === "error" ? phase.previousThumbnailUrl : null;
    if (prev) {
      setPhase({ name: "filled", thumbnailUrl: prev });
    } else {
      setPhase({ name: "idle" });
    }
  }

  // ── Keyboard accessibility for drop zone ─────────────────────────────────

  function handleDropZoneKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  const isUploading = phase.name === "uploading";
  const isBusy = isUploading || pendingDelete;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        disabled={isBusy}
        onChange={handleInputChange}
      />

      {/* ── Empty / Drag state ───────────────────────────────────────────── */}
      {(phase.name === "idle" || phase.name === "error") && (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Arrastrá una imagen o hacé clic para subir el thumbnail del ejercicio"
            aria-disabled={isBusy}
            onClick={() => !isBusy && inputRef.current?.click()}
            onKeyDown={handleDropZoneKeyDown}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              "flex min-h-[180px] cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all duration-150",
              "focus-visible:outline-2 focus-visible:outline-[#FF6A1A] focus-visible:outline-offset-2",
              isDragging
                ? "border-[#FF6A1A] bg-[#FF6A1A]/5"
                : "border-[#3F3F46] bg-[#18181B] hover:border-[#FF6A1A]",
              isBusy && "pointer-events-none opacity-50",
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#27272A]">
              {isDragging ? (
                <Upload className="h-6 w-6 text-[#FF6A1A]" aria-hidden="true" />
              ) : (
                <Image className="h-6 w-6 text-[#71717A]" aria-hidden="true" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#FAFAFA]">
                {isDragging
                  ? "Soltá la imagen acá"
                  : "Arrastrá una imagen o hacé clic"}
              </p>
              <p className="mt-1 text-xs text-[#71717A]">
                Máximo 5 MB · JPG, PNG, WEBP, GIF
              </p>
            </div>
          </div>

          {/* Error message */}
          {phase.name === "error" && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)] px-4 py-3"
            >
              <p className="text-sm text-[#EF4444]">{phase.message}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="shrink-0 text-xs font-semibold text-[#EF4444] underline underline-offset-2 hover:text-[#FCA5A5] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF6A1A]"
              >
                Reintentar
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Preview while uploading ──────────────────────────────────────── */}
      {(phase.name === "uploading" || phase.name === "preview") && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#3F3F46] bg-[#09090B]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={phase.previewUrl}
            alt="Vista previa de la imagen a subir"
            className="h-full w-full object-cover"
          />
          {phase.name === "uploading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[rgba(9,9,11,0.65)]">
              <Loader2
                className="h-8 w-8 animate-spin text-[#FF6A1A]"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-[#FAFAFA]">
                Subiendo imagen...
              </span>
              <span className="sr-only">Subiendo imagen, aguardá.</span>
            </div>
          )}
        </div>
      )}

      {/* ── Filled: image with hover overlay ────────────────────────────── */}
      {phase.name === "filled" && (
        <div
          className="group relative aspect-video w-full overflow-hidden rounded-xl border border-[#3F3F46] bg-[#09090B]"
          onMouseEnter={() => setShowOverlay(true)}
          onMouseLeave={() => setShowOverlay(false)}
          onFocus={() => setShowOverlay(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setShowOverlay(false);
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={phase.thumbnailUrl}
            alt="Thumbnail del ejercicio"
            className="h-full w-full object-cover"
          />

          {/* Gradient overlay — always rendered, opacity driven by showOverlay */}
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-[#09090B]/80 via-transparent to-transparent transition-opacity duration-150",
              showOverlay || isBusy ? "opacity-100" : "opacity-0",
            )}
          />

          {/* Action buttons */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 flex items-center justify-end gap-2 px-3 pb-3 pt-6 transition-opacity duration-150",
              showOverlay ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            {/* Replace */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#3F3F46] bg-[#18181B]/90 px-3 py-1.5 text-xs font-semibold text-[#FAFAFA] backdrop-blur-sm transition-colors",
                "hover:border-[#FF6A1A] hover:text-[#FF6A1A]",
                "focus-visible:outline-2 focus-visible:outline-[#FF6A1A] focus-visible:outline-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              aria-label="Cambiar imagen del ejercicio"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Cambiar
            </button>

            {/* Delete — shows confirmation inline */}
            {!pendingDelete ? (
              <button
                type="button"
                onClick={() => setPendingDelete(true)}
                className={cn(
                  "inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.1)] px-3 py-1.5 text-xs font-semibold text-[#EF4444] backdrop-blur-sm transition-colors",
                  "hover:bg-[rgba(239,68,68,0.2)]",
                  "focus-visible:outline-2 focus-visible:outline-[#FF6A1A] focus-visible:outline-offset-2",
                )}
                aria-label="Eliminar imagen del ejercicio"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Eliminar
              </button>
            ) : (
              /* Confirm / Cancel delete */
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleDelete()}
                  className={cn(
                    "inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-[#EF4444] px-3 py-1.5 text-xs font-semibold text-white transition-colors",
                    "hover:bg-[#DC2626]",
                    "focus-visible:outline-2 focus-visible:outline-[#FF6A1A] focus-visible:outline-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                  aria-label="Confirmar eliminación de imagen"
                >
                  {isBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Confirmar
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setPendingDelete(false)}
                  className={cn(
                    "inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#3F3F46] bg-[#18181B]/90 px-2 py-1.5 text-xs font-semibold text-[#A1A1AA] backdrop-blur-sm transition-colors",
                    "hover:text-[#FAFAFA]",
                    "focus-visible:outline-2 focus-visible:outline-[#FF6A1A] focus-visible:outline-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                  aria-label="Cancelar eliminación"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
