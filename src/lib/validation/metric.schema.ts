// =============================================================================
// VIZION — Body metric validation schemas
// Owner: backend-api.
// =============================================================================

import { z } from "zod";
import {
  idSchema,
  weightKgSchema,
  bodyFatPctSchema,
  circumferenceCmSchema,
  imageMimeSchema,
  longTextSchema,
} from "./shared.schema";

// ── Record body metric (manual or OCR) ───────────────────────────────────────

export const recordBodyMetricSchema = z
  .object({
    weightKg: weightKgSchema.optional(),
    bodyFatPct: bodyFatPctSchema.optional(),
    muscleMassKg: z.coerce.number().min(1).max(200).optional(),
    waistCm: circumferenceCmSchema.optional(),
    hipCm: circumferenceCmSchema.optional(),
    neckCm: circumferenceCmSchema.optional(),
    chestCm: circumferenceCmSchema.optional(),
    armCm: circumferenceCmSchema.optional(),
    thighCm: circumferenceCmSchema.optional(),
    recordedAt: z.coerce.date().optional(),
    source: z.enum(["MANUAL", "OCR_SCALE", "CONNECTED_DEVICE"]).default("MANUAL"),
    notes: longTextSchema(500),
    /** storageKey of the scale image if OCR was used */
    scaleImageKey: z.string().trim().optional(),
  })
  .refine(
    (d) =>
      d.weightKg !== undefined ||
      d.bodyFatPct !== undefined ||
      d.waistCm !== undefined ||
      d.hipCm !== undefined,
    {
      message:
        "Debés ingresar al menos una medición (peso, grasa, cintura o cadera)",
    },
  );

export type RecordBodyMetricInput = z.infer<typeof recordBodyMetricSchema>;

// ── Upload progress photo init ────────────────────────────────────────────────

export const uploadProgressPhotoInitSchema = z.object({
  view: z.enum(["FRONT", "SIDE_LEFT", "SIDE_RIGHT", "BACK"], {
    required_error: "Seleccioná la vista de la foto",
  }),
  contentType: imageMimeSchema,
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024, "Máximo 10 MB"),
  takenAt: z.coerce.date().optional(),
  bodyMetricId: idSchema.optional(),
});

export type UploadProgressPhotoInitInput = z.infer<
  typeof uploadProgressPhotoInitSchema
>;

// ── Confirm photo upload ──────────────────────────────────────────────────────

export const confirmProgressPhotoSchema = z.object({
  photoId: idSchema,
});

export type ConfirmProgressPhotoInput = z.infer<typeof confirmProgressPhotoSchema>;

// ── Get metrics history ───────────────────────────────────────────────────────

export const getMetricsHistorySchema = z.object({
  since: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type GetMetricsHistoryInput = z.infer<typeof getMetricsHistorySchema>;
