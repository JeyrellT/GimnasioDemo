"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, PlayCircle, Upload, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SLUG_IMAGE_MAP } from "@/lib/constants/exercise-images";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExerciseMediaGalleryProps {
  thumbnailUrl: string | null;
  gifUrl: string | null;
  mediaUrl: string | null;
  /** Exercise slug for static image fallback from /exercises/{slug}.jpg */
  slug?: string | null;
  /** Exercise English name for additional fallback */
  nameEn?: string | null;
  /** Required for upload — exercise ID */
  exerciseId?: string;
  /** Whether the current user owns the exercise (can upload custom photo) */
  canEdit?: boolean;
  /** Called when a new custom photo is saved (data URL) */
  onPhotoUpdated?: (newThumbnailUrl: string) => void;
}

type TabId = "foto" | "video";

interface Tab {
  id: TabId;
  label: string;
}

// ---------------------------------------------------------------------------
// Video URL helpers
// ---------------------------------------------------------------------------

function getYouTubeEmbedUrl(url: string): string | null {
  const ytRegex =
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const match = ytRegex.exec(url);
  if (!match) return null;
  return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
}

function getVimeoEmbedUrl(url: string): string | null {
  const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
  const match = vimeoRegex.exec(url);
  if (!match) return null;
  return `https://player.vimeo.com/video/${match[1]}`;
}

function getGoogleDriveFileId(url: string): string | null {
  const filePathMatch = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/.exec(url);
  if (filePathMatch) return filePathMatch[1];
  const queryMatch = /drive\.google\.com\/(?:open|uc)\?.*?id=([A-Za-z0-9_-]+)/.exec(url);
  if (queryMatch) return queryMatch[1];
  return null;
}

function getGoogleDriveEmbedUrl(url: string): string | null {
  const fileId = getGoogleDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function getGoogleDriveImageUrl(url: string): string | null {
  const fileId = getGoogleDriveFileId(url);
  if (!fileId) return null;
  return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
}

function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com/.test(url);
}

function getEmbedUrl(url: string): string | null {
  return getYouTubeEmbedUrl(url) ?? getVimeoEmbedUrl(url) ?? getGoogleDriveEmbedUrl(url);
}

function slugify(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Image resize/compress
// ---------------------------------------------------------------------------

async function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas no soportado"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Panel variants
// ---------------------------------------------------------------------------

const panelVariants = {
  enter: { opacity: 0, y: 6 },
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as const },
  },
};

// ---------------------------------------------------------------------------
// Image fallback hook
// ---------------------------------------------------------------------------

function useImageFallbackChain(
  src: string | null,
  slug: string | null | undefined,
  nameEn: string | null | undefined,
): { currentSrc: string | null; onError: () => void } {
  const chain = React.useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();
    const add = (u: string) => {
      if (!seen.has(u)) { seen.add(u); urls.push(u); }
    };
    if (src) {
      // Don't transform data: URLs
      if (src.startsWith("data:")) {
        add(src);
      } else {
        add(isGoogleDriveUrl(src) ? (getGoogleDriveImageUrl(src) ?? src) : src);
      }
    }
    if (slug) {
      add(`/exercises/${slug}.jpg`);
      add(`/exercises/${slug}.png`);
    }
    const enSlug = slugify(nameEn);
    if (enSlug) {
      add(`/exercises/${enSlug}.jpg`);
      add(`/exercises/${enSlug}.png`);
    }
    const mappedEs = slug ? SLUG_IMAGE_MAP[slug] : undefined;
    if (mappedEs) add(`/exercises/${mappedEs}`);
    const mappedEn = enSlug ? SLUG_IMAGE_MAP[enSlug] : undefined;
    if (mappedEn) add(`/exercises/${mappedEn}`);
    return urls;
  }, [src, slug, nameEn]);

  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    setIndex(0);
  }, [src, slug, nameEn]);

  const currentSrc = index < chain.length ? chain[index] : null;
  const onError = React.useCallback(() => setIndex((i) => i + 1), []);

  return { currentSrc, onError };
}

// ---------------------------------------------------------------------------
// Photo panel with upload + edit pencil
// ---------------------------------------------------------------------------

