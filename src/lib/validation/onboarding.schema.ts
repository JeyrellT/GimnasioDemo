// =============================================================================
// FORJA — Onboarding Zod validation schemas
// Owner: backend-api.
// =============================================================================

import { z } from "zod";
import {
  emailSchema,
  idSchema,
  isoDateSchema,
  weightKgSchema,
  heightCmSchema,
  circumferenceCmSchema,
  bodyFatPctSchema,
  crcAmountSchema,
} from "./shared.schema";

// ── Enums ─────────────────────────────────────────────────────────────────────

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_SAY"]);

const goalEnum = z.enum([
  "FAT_LOSS",
  "MUSCLE_GAIN",
  "MAINTENANCE",
  "PERFORMANCE",
  "GENERAL_HEALTH",
]);

const parqStatusEnum = z.enum(["NOT_COMPLETED", "GREEN", "REVIEW", "RED"]);

const onboardingModeEnum = z.enum(["TRAINER_SIDE", "INVITE"]);

// ── Step schemas ──────────────────────────────────────────────────────────────

export const step1Schema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: emailSchema,
  phone: z.string().trim().max(30).optional(),
  dateOfBirth: isoDateSchema,
  gender: genderEnum,
  address: z.string().trim().max(200).optional(),
  locationCity: z.string().trim().max(100).optional(),
});

export type Step1Input = z.infer<typeof step1Schema>;

export const cedulaExtractionSchema = z.object({
  fullName: z.string().trim().max(150).optional(),
  idNumber: z.string().trim().max(20).optional(),
  dateOfBirth: isoDateSchema.optional(),
  gender: genderEnum.optional(),
  approved: z.boolean(),
});

export const step2Schema = z.object({
  cedulaImageKey: z.string().max(500).optional(),
  extracted: cedulaExtractionSchema.optional(),
  skipped: z.boolean().optional(),
});

export type Step2Input = z.infer<typeof step2Schema>;

export const step3Schema = z.object({
  workoutPhotoKeys: z.array(z.string().max(500)).max(3),
  skipped: z.boolean().optional(),
});

export type Step3Input = z.infer<typeof step3Schema>;

export const step4Schema = z.object({
  goal: goalEnum,
  goalNotes: z.string().trim().max(1000).optional(),
  parqAnswers: z.record(z.string(), z.enum(["yes", "no"])),
  parqStatus: parqStatusEnum,
  trainingDaysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
  hasInjuries: z.boolean().optional(),
  injuryNotes: z.string().trim().max(1000).optional(),
  takesMedication: z.boolean().optional(),
  medicationNotes: z.string().trim().max(1000).optional(),
});

export type Step4Input = z.infer<typeof step4Schema>;

export const step5Schema = z.object({
  heightCm: heightCmSchema,
  weightKg: weightKgSchema,
  bodyFatPct: bodyFatPctSchema.optional(),
  muscleMassKg: z.coerce.number().min(1).max(200).optional(),
  waistCm: circumferenceCmSchema.optional(),
  hipCm: circumferenceCmSchema.optional(),
});

export type Step5Input = z.infer<typeof step5Schema>;

export const step6Schema = z.object({
  frontPhotoKey: z.string().max(500).optional(),
  sidePhotoKey: z.string().max(500).optional(),
  backPhotoKey: z.string().max(500).optional(),
  skipped: z.boolean().optional(),
});

export type Step6Input = z.infer<typeof step6Schema>;

export const step7Schema = z.object({
  monthlyPriceCRC: crcAmountSchema.refine((v) => v > 0, "El precio debe ser mayor a 0"),
  routineTemplateId: idSchema.optional(),
  notes: z.string().trim().max(500).optional(),
});

export type Step7Input = z.infer<typeof step7Schema>;

export const step8Schema = z
  .object({
    consentTerms: z.literal(true, {
      errorMap: () => ({ message: "Debés aceptar los términos y condiciones" }),
    }),
    consentHealthData: z.literal(true, {
      errorMap: () => ({ message: "Debés autorizar el uso de datos de salud" }),
    }),
    consentAiProcessing: z.boolean(),
    consentMarketing: z.boolean().optional(),
  });

export type Step8Input = z.infer<typeof step8Schema>;

// ── Step discriminator ────────────────────────────────────────────────────────

/**
 * Returns the Zod schema for a given step number (1-8).
 * Throws if the step number is out of range.
 */
export function getStepSchema(step: number): z.ZodTypeAny {
  const schemas: Record<number, z.ZodTypeAny> = {
    1: step1Schema,
    2: step2Schema,
    3: step3Schema,
    4: step4Schema,
    5: step5Schema,
    6: step6Schema,
    7: step7Schema,
    8: step8Schema,
  };
  const schema = schemas[step];
  if (!schema) {
    throw new Error(`Paso de onboarding inválido: ${step}`);
  }
  return schema;
}

// ── Mode ──────────────────────────────────────────────────────────────────────

export { onboardingModeEnum };
