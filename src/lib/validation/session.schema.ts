// =============================================================================
// VIZION — Workout session validation schemas
// Owner: backend-api.
// =============================================================================

import { z } from "zod";
import {
  idSchema,
  weightKgSchema,
  repsSchema,
  rpeSchema,
  restSecondsSchema,
  longTextSchema,
} from "./shared.schema";

// ── Start session ─────────────────────────────────────────────────────────────

export const startSessionSchema = z.object({
  assignedRoutineId: idSchema.optional(),
  dayIndex: z.coerce.number().int().min(0).max(5).optional(),
  isFreeWorkout: z.boolean().default(false),
  bodyweightKg: weightKgSchema.optional(),
}).refine(
  (d) => d.isFreeWorkout || (d.assignedRoutineId !== undefined && d.dayIndex !== undefined),
  {
    message:
      "Para una sesión programada debés indicar la rutina asignada y el índice del día",
  },
);

export type StartSessionInput = z.infer<typeof startSessionSchema>;

// ── Record a set ──────────────────────────────────────────────────────────────

export const recordSetSchema = z.object({
  sessionId: idSchema,
  exerciseId: idSchema,
  setNumber: z.coerce.number().int().min(1).max(20),
  weightKg: weightKgSchema.optional(),
  reps: repsSchema.optional(),
  rpe: rpeSchema.optional(),
  restTakenSec: restSecondsSchema.optional(),
  isWarmup: z.boolean().default(false),
  failed: z.boolean().default(false),
  notes: z.string().trim().max(500).optional(),
});

export type RecordSetInput = z.infer<typeof recordSetSchema>;

// ── Free workout set (no session context yet) ─────────────────────────────────

export const freeWorkoutSetSchema = recordSetSchema.omit({ sessionId: true }).extend({
  sessionId: idSchema,
});

export type FreeWorkoutSetInput = z.infer<typeof freeWorkoutSetSchema>;

// ── Complete session ──────────────────────────────────────────────────────────

export const completeSessionSchema = z.object({
  sessionId: idSchema,
  totalDurationSec: z.coerce.number().int().min(0).max(7_200), // max 2 hrs
  subjectiveFatigue: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1")
    .max(10, "Máximo 10")
    .optional(),
  notes: longTextSchema(1000),
});

export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;

// ── Abort session ─────────────────────────────────────────────────────────────

export const abortSessionSchema = z.object({
  sessionId: idSchema,
  reason: z.string().trim().max(500).optional(),
});

export type AbortSessionInput = z.infer<typeof abortSessionSchema>;

// ── Get session history ───────────────────────────────────────────────────────

export const getSessionHistorySchema = z.object({
  since: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type GetSessionHistoryInput = z.infer<typeof getSessionHistorySchema>;
