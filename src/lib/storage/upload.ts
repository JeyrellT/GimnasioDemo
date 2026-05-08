// =============================================================================
// VIZION — Storage upload helpers
// Owner: backend-api.
//
// All functions use the singleton s3 client from ./client.ts.
// Keys follow the pattern: <prefix>/<userId>/<uuid>.<ext>
// =============================================================================

import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";

import { s3, BucketType, resolveBucketName } from "./client";

export { BucketType } from "./client";
import { env } from "@/env";
import { PRESIGNED_URL_TTL_SEC } from "@/lib/consts";
import { ExternalServiceError } from "@/lib/errors";
import { logError } from "@/lib/logger";

// -----------------------------------------------------------------------------
// Key generation
// -----------------------------------------------------------------------------

/**
 * Build a deterministic storage key from a prefix, userId, and file extension.
 * Example: "photos/client_xyz/01jwbe_abc123.jpg"
 */
export function generateStorageKey(
  prefix: string,
  userId: string,
  ext: string,
): string {
  const clean = ext.replace(/^\./, "");
  return `${prefix}/${userId}/${createId()}.${clean}`;
}

// -----------------------------------------------------------------------------
// Put object
// -----------------------------------------------------------------------------

export interface UploadFileInput {
  bucket: BucketType;
  key: string;
  body: Buffer | Uint8Array | ReadableStream;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface UploadFileResult {
  key: string;
  url: string;
}

/**
 * Upload a file to the specified bucket.
 * Returns the key and the public URL (only useful if bucket has public access;
 * otherwise use getSignedReadUrl for private access).
 */
export async function uploadFile({
  bucket,
  key,
  body,
  contentType,
  metadata,
}: UploadFileInput): Promise<UploadFileResult> {
  const bucketName = resolveBucketName(bucket);

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
      }),
    );
  } catch (e) {
    logError(e, { action: "uploadFile", bucket, key });
    throw new ExternalServiceError(
      "S3_PUT_FAILED",
      "No se pudo subir el archivo. Intentá de nuevo.",
      e,
    );
  }

  const url = `${env.R2_PUBLIC_URL}/${key}`;
  return { key, url };
}

// -----------------------------------------------------------------------------
// Signed read URL
// -----------------------------------------------------------------------------

/**
 * Generate a signed URL for reading a private file.
 * Default TTL: 5 minutes (PRESIGNED_URL_TTL_SEC).
 */
export async function getSignedReadUrl(
  bucket: BucketType,
  key: string,
  ttlSec: number = PRESIGNED_URL_TTL_SEC,
): Promise<string> {
  const bucketName = resolveBucketName(bucket);

  try {
    return await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
      { expiresIn: ttlSec },
    );
  } catch (e) {
    logError(e, { action: "getSignedReadUrl", bucket, key });
    throw new ExternalServiceError(
      "S3_SIGN_FAILED",
      "No se pudo generar el enlace de descarga.",
      e,
    );
  }
}

// -----------------------------------------------------------------------------
// Presigned POST (browser-direct multipart upload)
// -----------------------------------------------------------------------------

export interface PresignedUploadInput {
  bucket: BucketType;
  key: string;
  contentType: string;
  ttlSec?: number;
  maxSizeBytes?: number;
}

export interface PresignedUploadResult {
  url: string;
  fields: Record<string, string>;
}

/**
 * Generate a presigned POST form for direct browser uploads.
 * The client POSTs the file and `fields` as a multipart/form-data to `url`.
 */
export async function getSignedUploadUrl({
  bucket,
  key,
  contentType,
  ttlSec = PRESIGNED_URL_TTL_SEC,
  maxSizeBytes = 10 * 1024 * 1024, // 10 MB default
}: PresignedUploadInput): Promise<PresignedUploadResult> {
  const bucketName = resolveBucketName(bucket);

  try {
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: bucketName,
      Key: key,
      Conditions: [
        ["content-length-range", 1, maxSizeBytes],
        ["eq", "$Content-Type", contentType],
      ],
      Fields: { "Content-Type": contentType },
      Expires: ttlSec,
    });

    return { url, fields };
  } catch (e) {
    logError(e, { action: "getSignedUploadUrl", bucket, key });
    throw new ExternalServiceError(
      "S3_PRESIGN_FAILED",
      "No se pudo preparar la subida del archivo.",
      e,
    );
  }
}

// -----------------------------------------------------------------------------
// Delete object
// -----------------------------------------------------------------------------

/**
 * Delete a file from storage. Non-fatal: logs error but does not throw,
 * so cleanup failures don't cascade into user-facing errors.
 * Callers that need to guarantee deletion MUST check the return value.
 */
export async function deleteFile(
  bucket: BucketType,
  key: string,
): Promise<void> {
  const bucketName = resolveBucketName(bucket);

  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: bucketName, Key: key }),
    );
  } catch (e) {
    logError(e, { action: "deleteFile", bucket, key });
    throw new ExternalServiceError(
      "S3_DELETE_FAILED",
      "No se pudo eliminar el archivo.",
      e,
    );
  }
}
