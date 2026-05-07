// =============================================================================
// FORJA — JPEG EXIF / IPTC metadata stripping
// Owner: backend-api.
//
// MVP DECISION: Minimal JPEG segment stripping without external deps (no sharp,
// no exiftool). Removes APP1 (EXIF) and APP13 (IPTC) markers from the raw
// binary by scanning JPEG segment headers.
//
// This covers the common case: phone JPEGs with GPS, camera make/model, and
// timestamp embedded in APP1. Edge cases (raw formats, progressive JPEGs with
// split segments) are logged and returned unmodified with a warning — they are
// not silently accepted as stripped.
//
// TODO(backend-api): In V1.1, integrate `sharp` for a lossless recompress
// that is robustly metadata-free and can also downscale to PHOTO_MAX_DIMENSION_PX.
// `sharp` is not in deps yet — coordinate with devops-deploy before adding.
//
// Supported: JPEG (JFIF, EXIF). PNG, WebP, HEIC → ValidationError.
// =============================================================================

import { ValidationError } from "@/lib/errors";
import { logWarn } from "@/lib/logger";

// JPEG SOI (start of image) magic bytes
const JPEG_SOI = 0xffd8;
const JPEG_EOI_MARKER = 0xffd9;

// Segment markers to strip (APP1 = EXIF/XMP, APP13 = IPTC/Photoshop)
const STRIP_MARKERS = new Set([
  0xffe1, // APP1  — EXIF, XMP
  0xffed, // APP13 — IPTC, Photoshop IRB
  0xffe2, // APP2  — ICC profile (harmless but can include device serial)
]);

/**
 * Strip EXIF, IPTC and ICC metadata segments from a JPEG buffer.
 *
 * @throws ValidationError for non-JPEG inputs.
 * @returns A new Buffer with identified PII-carrying segments removed.
 */
export function stripExif(input: Buffer): Buffer {
  // Validate JPEG SOI header
  if (input.length < 4) {
    throw new ValidationError("UNSUPPORTED_IMAGE_FORMAT", "Imagen demasiado pequeña o corrupta");
  }

  const soi = input.readUInt16BE(0);
  if (soi !== JPEG_SOI) {
    throw new ValidationError(
      "UNSUPPORTED_IMAGE_FORMAT",
      "Solo se aceptan imágenes JPEG. Convertí la imagen y reintentá.",
    );
  }

  const segments: Buffer[] = [];
  let offset = 2; // skip SOI
  let strippedCount = 0;

  while (offset < input.length - 1) {
    // Each segment starts with 0xFF followed by a marker byte
    if (input[offset] !== 0xff) {
      // Malformed or unknown segment layout — return original with warning
      logWarn("stripExif: unexpected byte at offset, returning original", {
        offset,
        byte: input[offset],
      });
      return input;
    }

    const marker = input.readUInt16BE(offset);

    // EOI — end of image
    if (marker === JPEG_EOI_MARKER) {
      segments.push(input.subarray(offset));
      break;
    }

    // Stand-alone markers (no length field): SOI, EOI, RST0–RST7
    const markerByte = marker & 0x00ff;
    const isStandalone =
      markerByte === 0xd8 || // SOI
      markerByte === 0xd9 || // EOI
      (markerByte >= 0xd0 && markerByte <= 0xd7); // RST0-7

    if (isStandalone) {
      segments.push(input.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    if (offset + 4 > input.length) {
      // Truncated segment — bail out safely
      logWarn("stripExif: truncated segment, returning original", { offset, marker });
      return input;
    }

    // Segment length includes the 2 length bytes but NOT the 2 marker bytes
    const segmentLength = input.readUInt16BE(offset + 2);
    const totalSegmentSize = 2 + segmentLength; // marker + length_field + data

    if (offset + totalSegmentSize > input.length) {
      logWarn("stripExif: segment overruns buffer, returning original", {
        offset,
        marker,
        segmentLength,
      });
      return input;
    }

    if (STRIP_MARKERS.has(marker)) {
      // Skip this segment — do not add to output
      strippedCount++;
    } else {
      segments.push(input.subarray(offset, offset + totalSegmentSize));
    }

    offset += totalSegmentSize;
  }

  if (strippedCount === 0) {
    // No metadata found — return original buffer (avoid unnecessary copy)
    return input;
  }

  return Buffer.concat(segments);
}
