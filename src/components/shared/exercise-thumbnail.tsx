"use client";

import * as React from "react";
import { Dumbbell } from "lucide-react";
import { SLUG_IMAGE_MAP } from "@/lib/constants/exercise-images";

interface ExerciseThumbnailProps {
  thumbnailUrl?: string | null;
  gifUrl?: string | null;
  slug?: string | null;
  nameEn?: string | null;
  alt: string;
  className?: string;
  iconSize?: "sm" | "md";
}

function slugify(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Devuelve una versión del slug sin palabras conectoras del español:
 *   "press-inclinado-con-mancuernas" → "press-inclinado-mancuernas"
 *   "jalon-al-pecho-en-polea-espalda" → "jalon-pecho-polea-espalda"
 *
 * Útil para hacer match contra el SLUG_IMAGE_MAP o archivos en /public sin
 * tener que listar manualmente cada variante de slug que la app pueda
 * generar a partir del nombre del ejercicio.
 */
const CONNECTOR_WORDS = new Set([
  "con", "de", "del", "en", "el", "la", "los", "las",
  "y", "o", "u", "a", "al", "para", "por",
]);
function normalizeSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const parts = slug.split("-").filter((p) => p && !CONNECTOR_WORDS.has(p));
  const out = parts.join("-");
  return out && out !== slug ? out : null;
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
  nameEn: string | null | undefined,
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
  const enSlug = slugify(nameEn);
  if (enSlug) {
    add(`/exercises/${enSlug}.jpg`);
    add(`/exercises/${enSlug}.png`);
  }
  const mappedEs = slug ? SLUG_IMAGE_MAP[slug] : undefined;
  if (mappedEs) {
    add(`/exercises/${mappedEs}`);
  }
  const mappedEn = enSlug ? SLUG_IMAGE_MAP[enSlug] : undefined;
  if (mappedEn) {
    add(`/exercises/${mappedEn}`);
  }
  // Último intento: probar con el slug normalizado (sin "con", "en", "al",
  // etc.). Esto resuelve muchos casos donde el slug del DB difiere del
  // mapa sólo por una palabra conectora.
  const normalizedEs = normalizeSlug(slug);
  if (normalizedEs) {
    add(`/exercises/${normalizedEs}.jpg`);
    add(`/exercises/${normalizedEs}.png`);
    const mappedNormEs = SLUG_IMAGE_MAP[normalizedEs];
    if (mappedNormEs) add(`/exercises/${mappedNormEs}`);
  }
  const normalizedEn = normalizeSlug(enSlug);
  if (normalizedEn) {
    add(`/exercises/${normalizedEn}.jpg`);
    add(`/exercises/${normalizedEn}.png`);
    const mappedNormEn = SLUG_IMAGE_MAP[normalizedEn];
    if (mappedNormEn) add(`/exercises/${mappedNormEn}`);
  }
  return urls;
}

export function ExerciseThumbnail({
  thumbnailUrl,
  gifUrl,
  slug,
  nameEn,
  alt,
  className = "",
  iconSize = "md",
}: ExerciseThumbnailProps) {
  const chain = React.useMemo(
    () => buildChain(thumbnailUrl, gifUrl, slug, nameEn),
    [thumbnailUrl, gifUrl, slug, nameEn],
  );
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    setIndex(0);
  }, [thumbnailUrl, gifUrl, slug, nameEn]);

  const src = index < chain.length ? chain[index] : null;
  const iconCls = iconSize === "sm" ? "h-5 w-5" : "h-10 w-10";

  if (!src) {
    // Derive 2-letter initials from the exercise name as a richer fallback in
    // md size. Keeps the small "sm" icon-only look for tight list rows.
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
    // Outer wrapper paints the neutral background so object-contain shows the
    // full exercise figure (cabeza + cuerpo + pies) centered without cropping.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={alt}
      className={`h-full w-full object-contain bg-gradient-to-br from-[#27272A] to-[#18181B] ${className}`}
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
