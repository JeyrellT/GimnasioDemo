"use server";
// =============================================================================
// BLACKLINE FITNESS — Metrics & Progress Photos server actions
// Owner: backend-api.
//
// All functions are wrapped in tryCatch() so the caller always receives
// Result<T, AppError> — never raw throws.
// =============================================================================

import { prisma, Prisma } from "@/server/db";
import { requireUser, requireTrainer, assertOwnsClient } from "@/server/guards";
import { ok, err, tryCatch } from "@/lib/result";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";
import { logInfo, logError } from "@/lib/logger";
import { MAX_PHOTO_SIZE_BYTES } from "@/lib/consts";
import {
  generateStorageKey,
  getSignedUploadUrl,
  BucketType,
} from "@/lib/storage/upload";
import { calculateBmi } from "@/lib/calc/bmi";
import type { ActionResult } from "@/types/api";
import type { BodyMetric, ProgressPhoto } from "@prisma/client";
import type {
  RecordBodyMetricResult,
  UploadProgressPhotoInitResult,
} from "@/types/api";
import type { ProgressPhotoView, BodyMetricSource } from "@prisma/client";

// =============================================================================
// Helper types
// =============================================================================

export interface ProgressPhotoItem {
  id: string;
  clientUserId: string;
  takenAt: Date;
  view: ProgressPhotoView;
  storageKey: string;
  thumbnailKey: string | null;
  bodyMetricId: string | null;
}

// =============================================================================
// Internal audit helper
// =============================================================================

async function writeAuditLog(
  actorUserId: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        action: "ACCESS",
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    logError(e, { fn: "metrics.writeAuditLog", entityType, entityId });
  }
}

// =============================================================================
// recordBodyMetric
// Client records own metrics; trainer can record on behalf of a client.
// =============================================================================

export interface RecordBodyMetricInput {
  clientUserId?: string;
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  waistCm?: number;
  hipCm?: number;
  neckCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  // Extended bilateral circumferences (2026-05 — full OCR coverage)
  shoulderLeftCm?: number;
  shoulderRightCm?: number;
  abdomenCm?: number;
  gluteLeftCm?: number;
  gluteRightCm?: number;
  bicepLeftCm?: number;
  bicepRightCm?: number;
  forearmLeftCm?: number;
  forearmRightCm?: number;
  thighLeftCm?: number;
  thighRightCm?: number;
  hamstringLeftCm?: number;
  hamstringRightCm?: number;
  calfLeftCm?: number;
  calfRightCm?: number;
  visceralFat?: number;
  basalMetabolicRate?: number;
  source?: BodyMetricSource;
  notes?: string;
  recordedAt?: string;
}

