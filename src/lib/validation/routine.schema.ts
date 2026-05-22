// =============================================================================
// BLACKLINE FITNESS — Routine validation schemas
// Owner: backend-api.
// =============================================================================

import { z } from "zod";
import {
  idSchema,
  setsSchema,
  repsSchema,
  rpeSchema,
  restSecondsSchema,
  longTextSchema,
  isoDateSchema,
} from "./shared.schema";

// ── Create / update template ──────────────────────────────────────────────────

export const createRoutineSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  description: z.string().trim().max(1000).optional(),
  goal: z.string().min(1, "Seleccioná un objetivo para la rutina"),
  splitDays: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1 día")
    .max(6, "Máximo 6 días por semana"),
  durationWeeks: z.coerce
    .number()
    .int()
    .min(1)
    .max(52)
    .default(8),
});

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;

export const updateRoutineSchema = createRoutineSchema.partial().extend({
  routineId: idSchema,
});

export type UpdateRoutineInput = z.infer<typeof updateRoutineSchema>;

// ── Routine day ───────────────────────────────────────────────────────────────

export const addRoutineDaySchema = z.object({
  routineId: idSchema,
  dayIndex: z.coerce.number().int().min(0).max(5),
  name: z.string().trim().min(1, "El nombre del día es requerido").max(50),
  description: z.string().trim().max(500).optional(),
});

export type AddRoutineDayInput = z.infer<typeof addRoutineDaySchema>;

export const updateRoutineDaySchema = z.object({
  routineDayId: idSchema,
  name: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(500).optional(),
});

export type UpdateRoutineDayInput = z.infer<typeof updateRoutineDaySchema>;

// ── Exercise in a day ─────────────────────────────────────────────────────────

const addExerciseToDayBaseSchema = z.object({
  routineDayId: idSchema,
  exerciseId: idSchema,
  targetSets: setsSchema,
  targetRepsMin: repsSchema,
  targetRepsMax: repsSchema,
  targetRpe: rpeSchema.optional(),
  restSeconds: restSecondsSchema.default(90),
  tempo: z
    .string()
    .regex(/^\d-\d-\d(-\d)?$/, "Tempo inválido. Formato: 3-0-1 o 3-0-1-0")
    .optional(),
  supersetGroup: z.coerce.number().int().min(1).max(10).optional(),
  notes: longTextSchema(500),
});

export const addExerciseToDaySchema = addExerciseToDayBaseSchema.refine(
  (d) => d.targetRepsMin <= d.targetRepsMax,
  {
    message: "El mínimo de reps no puede ser mayor que el máximo",
    path: ["targetRepsMin"],
  },
);

export type AddExerciseToDayInput = z.infer<typeof addExerciseToDaySchema>;

export const updateExerciseInDaySchema = addExerciseToDayBaseSchema.partial().extend({
  routineExerciseId: idSchema,
});

export type UpdateExerciseInDayInput = z.infer<typeof updateExerciseInDaySchema>;

// ── Reorder exercises ─────────────────────────────────────────────────────────

export const reorderExercisesSchema = z.object({
  routineDayId: idSchema,
  /** Ordered list of RoutineExercise IDs in the desired new order. */
  orderedIds: z.array(idSchema).min(1, "Debés enviar al menos un ejercicio"),
});

export type ReorderExercisesInput = z.infer<typeof reorderExercisesSchema>;

// ── Assign routine to client ──────────────────────────────────────────────────

export const assignRoutineSchema = z.object({
  clientId: idSchema,
  routineTemplateId: idSchema,
  startsOn: isoDateSchema,
  // `""` from empty <input type="date"> is treated as undefined.
  endsOn: z.preprocess((v) => (v === "" ? undefined : v), isoDateSchema.optional()),
  trainerNotes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(2000).optional(),
  ),
}).refine(
  (d) => {
    if (!d.endsOn) return true;
    return new Date(d.endsOn) > new Date(d.startsOn);
  },
  {
    message: "La fecha de fin debe ser posterior a la de inicio",
    path: ["endsOn"],
  },
);

export type AssignRoutineInput = z.infer<typeof assignRoutineSchema>;

// ── Routine snapshot — Zod validates the JSON before every DB insert ──────────

const snapshotExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  nameEs: z.string().min(1),
  order: z.number().int().min(0),
  targetSets: z.number().int().min(1),
  targetRepsMin: z.number().int().min(1),
  targetRepsMax: z.number().int().min(1),
  targetRpe: z.number().nullable(),
  restSeconds: z.number().int().min(0),
  tempo: z.string().nullable(),
  supersetGroup: z.number().int().nullable(),
  notes: z.string().nullable(),
  // Bug #3: fields built by buildSnapshot() and stored in RoutineSnapshotExercise
  slug: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  gifUrl: z.string().nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
  nameEn: z.string().nullable().optional(),
});

const snapshotDaySchema = z.object({
  dayIndex: z.number().int().min(0).max(5),
  name: z.string().min(1),
  exercises: z.array(snapshotExerciseSchema),
});

export const assignedRoutineSnapshotSchema = z.object({
  templateId: z.string().min(1),
  templateName: z.string().min(1),
  goal: z.string().min(1),
  splitDays: z.number().int().min(1).max(6),
  durationWeeks: z.number().int().min(1),
  days: z.array(snapshotDaySchema),
  snapshotAt: z.string().datetime(),
});

export type AssignedRoutineSnapshotInput = z.infer<typeof assignedRoutineSnapshotSchema>;

// ── Comment ───────────────────────────────────────────────────────────────────

export const addRoutineCommentSchema = z.object({
  assignedRoutineId: idSchema,
  body: z.string().trim().min(1, "El comentario no puede estar vacío").max(2000),
});

export type AddRoutineCommentInput = z.infer<typeof addRoutineCommentSchema>;
