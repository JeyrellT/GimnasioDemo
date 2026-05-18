// =============================================================================
// BLACKLINE FITNESS — Client profile validation schemas
// Owner: backend-api.
// =============================================================================

import { z } from "zod";
import {
  emailSchema,
  idSchema,
  weightKgSchema,
  heightCmSchema,
  circumferenceCmSchema,
  bodyFatPctSchema,
  longTextSchema,
  imageMimeSchema,
} from "./shared.schema";

// ── Invitation creation (trainer) ─────────────────────────────────────────────

export const createInvitationSchema = z.object({
  email: emailSchema,
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

// ── Onboarding — anthropometry ────────────────────────────────────────────────

export const anthropometrySchema = z
  .object({
    weightKg: weightKgSchema,
    heightCm: heightCmSchema,
    bodyFatPct: bodyFatPctSchema.optional(),
    muscleMassKg: z.coerce.number().min(1).max(200).optional(),
    waistCm: circumferenceCmSchema.optional(),
    hipCm: circumferenceCmSchema.optional(),
    neckCm: circumferenceCmSchema.optional(),
    chestCm: circumferenceCmSchema.optional(),
    armCm: circumferenceCmSchema.optional(),
    thighCm: circumferenceCmSchema.optional(),
    restingHrBpm: z.coerce.number().int().min(30).max(200).optional(),
    systolicBp: z.coerce.number().int().min(60).max(250).optional(),
    diastolicBp: z.coerce.number().int().min(40).max(150).optional(),
    notes: longTextSchema(500),
  })
  .refine(
    (d) =>
      d.systolicBp === undefined ||
      d.diastolicBp === undefined ||
      d.systolicBp > d.diastolicBp,
    {
      message: "La presión sistólica debe ser mayor que la diastólica",
      path: ["systolicBp"],
    },
  );

export type AnthropometryInput = z.infer<typeof anthropometrySchema>;

// ── Onboarding — goal ─────────────────────────────────────────────────────────

export const setGoalSchema = z.object({
  goal: z.enum(
    ["FAT_LOSS", "MUSCLE_GAIN", "MAINTENANCE", "PERFORMANCE", "GENERAL_HEALTH"],
    { required_error: "Seleccioná un objetivo" },
  ),
  goalNotes: z.string().trim().max(500).optional(),
});

export type SetGoalInput = z.infer<typeof setGoalSchema>;

// ── Onboarding — photo upload init ───────────────────────────────────────────

export const uploadProgressPhotoInitSchema = z.object({
  view: z.enum(["FRONT", "SIDE_LEFT", "SIDE_RIGHT", "BACK"], {
    required_error: "Seleccioná la vista de la foto",
  }),
  contentType: imageMimeSchema,
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024, "La foto no puede superar 10 MB"),
  takenAt: z.coerce.date().optional(),
});

export type UploadProgressPhotoInitInput = z.infer<
  typeof uploadProgressPhotoInitSchema
>;

// ── Profile update ─────────────────────────────────────────────────────────────

export const updateClientProfileSchema = z
  .object({
    weightKg: weightKgSchema.optional(),
    heightCm: heightCmSchema.optional(),
    goal: z
      .enum([
        "FAT_LOSS",
        "MUSCLE_GAIN",
        "MAINTENANCE",
        "PERFORMANCE",
        "GENERAL_HEALTH",
      ])
      .optional(),
    goalNotes: z.string().trim().max(500).optional(),
    locationCity: z.string().trim().max(100).optional(),
  })
  .strict();

export type UpdateClientProfileInput = z.infer<typeof updateClientProfileSchema>;

// ── Client list + filter ──────────────────────────────────────────────────────

export const listClientsSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "ENDED", "PENDING"]).optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListClientsInput = z.infer<typeof listClientsSchema>;

// ── Trainer notes update ──────────────────────────────────────────────────────

export const updateTrainerNotesSchema = z.object({
  clientId: idSchema,
  notes: z.string().trim().max(5000),
});

export type UpdateTrainerNotesInput = z.infer<typeof updateTrainerNotesSchema>;

// ── Client price update ───────────────────────────────────────────────────────

export const updateClientPriceSchema = z.object({
  clientId: idSchema,
  monthlyPriceCRC: z.coerce
    .number()
    .min(0, "El precio no puede ser negativo")
    .max(10_000_000, "Precio máximo excedido"),
});

export type UpdateClientPriceInput = z.infer<typeof updateClientPriceSchema>;