export async function recordBodyMetric(
  input: RecordBodyMetricInput,
): Promise<ActionResult<RecordBodyMetricResult>> {
  return tryCatch(async () => {
    const actor = await requireUser();

    // Determine target client
    const targetClientId =
      input.clientUserId && input.clientUserId.trim() !== ""
        ? input.clientUserId.trim()
        : actor.id;

    // If recording for someone else, caller must be a trainer with ownership
    if (targetClientId !== actor.id) {
      if (actor.role !== "TRAINER") {
        throw new ForbiddenError(
          "NOT_TRAINER",
          "Solo un entrenador puede registrar métricas para otro usuario.",
        );
      }
      await assertOwnsClient(actor.id, targetClientId);
    }

    const weightKg = input.weightKg;
    const bodyFatPct = input.bodyFatPct;
    const muscleMassKg = input.muscleMassKg;
    const waistCm = input.waistCm;
    const hipCm = input.hipCm;
    const neckCm = input.neckCm;
    const chestCm = input.chestCm;
    const armCm = input.armCm;
    const thighCm = input.thighCm;

    const source: BodyMetricSource = input.source ?? "MANUAL";
    const notesStr = input.notes?.trim() || null;

    // Create the BodyMetric row
    const metric = await prisma.bodyMetric.create({
      data: {
        clientUserId: targetClientId,
        weightKg: weightKg !== undefined ? weightKg : undefined,
        bodyFatPct: bodyFatPct !== undefined ? bodyFatPct : undefined,
        muscleMassKg: muscleMassKg !== undefined ? muscleMassKg : undefined,
        waistCm: waistCm !== undefined ? waistCm : undefined,
        hipCm: hipCm !== undefined ? hipCm : undefined,
        neckCm: neckCm !== undefined ? neckCm : undefined,
        chestCm: chestCm !== undefined ? chestCm : undefined,
        armCm: armCm !== undefined ? armCm : undefined,
        thighCm: thighCm !== undefined ? thighCm : undefined,
        shoulderLeftCm: input.shoulderLeftCm !== undefined ? input.shoulderLeftCm : undefined,
        shoulderRightCm: input.shoulderRightCm !== undefined ? input.shoulderRightCm : undefined,
        abdomenCm: input.abdomenCm !== undefined ? input.abdomenCm : undefined,
        gluteLeftCm: input.gluteLeftCm !== undefined ? input.gluteLeftCm : undefined,
        gluteRightCm: input.gluteRightCm !== undefined ? input.gluteRightCm : undefined,
        bicepLeftCm: input.bicepLeftCm !== undefined ? input.bicepLeftCm : undefined,
        bicepRightCm: input.bicepRightCm !== undefined ? input.bicepRightCm : undefined,
        forearmLeftCm: input.forearmLeftCm !== undefined ? input.forearmLeftCm : undefined,
        forearmRightCm: input.forearmRightCm !== undefined ? input.forearmRightCm : undefined,
        thighLeftCm: input.thighLeftCm !== undefined ? input.thighLeftCm : undefined,
        thighRightCm: input.thighRightCm !== undefined ? input.thighRightCm : undefined,
        hamstringLeftCm: input.hamstringLeftCm !== undefined ? input.hamstringLeftCm : undefined,
        hamstringRightCm: input.hamstringRightCm !== undefined ? input.hamstringRightCm : undefined,
        calfLeftCm: input.calfLeftCm !== undefined ? input.calfLeftCm : undefined,
        calfRightCm: input.calfRightCm !== undefined ? input.calfRightCm : undefined,
        visceralFat: input.visceralFat !== undefined ? input.visceralFat : undefined,
        basalMetabolicRate: input.basalMetabolicRate !== undefined ? input.basalMetabolicRate : undefined,
        source,
        notes: notesStr,
      },
      select: { id: true },
    });

    // Update ClientProfile.weightKg and lastWeightUpdate if weight was provided
    if (weightKg !== undefined) {
      await prisma.clientProfile.upsert({
        where: { userId: targetClientId },
        create: {
          userId: targetClientId,
          weightKg,
          lastWeightUpdate: new Date(),
        },
        update: {
          weightKg,
          lastWeightUpdate: new Date(),
        },
      });
    }

    // Calculate BMI if we have height on the profile
    let bmi: number | null = null;
    if (weightKg !== undefined) {
      const profile = await prisma.clientProfile.findUnique({
        where: { userId: targetClientId },
        select: { heightCm: true },
      });
      const heightCm = profile?.heightCm ? Number(profile.heightCm) : null;
      if (heightCm && heightCm > 0) {
        try {
          bmi = calculateBmi({ weightKg, heightCm });
        } catch {
          // Non-fatal: log and continue without BMI
          logError("BMI calculation failed", { metricId: metric.id });
        }
      }
    }

    await writeAuditLog(actor.id, "BodyMetric", metric.id, {
      targetClientId,
      source,
    });

    logInfo("Body metric recorded", {
      actorId: actor.id,
      metricId: metric.id,
      targetClientId,
    });

    return { metricId: metric.id, bmi };
  });
}

// =============================================================================
// listMetrics
// =============================================================================

