// =============================================================================
// BLACKLINE FITNESS — Medical Conditions validation schema
// Owner: backend-api.
//
// Defines Zod schemas for the MedicalCondition CRUD actions.
// Mirrors the MedicalConditionKind and ConditionSeverity enums from schema.prisma.
// =============================================================================

import { z } from "zod";

// ── Enum value arrays (single source of truth for Zod and TypeScript) ─────────

export const MEDICAL_CONDITION_KINDS = [
  "ALLERGY",
  "INJURY",
  "CHRONIC",
  "MEDICATION",
  "SURGERY",
  "OTHER",
] as const;

export const CONDITION_SEVERITIES = [
  "MILD",
  "MODERATE",
  "SEVERE",
] as const;

export type MedicalConditionKindValue = (typeof MEDICAL_CONDITION_KINDS)[number];
export type ConditionSeverityValue = (typeof CONDITION_SEVERITIES)[number];

// ── Item schema ───────────────────────────────────────────────────────────────

/**
 * Represents a single medical condition as sent by the client.
 * `id` is present when updating an existing record; absent for new ones.
 */
export const medicalConditionItemSchema = z.object({
  id: z.string().cuid().optional(),
  kind: z.enum(MEDICAL_CONDITION_KINDS, {
    errorMap: () => ({ message: "Tipo de condición médica inválido" }),
  }),
  label: z
    .string({ required_error: "El nombre de la condición es requerido" })
    .trim()
    .min(1, "El nombre no puede estar vacío")
    .max(80, "El nombre no puede superar los 80 caracteres"),
  detail: z
    .string()
    .trim()
    .max(500, "El detalle no puede superar los 500 caracteres")
    .optional(),
  severity: z
    .enum(CONDITION_SEVERITIES, {
      errorMap: () => ({ message: "Nivel de severidad inválido" }),
    })
    .optional(),
  startedAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean({
    required_error: "El campo isActive es requerido",
    invalid_type_error: "El campo isActive debe ser verdadero o falso",
  }),
});

export type MedicalConditionItem = z.infer<typeof medicalConditionItemSchema>;

// ── Save payload schema ───────────────────────────────────────────────────────

/**
 * Input for saveMyMedicalConditions.
 * `reviewed` must always be true — the client confirms they reviewed their list.
 */
export const saveMedicalConditionsInput = z.object({
  items: z
    .array(medicalConditionItemSchema)
    .max(30, "No podés tener más de 30 condiciones médicas registradas"),
  reviewed: z.literal(true, {
    errorMap: () => ({
      message: "Debés confirmar que revisaste tu lista de condiciones médicas",
    }),
  }),
});

export type SaveMedicalConditionsInput = z.infer<typeof saveMedicalConditionsInput>;
