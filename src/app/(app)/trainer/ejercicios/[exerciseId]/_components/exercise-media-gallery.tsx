"use client";

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

function getEmbedUrl(url: string): string | null {
  return getYouTubeEmbedUrl(url) ?? getVimeoEmbedUrl(url);
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

function PhotoPanel({ src }: { src: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#3F3F46] bg-[#09090B]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Foto del ejercicio"
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

function GifPanel({ src }: { src: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#3F3F46] bg-[#09090B]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Animación del ejercicio"
        className="h-full w-full object-contain"
        loading="lazy"
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
          className="inline-flex items-center rounded-lg bg-[#FF6A1A] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#E55A0E]"
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExerciseMediaGallery({ thumbnailUrl, gifUrl, mediaUrl }: ExerciseMediaGalleryProps) {
  const tabs: Tab[] = [
    ...(thumbnailUrl ? [{ id: "foto" as TabId, label: "Foto" }] : []),
    ...(gifUrl ? [{ id: "gif" as TabId, label: "GIF" }] : []),
    ...(mediaUrl ? [{ id: "video" as TabId, label: "Video" }] : []),
  ];

  const [activeTab, setActiveTab] = useState<TabId>(tabs[0]?.id ?? "foto");

  if (tabs.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Tab bar — only rendered when more than one tab */}
      {tabs.length > 1 && (
        <div
          className="flex gap-1 rounded-lg border border-[#3F3F46] bg-[#09090B] p-1"
          role="tablist"
          aria-label="Contenido multimedia del ejercicio"
        >
          {tabs.map((tab) => {
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
      )}

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
            {activeTab === "foto" && thumbnailUrl && <PhotoPanel src={thumbnailUrl} />}
            {activeTab === "gif" && gifUrl && <GifPanel src={gifUrl} />}
            {activeTab === "video" && mediaUrl && <VideoPanel url={mediaUrl} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Icon legend row */}
      <div className="flex items-center gap-4 text-[10px] text-[#52525B]">
        {thumbnailUrl && (
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" aria-hidden="true" />
            Foto
          </span>
        )}
        {gifUrl && (
          <span className="flex items-center gap-1">
            <Film className="h-3 w-3" aria-hidden="true" />
            GIF animado
          </span>
        )}
        {mediaUrl && (
          <span className="flex items-center gap-1">
            <PlayCircle className="h-3 w-3" aria-hidden="true" />
            Video
          </span>
        )}
      </div>
    </div>
  );
}
