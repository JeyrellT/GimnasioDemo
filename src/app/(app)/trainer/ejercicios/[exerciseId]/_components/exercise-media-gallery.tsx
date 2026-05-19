"use client";

import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Film, PlayCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExerciseMediaGalleryProps {
  thumbnailUrl: string | null;
  gifUrl: string | null;
  mediaUrl: string | null;
  /** Exercise slug for static image fallback from /exercises/{slug}.jpg */
  slug?: string | null;
}

type TabId = "foto" | "gif" | "video";

interface Tab {
  id: TabId;
  label: string;
}

// ---------------------------------------------------------------------------
// Video URL helpers
// ---------------------------------------------------------------------------

function getYouTubeEmbedUrl(url: string): string | null {
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
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

/**
 * Extracts Google Drive file ID from various URL formats:
 *   - drive.google.com/file/d/FILE_ID/view
 *   - drive.google.com/open?id=FILE_ID
 *   - drive.google.com/uc?id=FILE_ID
 */
function getGoogleDriveFileId(url: string): string | null {
  const filePathMatch = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/.exec(url);
  if (filePathMatch) return filePathMatch[1];
  const queryMatch = /drive\.google\.com\/(?:open|uc)\?.*?id=([A-Za-z0-9_-]+)/.exec(url);
  if (queryMatch) return queryMatch[1];
  return null;
}

/** Returns an embeddable preview URL for Google Drive videos. */
function getGoogleDriveEmbedUrl(url: string): string | null {
  const fileId = getGoogleDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/** Returns a direct image URL for Google Drive images. */
function getGoogleDriveImageUrl(url: string): string | null {
  const fileId = getGoogleDriveFileId(url);
  if (!fileId) return null;
  return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
}

/** True if the URL points to Google Drive. */
function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com/.test(url);
}

function getEmbedUrl(url: string): string | null {
  return getYouTubeEmbedUrl(url) ?? getVimeoEmbedUrl(url) ?? getGoogleDriveEmbedUrl(url);
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
// Sub-panels
// ---------------------------------------------------------------------------

/**
 * Resolves the best photo URL, trying multiple sources in order:
 * 1. thumbnailUrl (direct or Google Drive converted)
 * 2. Static fallback: /exercises/{slug}.jpg then .png
 */
function useResolvedPhotoSrc(
  src: string | null,
  slug: string | null | undefined,
): string | null {
  const [currentSrc, setCurrentSrc] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    setAttempt(0);
    if (src) {
      setCurrentSrc(isGoogleDriveUrl(src) ? (getGoogleDriveImageUrl(src) ?? src) : src);
    } else if (slug) {
      setCurrentSrc(`/exercises/${slug}.jpg`);
    } else {
      setCurrentSrc(null);
    }
  }, [src, slug]);

  const handleError = React.useCallback(() => {
    if (attempt === 0 && slug) {
      // First fail: try .jpg static
      setCurrentSrc(`/exercises/${slug}.jpg`);
      setAttempt(1);
    } else if (attempt === 1 && slug) {
      // Second fail: try .png static
      setCurrentSrc(`/exercises/${slug}.png`);
      setAttempt(2);
    } else {
      // All failed
      setCurrentSrc(null);
    }
  }, [attempt, slug]);

  return currentSrc;
}

function PhotoPanel({ src, slug }: { src: string | null; slug?: string | null }) {
  const resolvedSrc = useResolvedPhotoSrc(src, slug);
  const [errored, setErrored] = React.useState(false);
  const [imgKey, setImgKey] = React.useState(0);

  // Reset error when resolvedSrc changes
  React.useEffect(() => {
    setErrored(false);
    setImgKey((k) => k + 1);
  }, [resolvedSrc]);

  if (!resolvedSrc || errored) return <MediaPlaceholder label="Sin imagen disponible" />;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#3F3F46] bg-[#09090B]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={imgKey}
        src={resolvedSrc}
        alt="Foto del ejercicio"
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

function GifPanel({ src }: { src: string }) {
  const [errored, setErrored] = React.useState(false);
  // Convert Google Drive share links to direct image URLs
  const resolvedSrc = isGoogleDriveUrl(src) ? (getGoogleDriveImageUrl(src) ?? src) : src;
  if (errored) return <MediaPlaceholder label="GIF no disponible" />;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#3F3F46] bg-[#09090B]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt="Animación del ejercicio"
        className="h-full w-full object-contain"
        loading="lazy"
        onError={() => setErrored(true)}
      />
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

  // Fallback: plain link
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-[#3F3F46] bg-[#09090B]">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <PlayCircle className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm text-[#A1A1AA]">Video externo</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2563EB]"
        >
          Ver video
        </a>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#3F3F46] bg-[#09090B] px-6 text-center">
      <ImageIcon className="h-10 w-10 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
      <p className="text-sm font-medium text-[#71717A]">Sin contenido multimedia</p>
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
      {label === "Video" ? (
        <PlayCircle className="h-8 w-8 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <Film className="h-8 w-8 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
      )}
      <p className="text-xs font-medium text-[#71717A]">Sin {label.toLowerCase()}</p>
      <p className="text-[11px] text-[#52525B] max-w-[220px] leading-relaxed">{hint}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExerciseMediaGallery({ thumbnailUrl, gifUrl, mediaUrl, slug }: ExerciseMediaGalleryProps) {
  // Always show all 3 tabs — Foto uses static fallback, GIF/Video show placeholder if empty
  const ALL_TABS: Tab[] = [
    { id: "foto", label: "Foto" },
    { id: "gif", label: "GIF" },
    { id: "video", label: "Video" },
  ];

  const [activeTab, setActiveTab] = useState<TabId>("foto");

  return (
    <div className="flex flex-col gap-3">
      {/* Tab bar — always visible */}
      <div
        className="flex gap-1 rounded-lg border border-[#3F3F46] bg-[#09090B] p-1"
        role="tablist"
        aria-label="Contenido multimedia del ejercicio"
      >
        {ALL_TABS.map((tab) => {
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
            {activeTab === "foto" && <PhotoPanel src={thumbnailUrl} slug={slug} />}
            {activeTab === "gif" && (gifUrl ? <GifPanel src={gifUrl} /> : <UploadHint label="GIF" hint="Pegá un link de Google Drive o URL directa en el editor del ejercicio" />)}
            {activeTab === "video" && (mediaUrl ? <VideoPanel url={mediaUrl} /> : <UploadHint label="Video" hint="Pegá un link de YouTube, Vimeo o Google Drive en el editor del ejercicio" />)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
