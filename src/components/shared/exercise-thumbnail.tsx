"use client";

import * as React from "react";
import { Dumbbell } from "lucide-react";

interface ExerciseThumbnailProps {
  thumbnailUrl?: string | null;
  alt: string;
  className?: string;
  iconSize?: "sm" | "md";
}

function getGoogleDriveImageUrl(url: string): string | null {
  const match = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/.exec(url);
  if (match) return `https://lh3.googleusercontent.com/d/${match[1]}=w600`;
  const qMatch = /drive\.google\.com\/(?:open|uc)\?.*?id=([A-Za-z0-9_-]+)/.exec(url);
  if (qMatch) return `https://lh3.googleusercontent.com/d/${qMatch[1]}=w600`;
  return null;
}

function resolveUrl(thumbnailUrl: string | null | undefined): string | null {
  if (!thumbnailUrl || thumbnailUrl.startsWith("/") || thumbnailUrl.startsWith("./")) {
    return null;
  }
  if (/drive\.google\.com/.test(thumbnailUrl) || /googleusercontent\.com/.test(thumbnailUrl)) {
    return getGoogleDriveImageUrl(thumbnailUrl) ?? thumbnailUrl;
  }
  // Any other https:// URL — use as-is
  if (thumbnailUrl.startsWith("https://") || thumbnailUrl.startsWith("http://")) {
    return thumbnailUrl;
  }
  return null;
}

export function ExerciseThumbnail({
  thumbnailUrl,
  alt,
  className = "",
  iconSize = "md",
}: ExerciseThumbnailProps) {
  const src = React.useMemo(() => resolveUrl(thumbnailUrl), [thumbnailUrl]);
  // Trackeamos "qué src falló" en lugar de un boolean para que el cambio de
  // src resetee `failed` automáticamente sin necesidad de useEffect — evita
  // el lint useExhaustiveDependencies y simplifica el flow.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const failed = src !== null && failedSrc === src;

  const iconCls = iconSize === "sm" ? "h-5 w-5" : "h-10 w-10";

  if (!src || failed) {
    const initials =
      iconSize === "md"
        ? alt
            .split(/\s+/)
            .filter((w) => w.length > 0)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? "")
            .join("")
            .slice(0, 2)
        : null;
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#27272A] to-[#18181B] ${className}`}>
        <Dumbbell className={`${iconCls} text-[#52525B]`} strokeWidth={1.5} aria-hidden="true" />
        {initials && initials.length > 0 && (
          <span className="text-[10px] font-bold tracking-[0.12em] text-[#52525B]">
            {initials}
          </span>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={alt}
      className={`h-full w-full object-contain bg-gradient-to-br from-[#27272A] to-[#18181B] ${className}`}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}
