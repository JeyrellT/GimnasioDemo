// =============================================================================
// BLACKLINE FITNESS — Client-side image compression
// Owner: frontend-react.
//
// Resizea + re-encodea fotos antes de mandarlas al asistente IA o de
// persistirlas en IndexedDB. Razón doble:
//
//   1. Tokens — cada imagen en Gemini cuesta ~258 tokens base, más si la
//      resolución es alta. Una foto de iPhone (12MP, ~4MB) post-resize a
//      1500px queda en ~200-400KB y se procesa más rápido.
//   2. Almacenamiento — IDB tiene cuota generosa pero acumular 4-8 fotos
//      sin procesar por turno × N turnos llena el quota rápido.
//
// Política:
//   - JPEG / WebP / HEIC / HEIF → re-encode como JPEG q0.85.
//   - PNG → mantener PNG (preserva alpha si la tiene; el coach podría
//     subir un screenshot con fondo transparente).
//   - Si la imagen ya es ≤ MAX_DIMENSION en ambos lados y pesa < SKIP_BYTES,
//     se devuelve sin tocar — evita perder calidad innecesariamente.
//
// Limitaciones:
//   - HEIC/HEIF en Safari sí se decodifica vía `createImageBitmap`. En
//     Chrome/Firefox falla — en ese caso devolvemos el archivo original
//     sin comprimir (Gemini igual lo acepta).
// =============================================================================

"use client";

const MAX_DIMENSION = 1500; // px — sufficient for vision; Gemini downscales internally beyond this.
const JPEG_QUALITY = 0.85;
const SKIP_BYTES = 500 * 1024; // 500KB — below this, compression isn't worth the cycles.

export interface CompressedImage {
  /** Base64 sin prefix `data:`. */
  data: string;
  /** Mime de salida (puede ser distinto al de entrada). */
  mimeType: string;
  /** Bytes del payload binario (no del string base64). */
  sizeBytes: number;
  /** True si efectivamente comprimimos; false si devolvimos el original. */
  compressed: boolean;
}

/**
 * Comprime una imagen para el asistente. Devuelve siempre un payload utilizable
 * — si falla la compresión, cae al original.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  // Skip cheap cases: already small + reasonable dimensions.
  if (file.size <= SKIP_BYTES) {
    const data = await fileToBase64(file);
    return {
      data,
      mimeType: file.type,
      sizeBytes: file.size,
      compressed: false,
    };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const longSide = Math.max(width, height);

    // Already within budget — only re-encode if it'd help token cost.
    if (longSide <= MAX_DIMENSION && file.size <= SKIP_BYTES * 2) {
      bitmap.close();
      const data = await fileToBase64(file);
      return {
        data,
        mimeType: file.type,
        sizeBytes: file.size,
        compressed: false,
      };
    }

    const scale = longSide > MAX_DIMENSION ? MAX_DIMENSION / longSide : 1;
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      const data = await fileToBase64(file);
      return {
        data,
        mimeType: file.type,
        sizeBytes: file.size,
        compressed: false,
      };
    }

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const outMime = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outMime, JPEG_QUALITY),
    );

    if (!blob) {
      const data = await fileToBase64(file);
      return {
        data,
        mimeType: file.type,
        sizeBytes: file.size,
        compressed: false,
      };
    }

    const data = await blobToBase64(blob);
    return {
      data,
      mimeType: outMime,
      sizeBytes: blob.size,
      compressed: true,
    };
  } catch {
    // createImageBitmap fails on unsupported formats (HEIC in non-Safari).
    // Fallback: pass through.
    const data = await fileToBase64(file);
    return {
      data,
      mimeType: file.type,
      sizeBytes: file.size,
      compressed: false,
    };
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function fileToBase64(file: File): Promise<string> {
  return blobToBase64(file);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("FileReader did not return a string."));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to extract base64."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}
