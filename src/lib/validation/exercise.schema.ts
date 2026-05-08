// =============================================================================
// VIZION — Exercise library validation schemas
// Owner: backend-api.
// =============================================================================

import { z } from "zod";
import { idSchema } from "./shared.schema";

// ── Search ────────────────────────────────────────────────────────────────────

export const searchExercisesSchema = z.object({
  query: z.string().trim().max(100).optional(),
  // Named `primaryMuscle` to match the Prisma field and the call sites in pages.
  primaryMuscle: z
    .enum([
      "CHEST",
      "BACK",
      "SHOULDERS",
      "BICEPS",
      "TRICEPS",
      "FOREARMS",
      "ABS",
      "OBLIQUES",
      "GLUTES",
      "QUADS",
      "HAMSTRINGS",
      "CALVES",
      "NECK",
      "FULL_BODY",
    ])
    .optional(),
  equipment: z
    .enum([
      "BODYWEIGHT",
      "BARBELL",
      "DUMBBELL",
      "KETTLEBELL",
      "MACHINE",
      "CABLE",
      "BAND",
      "OTHER",
    ])
    .optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SearchExercisesInput = z.infer<typeof searchExercisesSchema>;

// ── Create private exercise (trainer only) ────────────────────────────────────

export const createPrivateExerciseSchema = z.object({
  nameEs: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  nameEn: z.string().trim().max(100).optional(),
  instructionsEs: z.string().trim().min(10, "Describí el ejercicio con al menos 10 caracteres").max(3000),
  primaryMuscle: z.enum([
    "CHEST",
    "BACK",
    "SHOULDERS",
    "BICEPS",
    "TRICEPS",
    "FOREARMS",
    "ABS",
    "OBLIQUES",
    "GLUTES",
    "QUADS",
    "HAMSTRINGS",
    "CALVES",
    "NECK",
    "FULL_BODY",
  ]),
  secondaryMuscles: z
    .array(
      z.enum([
        "CHEST",
        "BACK",
        "SHOULDERS",
        "BICEPS",
        "TRICEPS",
        "FOREARMS",
        "ABS",
        "OBLIQUES",
        "GLUTES",
        "QUADS",
        "HAMSTRINGS",
        "CALVES",
        "NECK",
        "FULL_BODY",
      ]),
    )
    .max(5)
    .default([]),
  equipment: z.enum([
    "BODYWEIGHT",
    "BARBELL",
    "DUMBBELL",
    "KETTLEBELL",
    "MACHINE",
    "CABLE",
    "BAND",
    "OTHER",
  ]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  mediaUrl: z.string().url().optional(),
});

export type CreatePrivateExerciseInput = z.infer<typeof createPrivateExerciseSchema>;

// ── Get detail ────────────────────────────────────────────────────────────────

export const getExerciseDetailSchema = z.object({
  id: idSchema,
});

export type GetExerciseDetailInput = z.infer<typeof getExerciseDetailSchema>;

// ── Update exercise ───────────────────────────────────────────────────────────

export const updateExerciseSchema = z.object({
  id: idSchema,
  nameEs: z.string().trim().min(2, "Mínimo 2 caracteres").max(100).optional(),
  nameEn: z.string().trim().max(100).optional(),
  instructionsEs: z
    .string()
    .trim()
    .min(10, "Describí el ejercicio con al menos 10 caracteres")
    .max(3000)
    .optional(),
  primaryMuscle: z
    .enum([
      "CHEST",
      "BACK",
      "SHOULDERS",
      "BICEPS",
      "TRICEPS",
      "FOREARMS",
      "ABS",
      "OBLIQUES",
      "GLUTES",
      "QUADS",
      "HAMSTRINGS",
      "CALVES",
      "NECK",
      "FULL_BODY",
    ])
    .optional(),
  secondaryMuscles: z
    .array(
      z.enum([
        "CHEST",
        "BACK",
        "SHOULDERS",
        "BICEPS",
        "TRICEPS",
        "FOREARMS",
        "ABS",
        "OBLIQUES",
        "GLUTES",
        "QUADS",
        "HAMSTRINGS",
        "CALVES",
        "NECK",
        "FULL_BODY",
      ]),
    )
    .max(5)
    .optional(),
  equipment: z
    .enum([
      "BODYWEIGHT",
      "BARBELL",
      "DUMBBELL",
      "KETTLEBELL",
      "MACHINE",
      "CABLE",
      "BAND",
      "OTHER",
    ])
    .optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  // Media URL fields — accept "" and treat as null (clearing the field)
  thumbnailUrl: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().url().nullable().optional(),
  ),
  gifUrl: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().url().nullable().optional(),
  ),
  mediaUrl: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().url().nullable().optional(),
  ),
});

export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
