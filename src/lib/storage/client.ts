// =============================================================================
// VIZION — S3 / R2 / MinIO client
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
import { env } from "@/env";

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

/**
 * Single S3Client instance. In dev, R2_ENDPOINT points to MinIO
 * (http://localhost:9000) and forcePathStyle must be true.
 * In prod, R2_ENDPOINT is the R2 account endpoint and forcePathStyle = false.
 */
export const s3 = new S3Client({
  endpoint: env.R2_ENDPOINT,
  region: "auto", // R2 uses "auto", MinIO accepts any string
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: isDev, // Required for MinIO; R2 uses virtual-hosted style
});