export async function listMetrics(
  clientUserId: string,
  page = 1,
  limit = 20,
): Promise<ActionResult<{ metrics: BodyMetric[]; total: number }>> {
  return tryCatch(async () => {
    const actor = await requireUser();

    // Access control: self or trainer who owns the client
    if (actor.id !== clientUserId) {
      if (actor.role !== "TRAINER") {
        throw new ForbiddenError(
          "FORBIDDEN",
          "No tenés acceso a las métricas de este cliente.",
        );
      }
      await assertOwnsClient(actor.id, clientUserId);
    }

    const skip = (page - 1) * limit;

    const [metrics, total] = await prisma.$transaction([
      prisma.bodyMetric.findMany({
        where: { clientUserId },
        orderBy: { recordedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.bodyMetric.count({ where: { clientUserId } }),
    ]);

    return { metrics, total };
  });
}

// =============================================================================
// initProgressPhotoUpload
// Creates the DB record and returns presigned POST fields for browser-direct upload.
// =============================================================================

export async function initProgressPhotoUpload(
  formData: FormData,
): Promise<ActionResult<UploadProgressPhotoInitResult>> {
  return tryCatch(async () => {
    const actor = await requireUser();

    const rawView = formData.get("view");
    const validViews: ProgressPhotoView[] = [
      "FRONT",
      "SIDE_LEFT",
      "SIDE_RIGHT",
      "BACK",
    ];
    if (!validViews.includes(rawView as ProgressPhotoView)) {
      throw new ValidationError(
        "INVALID_VIEW",
        "La vista de la foto no es válida. Usá: FRONT, SIDE_LEFT, SIDE_RIGHT o BACK.",
      );
    }
    const view = rawView as ProgressPhotoView;

    const rawBodyMetricId = formData.get("bodyMetricId");
    const bodyMetricId =
      typeof rawBodyMetricId === "string" && rawBodyMetricId.trim() !== ""
        ? rawBodyMetricId.trim()
        : null;

    // If a bodyMetricId was provided, confirm it belongs to this user
    if (bodyMetricId) {
      const metric = await prisma.bodyMetric.findUnique({
        where: { id: bodyMetricId },
        select: { clientUserId: true },
      });
      if (!metric || metric.clientUserId !== actor.id) {
        throw new ForbiddenError(
          "METRIC_NOT_OWNED",
          "No tenés acceso a esa medición.",
        );
      }
    }

    const storageKey = generateStorageKey(
      "progress-photos",
      actor.id,
      "jpg",
    );

    // Generate presigned POST for browser-direct upload
    const { url, fields } = await getSignedUploadUrl({
      bucket: BucketType.PHOTOS,
      key: storageKey,
      contentType: "image/jpeg",
      maxSizeBytes: MAX_PHOTO_SIZE_BYTES,
    });

    // Create the ProgressPhoto row (status: pending confirmation)
    const photo = await prisma.progressPhoto.create({
      data: {
        clientUserId: actor.id,
        view,
        storageKey,
        bodyMetricId,
      },
      select: { id: true },
    });

    logInfo("Progress photo upload initiated", {
      actorId: actor.id,
      photoId: photo.id,
    });

    return {
      photoId: photo.id,
      presignedUrl: url,
      presignedFields: fields,
    };
  });
}

// =============================================================================
// confirmProgressPhoto
// Called by the client after the browser upload completes.
// =============================================================================

export async function confirmProgressPhoto(
  photoId: string,
): Promise<ActionResult<{ confirmed: true }>> {
  return tryCatch(async () => {
    const actor = await requireUser();

    const photo = await prisma.progressPhoto.findUnique({
      where: { id: photoId },
      select: { id: true, clientUserId: true },
    });

    if (!photo) {
      throw new NotFoundError("PHOTO_NOT_FOUND", "Foto no encontrada.");
    }

    if (photo.clientUserId !== actor.id) {
      throw new ForbiddenError("PHOTO_NOT_OWNED", "No tenés acceso a esta foto.");
    }

    // Touch updatedAt — in the future this could flip a `confirmed` boolean if we add one.
    await prisma.progressPhoto.update({
      where: { id: photoId },
      data: { updatedAt: new Date() },
    });

    logInfo("Progress photo confirmed", { actorId: actor.id, photoId });

    return { confirmed: true };
  });
}

// =============================================================================
// deleteProgressPhoto
// Soft-deletes the DB record; storage cleanup runs via a background job.
// =============================================================================

export async function deleteProgressPhoto(
  photoId: string,
): Promise<ActionResult<{ deleted: true }>> {
  return tryCatch(async () => {
    const actor = await requireUser();

    const photo = await prisma.progressPhoto.findUnique({
      where: { id: photoId },
      select: { id: true, clientUserId: true },
    });

    if (!photo) {
      throw new NotFoundError("PHOTO_NOT_FOUND", "Foto no encontrada.");
    }

    // Only owner or a trainer owning the client may delete
    if (photo.clientUserId !== actor.id) {
      if (actor.role !== "TRAINER") {
        throw new ForbiddenError(
          "PHOTO_NOT_OWNED",
          "No tenés acceso a esta foto.",
        );
      }
      await assertOwnsClient(actor.id, photo.clientUserId);
    }

    await prisma.progressPhoto.update({
      where: { id: photoId },
      data: { deletedAt: new Date() },
    });

    await writeAuditLog(actor.id, "ProgressPhoto", photoId, { action: "DELETE" });

    logInfo("Progress photo deleted", { actorId: actor.id, photoId });

    return { deleted: true };
  });
}

// =============================================================================
// listProgressPhotos
// =============================================================================

export async function listProgressPhotos(
  clientUserId: string,
): Promise<ActionResult<{ photos: ProgressPhotoItem[] }>> {
  return tryCatch(async () => {
    const actor = await requireUser();

    if (actor.id !== clientUserId) {
      if (actor.role !== "TRAINER") {
        throw new ForbiddenError(
          "FORBIDDEN",
          "No tenés acceso a las fotos de este cliente.",
        );
      }
      await assertOwnsClient(actor.id, clientUserId);
    }

    const rows = await prisma.progressPhoto.findMany({
      where: { clientUserId },
      orderBy: { takenAt: "desc" },
      select: {
        id: true,
        clientUserId: true,
        takenAt: true,
        view: true,
        storageKey: true,
        thumbnailKey: true,
        bodyMetricId: true,
      },
    });

    return { photos: rows };
  });
}

// =============================================================================
// getLatestMetric
// Returns the most recent BodyMetric for a client.
// =============================================================================

export async function getLatestMetric(
  clientUserId: string,
): Promise<ActionResult<BodyMetric | null>> {
  return tryCatch(async () => {
    const actor = await requireUser();

    // Access control: self or trainer who owns the client
    if (actor.id !== clientUserId) {
      if (actor.role !== "TRAINER") {
        throw new ForbiddenError(
          "FORBIDDEN",
          "No tenés acceso a las métricas de este cliente.",
        );
      }
      await assertOwnsClient(actor.id, clientUserId);
    }

    const latest = await prisma.bodyMetric.findFirst({
      where: { clientUserId },
      orderBy: { recordedAt: "desc" },
    });

    return latest;
  });
}
