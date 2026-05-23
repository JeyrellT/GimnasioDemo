// =============================================================================
// BLACKLINE FITNESS — S3 / R2 / MinIO client
// Owner: backend-api.
//
// Uses @aws-sdk/client-s3 (S3-compatible API).
// - Development: MinIO local (docker-compose). forcePathStyle = true.
// - Production: Cloudflare R2. forcePathStyle = false.
//
// Two logical buckets:
//   PHOTOS    — progress photos, cédula OCR temp images, scale images
//   DOCUMENTS — trainer licenses, signed invoices, LPDP exports
// =============================================================================

import { S3Client } from "@aws-sdk/client-s3";
import { serverEnv as env } from "@/server/env";

// ── Bucket type enum ─────────────────────────────────────────────────────────

export enum BucketType {
  PHOTOS = "PHOTOS",
  DOCUMENTS = "DOCUMENTS",
}

/** Map BucketType → actual bucket name from env. */
export function resolveBucketName(bucket: BucketType): string {
  return bucket === BucketType.PHOTOS
    ? env.R2_BUCKET_PHOTOS
    : env.R2_BUCKET_DOCUMENTS;
}

// ── S3 client singleton ───────────────────────────────────────────────────────

const isDev = env.NODE_ENV !== "production";

let _s3: S3Client | null = null;

/**
 * Lazy S3Client getter. Throws a clear error if R2 credentials are missing
 * so the failure surfaces on the first upload attempt instead of at boot
 * (boot must succeed so the rest of the app keeps working when storage is off).
 */
function getS3(): S3Client {
  if (_s3) return _s3;
  const endpoint = env.R2_ENDPOINT;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Storage no configurado: faltan R2_ENDPOINT, R2_ACCESS_KEY_ID o R2_SECRET_ACCESS_KEY en el entorno.",
    );
  }
  _s3 = new S3Client({
    endpoint,
    region: "auto", // R2 uses "auto", MinIO accepts any string
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: isDev, // Required for MinIO; R2 uses virtual-hosted style
  });
  return _s3;
}

/**
 * Proxy that lazily resolves the underlying S3Client on first method access.
 * Keeps the public API (`s3.send(...)`) unchanged while deferring credential
 * validation until storage is actually used.
 */
export const s3: S3Client = new Proxy({} as S3Client, {
  get(_target, prop, _receiver) {
    const client = getS3();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
