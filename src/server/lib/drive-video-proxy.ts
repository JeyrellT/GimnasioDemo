// =============================================================================
// BLACKLINE FITNESS — Drive video proxy helper
//
// Shared logic to fetch a Drive video from the Node runtime and re-stream
// it with permissive headers, bypassing the `Cross-Origin-Resource-Policy:
// same-site` that Drive sets on its content. Used by:
//
//   - /api/exercise-video/[fileId]              (direct file proxy, TRAINER-only)
//   - /api/exercise/[exerciseId]/video          (by-exercise resolution)
//
// Both routes share `proxyDriveFile()` for the actual streaming.
//
// HARDENING (responde a auditoría de seguridad):
//   - redirect: "manual" + validación de Location contra hostnames de Google.
//     Evita SSRF si Drive (o un fileId manipulado) responde con Location a
//     un host arbitrario.
//   - AbortSignal.timeout(30s) en el fetch upstream — un atacante con sesión
//     no puede mantener conexiones colgadas.
//   - Cap de tamaño (200 MB). Videos de demostración tipo GIF rara vez pasan
//     de 30-50 MB; 200 MB es generoso pero acota el blast radius.
//   - Cache-Control 1 hora (no 1 año): si el trainer cambia el URL del video,
//     el cambio se refleja sin necesidad de invalidar caches.
// =============================================================================

import { NextResponse } from "next/server";

export const DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,80}$/;
const UPSTREAM_HOST = "https://drive.usercontent.google.com/download";
const FETCH_TIMEOUT_MS = 30_000;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

// Hostnames a los que aceptamos seguir un redirect upstream. Drive normalmente
// responde con 30x a `*.googleusercontent.com`; cualquier otra cosa es señal
// de ataque o configuración incorrecta y la bloqueamos.
const ALLOWED_REDIRECT_HOSTS = [
  "drive.google.com",
  "drive.usercontent.google.com",
  "googleusercontent.com",
];

function isAllowedRedirectHost(hostname: string): boolean {
  return ALLOWED_REDIRECT_HOSTS.some(
    (h) => hostname === h || hostname.endsWith(`.${h}`),
  );
}

/**
 * Hace fetch siguiendo redirects manualmente, validando que cada Location
 * apunte a un hostname de Google. Máximo 5 saltos para evitar bucles.
 */
async function fetchWithSafeRedirects(
  initialUrl: string,
  init: RequestInit,
): Promise<Response> {
  let currentUrl = initialUrl;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(currentUrl, { ...init, redirect: "manual" });
    // 30x → validar Location y continuar.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      const next = new URL(location, currentUrl);
      if (!isAllowedRedirectHost(next.hostname)) {
        throw new Error(`redirect host not allowed: ${next.hostname}`);
      }
      currentUrl = next.toString();
      continue;
    }
    return res;
  }
  throw new Error("too many redirects");
}

/**
 * Fetch a public Drive file by its fileId and return a Next.js response that
 * streams the bytes back to the browser with same-origin-safe headers.
 * Forwards Range headers so <video> seeking works.
 *
 * Returns:
 *   - 400 si fileId no matchea el pattern.
 *   - 415 si Drive responde con HTML (file no público o > 25MB sin permisos).
 *   - 413 si el upstream reporta Content-Length sobre MAX_VIDEO_BYTES.
 *   - 502 si Drive falla, hay redirect sospechoso, o el timeout dispara.
 */
export async function proxyDriveFile(
  fileId: string,
  rangeHeader: string | null,
): Promise<Response> {
  if (!DRIVE_FILE_ID_PATTERN.test(fileId)) {
    return new NextResponse("Invalid fileId", { status: 400 });
  }

  const upstream = `${UPSTREAM_HOST}?id=${encodeURIComponent(fileId)}&export=download`;
  let upstreamRes: Response;
  try {
    upstreamRes = await fetchWithSafeRedirects(upstream, {
      headers: rangeHeader ? { Range: rangeHeader } : undefined,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    // Cualquier fallo (timeout, redirect sospechoso, network) → 502 al cliente.
    return new NextResponse("Upstream error", { status: 502 });
  }

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

  // Cap de tamaño para mitigar DoS / costos de egress. Solo aplica cuando el
  // upstream reporta Content-Length (cuando es chunked transfer encoding no
  // hay manera barata de saberlo de antemano).
  const contentLengthRaw = upstreamRes.headers.get("content-length");
  if (contentLengthRaw) {
    const contentLengthNum = Number.parseInt(contentLengthRaw, 10);
    if (
      Number.isFinite(contentLengthNum) &&
      contentLengthNum > MAX_VIDEO_BYTES
    ) {
      return new NextResponse("Video excede el límite del proxy.", {
        status: 413,
      });
    }
  }

  const responseHeaders = new Headers({
    "Content-Type": contentType,
    // 1 hora — si el trainer cambia el video, el cambio se refleja sin
    // necesidad de bust manual de caches. El video en sí es immutable
    // (Drive fileId es estable), pero la asociación exerciseId → fileId no.
    "Cache-Control": "public, max-age=3600",
    "Accept-Ranges": "bytes",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  if (contentLengthRaw) responseHeaders.set("Content-Length", contentLengthRaw);
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
