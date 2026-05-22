// =============================================================================
// BLACKLINE FITNESS — Drive video proxy helper
//
// Shared logic to fetch a Drive video from the Node runtime and re-stream
// it with permissive headers, bypassing the `Cross-Origin-Resource-Policy:
// same-site` that Drive sets on its content. Used by:
//
//   - /api/exercise-video/[fileId]              (direct file proxy)
//   - /api/exercise/[exerciseId]/video          (by-exercise resolution)
//
// Both routes share `proxyDriveFile()` for the actual streaming.
// =============================================================================

import { NextResponse } from "next/server";

export const DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,80}$/;
const UPSTREAM_HOST = "https://drive.usercontent.google.com/download";

/**
 * Fetch a public Drive file by its fileId and return a Next.js response that
 * streams the bytes back to the browser with same-origin-safe headers.
 * Forwards Range headers so <video> seeking works.
 *
 * Returns a 415 if Drive responds with an HTML interstitial (file not
 * public or larger than ~25MB — those would need a different strategy).
 */
export async function proxyDriveFile(
  fileId: string,
  rangeHeader: string | null,
): Promise<Response> {
  if (!DRIVE_FILE_ID_PATTERN.test(fileId)) {
    return new NextResponse("Invalid fileId", { status: 400 });
  }

  const upstream = `${UPSTREAM_HOST}?id=${encodeURIComponent(fileId)}&export=download`;
  const upstreamRes = await fetch(upstream, {
    headers: rangeHeader ? { Range: rangeHeader } : undefined,
    redirect: "follow",
  });

  if (!upstreamRes.ok || !upstreamRes.body) {
    return new NextResponse("Upstream error", { status: 502 });
  }

  const contentType = upstreamRes.headers.get("content-type") ?? "video/mp4";
  if (!contentType.startsWith("video/")) {
    return new NextResponse(
      "Drive file no es público o supera el límite de proxy.",
      { status: 415 },
    );
  }

  const responseHeaders = new Headers({
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  const contentLength = upstreamRes.headers.get("content-length");
  if (contentLength) responseHeaders.set("Content-Length", contentLength);
  const contentRange = upstreamRes.headers.get("content-range");
  if (contentRange) responseHeaders.set("Content-Range", contentRange);

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  });
}

/**
 * Extract a Drive fileId from any Drive-style URL.
 * Mirrors the client-side helper in `lib/media/video-url.ts` but lives in
 * the server tree because it's used in the proxy resolution.
 */
export function extractDriveFileId(url: string): string | null {
  const path = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/.exec(url);
  if (path) return path[1]!;
  const query = /drive\.google\.com\/(?:open|uc)\?.*?id=([A-Za-z0-9_-]+)/.exec(url);
  return query ? query[1]! : null;
}