function PhotoPanel({
  src,
  slug,
  nameEn,
  exerciseId,
  canEdit,
  onPhotoUpdated,
}: {
  src: string | null;
  slug?: string | null;
  nameEn?: string | null;
  exerciseId?: string;
  canEdit?: boolean;
  onPhotoUpdated?: (url: string) => void;
}) {
  const { currentSrc, onError } = useImageFallbackChain(src, slug, nameEn);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // A custom photo is present when src is a data URL or http URL not derived from
  // local exercise images. We treat src truthy = custom (the resolved fallback
  // chain handles missing src by showing static images).
  const hasCustomPhoto = !!src;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !exerciseId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("La imagen es muy grande (máx 8MB).");
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      const { updateExercise } = await import("@/app/actions/exercises");
      const result = await updateExercise({ id: exerciseId, thumbnailUrl: dataUrl });
      if (result.ok) {
        onPhotoUpdated?.(dataUrl);
        toast.success("Foto actualizada.");
      } else {
        toast.error("No se pudo guardar la foto.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar la imagen.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  // No image at all + can edit → show upload state
  if (!currentSrc && canEdit && exerciseId) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={triggerFilePicker}
          disabled={uploading}
          className="group flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#3F3F46] bg-[#09090B] px-6 text-center transition-colors hover:border-[#3B82F6] hover:bg-[#3B82F6]/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" aria-hidden="true" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-[#52525B] transition-colors group-hover:text-[#3B82F6]" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-sm font-medium text-[#71717A] group-hover:text-[#FAFAFA]">Agregar foto</p>
              <p className="text-[11px] text-[#52525B]">JPG/PNG · máx 8MB</p>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  if (!currentSrc) return <MediaPlaceholder label="Sin imagen disponible" />;

  return (
    <div className="relative">
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#3F3F46] bg-[#09090B]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={currentSrc}
          src={currentSrc}
          alt="Foto del ejercicio"
          className="h-full w-full object-cover"
          loading="lazy"
          onError={onError}
        />
      </div>

      {/* Edit pencil — outside the box, top-right corner, only for owner */}
      {canEdit && exerciseId && (
        <>
          <button
            type="button"
            onClick={triggerFilePicker}
            disabled={uploading}
            aria-label={hasCustomPhoto ? "Cambiar foto" : "Agregar foto"}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-[#3F3F46] bg-[#18181B] text-[#A1A1AA] shadow-md transition-colors hover:border-[#3B82F6]/60 hover:bg-[#27272A] hover:text-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}

function VideoPanel({ url }: { url: string }) {
  const embedUrl = getEmbedUrl(url);

  if (embedUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#3F3F46] bg-[#09090B]">
        <iframe
          src={embedUrl}
          title="Video del ejercicio"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-[#3F3F46] bg-[#09090B]">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <PlayCircle className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm text-[#A1A1AA]">Video externo</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          Ver video
        </a>
      </div>
    </div>
  );
}

function MediaPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#3F3F46] bg-[#09090B] px-6 text-center">
      <ImageIcon className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
      <p className="text-sm font-medium text-[#71717A]">{label}</p>
    </div>
  );
}

function UploadHint({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#3F3F46] bg-[#09090B] px-6 text-center">
      <PlayCircle className="h-8 w-8 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
      <p className="text-xs font-medium text-[#71717A]">Sin {label.toLowerCase()}</p>
      <p className="text-[11px] text-[#52525B] max-w-[220px] leading-relaxed">{hint}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExerciseMediaGallery({
  thumbnailUrl,
  gifUrl: _gifUrl, // intentionally unused — GIF tab was removed
  mediaUrl,
  slug,
  nameEn,
  exerciseId,
  canEdit,
  onPhotoUpdated,
}: ExerciseMediaGalleryProps) {
  const TABS: Tab[] = [
    { id: "foto", label: "Foto" },
    { id: "video", label: "Video" },
  ];

  const [activeTab, setActiveTab] = useState<TabId>("foto");

  return (
    <div className="flex flex-col gap-3">
      {/* Tab bar */}
      <div
        className="flex gap-1 rounded-lg border border-[#3F3F46] bg-[#09090B] p-1"
        role="tablist"
        aria-label="Contenido multimedia del ejercicio"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={
                "relative flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                (isActive
                  ? "text-[#FAFAFA]"
                  : "text-[#71717A] hover:text-[#A1A1AA]")
              }
            >
              {isActive && (
                <motion.span
                  layoutId="gallery-tab-pill"
                  className="absolute inset-0 rounded-md bg-[#27272A]"
                  transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            variants={panelVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {activeTab === "foto" && (
              <PhotoPanel
                src={thumbnailUrl}
                slug={slug}
                nameEn={nameEn}
                exerciseId={exerciseId}
                canEdit={canEdit}
                onPhotoUpdated={onPhotoUpdated}
              />
            )}
            {activeTab === "video" && (mediaUrl ? <VideoPanel url={mediaUrl} /> : <UploadHint label="Video" hint="Pegá un link de YouTube, Vimeo o Google Drive en el editor del ejercicio" />)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
