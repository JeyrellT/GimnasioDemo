// =============================================================================
// BLACKLINE FITNESS — Video URL helpers
//
// Recognizes YouTube, Vimeo and Google Drive URLs and derives:
//   - embed URL (for an <iframe> player)
//   - thumbnail URL (for list covers + posters)
//
// Used by both the trainer-facing gallery and the client-facing routine player.
// No service tokens / API calls — all transformations are static-string based.
// =============================================================================

export function getYouTubeId(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url);
  return m ? m[1]! : null;
}

export function getVimeoId(url: string): string | null {
  const m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  return m ? m[1]! : null;
}

export function getGoogleDriveFileId(url: string): string | null {
  const path = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/.exec(url);
  if (path) return path[1]!;
  const query = /drive\.google\.com\/(?:open|uc)\?.*?id=([A-Za-z0-9_-]+)/.exec(url);
  return query ? query[1]! : null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : null;
}

export function getVimeoEmbedUrl(url: string): string | null {
  const id = getVimeoId(url);
  return id ? `https://player.vimeo.com/video/${id}` : null;
}

export function getGoogleDriveEmbedUrl(url: string): string | null {
  const id = getGoogleDriveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

export function getVideoEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return getYouTubeEmbedUrl(url) ?? getVimeoEmbedUrl(url) ?? getGoogleDriveEmbedUrl(url);
}

/**
 * Returns a still image URL for `url` when the service publishes one without
 * an API call:
 *   - YouTube → https://img.youtube.com/vi/{id}/hqdefault.jpg
 *   - Drive   → https://lh3.googleusercontent.com/d/{id}=w600
 *   - Vimeo   → null (the public oEmbed endpoint requires a network call)
 */
export function deriveVideoThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;
  const driveId = getGoogleDriveFileId(url);
  if (driveId) return `https://lh3.googleusercontent.com/d/${driveId}=w600`;
  const ytId = getYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return null;
}

export function isSupportedVideoUrl(url: string | null | undefined): boolean {
  return getVideoEmbedUrl(url) !== null;
}

/**
 * Appends autoplay to YouTube / Vimeo embeds. Drive's /preview URL does not
 * honor autoplay, so it is returned unchanged.
 */
export function withAutoplay(embedUrl: string): string {
  if (embedUrl.startsWith("https://drive.google.com/")) return embedUrl;
  return embedUrl + (embedUrl.includes("?") ? "&autoplay=1" : "?autoplay=1");
}

// =============================================================================
// GIF-mode: autoplay + loop + muted + no controls
//
// Each service has a different mechanism:
//   - Drive  → <video> element pointing to the direct stream URL. The /preview
//              iframe does NOT support loop/autoplay params, so we fall back
//              to a <video> tag with `autoplay loop muted playsinline`.
//   - YouTube → iframe with `autoplay=1&loop=1&playlist={id}&mute=1&controls=0`
//              (YouTube requires `playlist={id}` to loop a single-video player).
//   - Vimeo  → iframe with `background=1` (Vimeo's "background mode" hides
//              controls and enables autoplay + loop + muted automatically).
// =============================================================================

export type LoopEmbed =
  | { kind: "iframe"; src: string }
  | { kind: "video"; src: string };

export function getDriveDirectVideoUrl(url: string): string | null {
  const id = getGoogleDriveFileId(url);
  // The lh3 video URL works for publicly-shared Drive files without a virus
  // scan interstitial. `=m18` is Google's "video mp4" variant tag.
  return id ? `https://lh3.googleusercontent.com/d/${id}=m18` : null;
}

export function getYouTubeLoopEmbedUrl(url: string): string | null {
  const id = getYouTubeId(url);
  if (!id) return null;
  // playlist={id} is REQUIRED for loop=1 to work on a single video.
  return (
    `https://www.youtube.com/embed/${id}` +
    `?autoplay=1&loop=1&playlist=${id}&mute=1&controls=0&modestbranding=1` +
    `&rel=0&playsinline=1&iv_load_policy=3`
  );
}

export function getVimeoLoopEmbedUrl(url: string): string | null {
  const id = getVimeoId(url);
  if (!id) return null;
  // background=1 turns on autoplay+loop+muted and removes all chrome.
  return `https://player.vimeo.com/video/${id}?background=1&autoplay=1&loop=1&muted=1`;
}

/**
 * Returns the right element kind + URL to render `url` as a silently-looping
 * GIF-style video. Falls back to null when the URL doesn't match a supported
 * provider (caller can render a placeholder).
 */
export function getVideoLoopEmbed(
  url: string | null | undefined,
): LoopEmbed | null {
  if (!url) return null;
  const drive = getDriveDirectVideoUrl(url);
  if (drive) return { kind: "video", src: drive };
  const yt = getYouTubeLoopEmbedUrl(url);
  if (yt) return { kind: "iframe", src: yt };
  const vimeo = getVimeoLoopEmbedUrl(url);
  if (vimeo) return { kind: "iframe", src: vimeo };
  return null;
}
