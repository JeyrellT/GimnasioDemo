"use client";

import * as React from "react";
import { Dumbbell } from "lucide-react";
import { SLUG_IMAGE_MAP } from "@/lib/constants/exercise-images";

interface ExerciseThumbnailProps {
  thumbnailUrl?: string | null;
  gifUrl?: string | null;
  slug?: string | null;
  alt: string;
  className?: string;
  iconSize?: "sm" | "md";
}

function isGoogleDriveUrl(url: string) {
  return /drive\.google\.com/.test(url);
}

function getGoogleDriveImageUrl(url: string): string | null {
  const match = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/.exec(url);
  if (match) return `https://lh3.googleusercontent.com/d/${match[1]}=w600`;
  const qMatch = /drive\.google\.com\/(?:open|uc)\?.*?id=([A-Za-z0-9_-]+)/.exec(url);
  if (qMatch) return `https://lh3.googleusercontent.com/d/${qMatch[1]}=w600`;
  return null;
}

function buildChain(
  thumbnailUrl: string | null | undefined,
  gifUrl: string | null | undefined,
  slug: string | null | undefined,
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (u: string) => {
    if (!seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  };

  const raw = thumbnailUrl ?? gifUrl;
  if (raw) {
    add(isGoogleDriveUrl(raw) ? (getGoogleDriveImageUrl(raw) ?? raw) : raw);
  }
  if (slug) {
    add(`/exercises/${slug}.jpg`);
    add(`/exercises/${slug}.png`);
  }
  const mapped = slug ? SLUG_IMAGE_MAP[slug] : undefined;
  if (mapped) {
    add(`/exercises/${mapped}`);
  }
  return urls;
}

export function ExerciseThumbnail({
  thumbnailUrl,
  gifUrl,
  slug,
  alt,
  className = "",
  iconSize = "md",
}: ExerciseThumbnailProps) {
  const chain = React.useMemo(
    () => buildChain(thumbnailUrl, gifUrl, slug),
    [thumbnailUrl, gifUrl, slug],
  );
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    setIndex(0);
  }, [thumbnailUrl, gifUrl, slug]);

  const src = index < chain.length ? chain[index] : null;
  const iconCls = iconSize === "sm" ? "h-5 w-5" : "h-8 w-8";

  if (!src) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-[#27272A] to-[#18181B] ${className}`}>
        <Dumbbell className={`${iconCls} text-[#3F3F46]`} strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={alt}
      className={`h-full w-full object-cover ${className}`}
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
