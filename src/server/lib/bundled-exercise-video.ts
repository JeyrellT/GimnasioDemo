import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { Readable } from "node:stream";

const VIDEO_ROOT = resolve(process.cwd(), "public", "exercise-videos");
const SAFE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toResponseBody(stream: Readable): BodyInit {
  // Node and DOM ship structurally equivalent ReadableStream declarations,
  // but TypeScript treats them as distinct types in this Next.js project.
  return Readable.toWeb(stream) as unknown as BodyInit;
}

interface ByteRange {
  start: number;
  end: number;
}

function parseRange(rangeHeader: string, size: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;
  const [, startRaw = "", endRaw = ""] = match;
  if (startRaw === "" && endRaw === "") return null;

  if (startRaw === "") {
    const suffixLength = Number.parseInt(endRaw, 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  const start = Number.parseInt(startRaw, 10);
  const requestedEnd = endRaw === "" ? size - 1 : Number.parseInt(endRaw, 10);
  if (!Number.isFinite(start) || !Number.isFinite(requestedEnd) || start >= size) {
    return null;
  }
  const end = Math.min(requestedEnd, size - 1);
  if (end < start) return null;
  return { start, end };
}

/**
 * Streams the repository-bundled MP4 for a catalog exercise. Returns null when
 * the slug is unsafe or no mirrored asset exists, allowing the caller to fall
 * back to the original Drive source.
 */
export async function serveBundledExerciseVideo(
  slug: string | null,
  rangeHeader: string | null,
): Promise<Response | null> {
  if (!slug || !SAFE_SLUG_PATTERN.test(slug)) return null;
  const filePath = resolve(VIDEO_ROOT, `${slug}.mp4`);
  if (!filePath.startsWith(`${VIDEO_ROOT}${sep}`)) return null;

  let size: number;
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return null;
    size = fileStat.size;
  } catch {
    return null;
  }

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    "Content-Type": "video/mp4",
    "Cross-Origin-Resource-Policy": "same-origin",
  });

  if (rangeHeader) {
    const range = parseRange(rangeHeader, size);
    if (!range) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    const length = range.end - range.start + 1;
    headers.set("Content-Length", String(length));
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    const stream = createReadStream(filePath, range);
    return new Response(toResponseBody(stream), { status: 206, headers });
  }

  headers.set("Content-Length", String(size));
  const stream = createReadStream(filePath);
  return new Response(toResponseBody(stream), { status: 200, headers });
}
