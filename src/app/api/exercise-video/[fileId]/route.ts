// =============================================================================
// BLACKLINE FITNESS — Drive video proxy
//
// Drive serves uploaded files with `Cross-Origin-Resource-Policy: same-site`,
// which the browser enforces by REFUSING to load the response inside a
// <video> element on a different site (our app). HEAD-checked endpoints:
//
//   drive.google.com/uc                  → CORP same-site
//   drive.usercontent.google.com/download → CORP same-site
//   docs.google.com/uc                   → CORP same-site
//
// CORP is a separate check from CORS and cannot be relaxed client-side. The
// only fixes are (a) host the file elsewhere or (b) proxy server-side. This
// route is option (b): we fetch the Drive file from our Node runtime, where
// CORP doesn't apply, and re-stream the bytes back with permissive headers
// so the browser <video> element can play them.
//
// Security:
//   - fileId is validated as `[A-Za-z0-9_-]{10,80}` (Drive's own pattern).
//     This caps SSRF: we can only forward to drive.usercontent.google.com
//     with a Drive-shaped id, never to an arbitrary URL.
//   - We do NOT forward the user's Drive cookies — the file MUST be publicly
//     shared ("anyone with the link") for the proxy to fetch it.
//
// Bandwidth: every cached video is ~2-5MB. We set
//   Cache-Control: public, max-age=31536000, immutable
// so the CDN (Railway/edge) and the browser cache aggressively.
// =============================================================================

import { NextResponse } from "next/server";

// Node runtime — needed for stream-passthrough of the upstream body.
export const runtime = "nodejs";
// Don't render at build time, this is per-request.
export const dynamic = "force-dynamic";

const FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,80}$/;
const UPSTREAM_HOST = "https://drive.usercontent.google.com/download";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<Response> {
  const { fileId } = await params;
  if (!FILE_ID_PATTERN.test(fileId)) {
    return new NextResponse("Invalid fileId", { status: 400 });
  }

  const upstream = `${UPSTREAM_HOST}?id=${encodeURIComponent(fileId)}&export=download`;
  const rangeHeader = req.headers.get("range");

  // Forward Range header so <video> seeking works.
  const upstreamRes = await fetch(upstream, {
    headers: rangeHeader ? { Range: rangeHeader } : undefined,
    // We never want Drive's "are you sure?" virus-scan interstitial here —
    // for files <25 MB Drive serves the bytes directly, so this fetch
    // returns video/mp4. Larger files would need a different strategy.
    redirect: "follow",
  });

  if (!upstreamRes.ok || !upstreamRes.body) {
    return new NextResponse("Upstream error", { status: 502 });
  }

  const contentType = upstreamRes.headers.get("content-type") ?? "video/mp4";
  // Guard against Drive returning an HTML interstitial: if the upstream is
  // text/html, the file isn't public or is too large. Don't pretend it's a
  // video — let the client see the error.
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
    // Allow browsers on a CDN edge to load this resource into <video>.
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  const contentLength = upstreamRes.headers.get("content-length");
  if (contentLength) responseHeaders.set("Content-Length", contentLength);
  const contentRange = upstreamRes.headers.get("content-range");
  if (contentRange) responseHeaders.set("Content-Range", contentRange);

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status, // 200 for full, 206 for partial
    headers: responseHeaders,
  });
}
