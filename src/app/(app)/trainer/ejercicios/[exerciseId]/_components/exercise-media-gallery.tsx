"use client";

// =============================================================================
// BLACKLINE FITNESS — ExerciseMediaGallery
//
// Single "Video del ejercicio" panel. The coach pastes a YouTube / Vimeo /
// Google Drive URL and it is persisted via `setExerciseTrainerMedia` (which
// stores a per-trainer override for public/foreign exercises, or writes to
// Exercise.mediaUrl when the trainer owns a private one).
//
// The same URL is what the exercise list cards use as the cover thumbnail
// (derived via lh3 for Drive, img.youtube.com for YouTube).
// =============================================================================

import * as React from "react";
import { Loader2, PlayCircle, Pencil, Trash2, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { setExerciseTrainerMedia } from "@/app/actions/exercises";
import {
  getVideoLoopEmbed,
  isSupportedVideoUrl,
} from "@/lib/media/video-url";
import { LoopMediaFrame } from "@/components/shared/loop-media-frame";

export interface ExerciseMediaGalleryProps {
  exerciseId: string;
  /** Effective mediaUrl already merged with per-trainer override. */
  mediaUrl: string | null;
  /** Only trainers can paste/clear the video. */
  canEdit?: boolean;
  /** Notify parent of the new mediaUrl so it can update local state. */
  onMediaChanged?: (newMediaUrl: string | null) => void;
}

export function ExerciseMediaGallery({
  exerciseId,
  mediaUrl,
  canEdit = false,
  onMediaChanged,
}: ExerciseMediaGalleryProps) {
  const [url, setUrl] = React.useState<string>(mediaUrl ?? "");
  const [editing, setEditing] = React.useState<boolean>(false);
  const [saving, setSaving] = React.useState<boolean>(false);

  // Sync local input when the parent's mediaUrl changes (e.g., navigating).
  React.useEffect(() => {
    setUrl(mediaUrl ?? "");
    setEditing(false);
  }, [mediaUrl]);

  const trimmed = url.trim();
  const supportedDraft = isSupportedVideoUrl(trimmed);
  const draftLoopEmbed = getVideoLoopEmbed(trimmed);
  const savedLoopEmbed = getVideoLoopEmbed(mediaUrl);

  async function save() {
    if (saving) return;
    setSaving(true);
    const result = await setExerciseTrainerMedia({
      exerciseId,
      mediaUrl: trimmed === "" ? null : trimmed,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error.message ?? "No se pudo guardar el video.");
      return;
    }
    onMediaChanged?.(result.value.mediaUrl);
    setEditing(false);
    toast.success(result.value.mediaUrl ? "Video guardado." : "Video eliminado.");
  }

  async function clearVideo() {
    if (saving) return;
    setSaving(true);
    const result = await setExerciseTrainerMedia({ exerciseId, mediaUrl: null });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error.message ?? "No se pudo eliminar el video.");
      return;
    }
    setUrl("");
    onMediaChanged?.(null);
    setEditing(false);
    toast.success("Video eliminado.");
  }

  // ── View mode: there is a saved URL and we're not editing ────────────────
  if (mediaUrl && !editing) {
    return (
      <div className="flex flex-col gap-3">
        {savedLoopEmbed ? (
          <LoopMediaFrame
            embed={savedLoopEmbed}
            title="Video del ejercicio"
            maxAspectRatio={9 / 16}
          />
        ) : (
          <ExternalLinkCard url={mediaUrl} />
        )}

        {canEdit && (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#3F3F46] bg-[#18181B] px-3 py-1.5 text-xs text-[#A1A1AA] transition-colors hover:border-brand-primary/60 hover:text-[#FAFAFA]"
              disabled={saving}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Cambiar link
            </button>
            <button
              type="button"
              onClick={clearVideo}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#3F3F46] bg-[#18181B] px-3 py-1.5 text-xs text-[#A1A1AA] transition-colors hover:border-[#EF4444]/60 hover:text-[#EF4444] disabled:opacity-50"
              disabled={saving}
              aria-label="Quitar video"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Quitar
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Empty or editing mode ────────────────────────────────────────────────
  // For non-editors with no video, show a friendly placeholder.
  if (!canEdit && !mediaUrl) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#3F3F46] bg-[#09090B] px-6 text-center">
        <PlayCircle className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm font-medium text-[#71717A]">Sin video</p>
        <p className="text-[11px] text-[#52525B] max-w-[260px] leading-relaxed">
          El coach todavía no agregó un video tutorial para este ejercicio.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor={`media-url-${exerciseId}`}
        className="text-[11px] font-medium uppercase tracking-wide text-[#52525B]"
      >
        Link del video (Google Drive, YouTube o Vimeo)
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id={`media-url-${exerciseId}`}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://drive.google.com/file/d/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={saving}
          className="flex-1 rounded-md border border-[#3F3F46] bg-[#09090B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/40 disabled:opacity-50"
        />
        {trimmed !== "" && (
          <button
            type="button"
            onClick={() => setUrl("")}
            disabled={saving}
            aria-label="Borrar link"
            className="inline-flex items-center justify-center rounded-md border border-[#3F3F46] bg-[#18181B] px-3 text-xs text-[#A1A1AA] transition-colors hover:border-[#52525B] hover:text-[#FAFAFA] disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || (trimmed !== "" && !supportedDraft)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-primary px-4 text-xs font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          Guardar
        </button>
      </div>

      {trimmed !== "" && !supportedDraft && (
        <p className="text-[11px] text-amber-400">
          No reconocemos el servicio del link. Aceptamos YouTube, Vimeo y Google Drive.
        </p>
      )}

      {draftLoopEmbed && (
        <LoopMediaFrame
          embed={draftLoopEmbed}
          title="Vista previa del video"
          maxAspectRatio={9 / 16}
        />
      )}

      {!draftLoopEmbed && !mediaUrl && trimmed === "" && (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#3F3F46] bg-[#09090B] px-6 text-center">
          <PlayCircle className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-sm font-medium text-[#71717A]">Pegá un link para empezar</p>
          <p className="text-[11px] text-[#52525B] max-w-[260px] leading-relaxed">
            El video va a ser la portada de este ejercicio en tu biblioteca y en las
            rutinas que asignes.
          </p>
        </div>
      )}
    </div>
  );
}

function ExternalLinkCard({ url }: { url: string }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/40 bg-[#09090B] px-6 text-center">
      <PlayCircle
        className="h-10 w-10 text-amber-400/70"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-[#FAFAFA]">
        Este link no se puede embeber
      </p>
      <p className="text-[11px] text-[#71717A] max-w-[280px] leading-relaxed">
        Para que el video se reproduzca acá adentro, usá un link de
        <span className="text-[#FAFAFA]"> Google Drive</span>,
        <span className="text-[#FAFAFA]"> YouTube</span> o
        <span className="text-[#FAFAFA]"> Vimeo</span>. Tocá "Cambiar link" o
        "Quitar" abajo y pegá uno soportado.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-[#3F3F46] bg-transparent px-3 py-1 text-[11px] font-medium text-[#A1A1AA] transition-colors hover:border-brand-primary/40 hover:text-[#FAFAFA]"
      >
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
        Abrir link actual
      </a>
    </div>
  );
}
