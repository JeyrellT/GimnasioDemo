// =============================================================================
// VIZION — Shared primitive Zod schemas
// Owner: backend-api.
//
// Reusable building blocks imported by every domain schema.
// Keep these pure (no I/O, no imports from lib/db).
// =============================================================================

import { z } from "zod";

// ── Identifiers ───────────────────────────────────────────────────────────────

/** cuid2 — matches what Prisma generates by default (@id @default(cuid())). */
export const cuidSchema = z
  .string()
  .min(24, "ID inválido")
  .max(36, "ID inválido")
  .regex(/^[a-z0-9]+$/, "ID inválido");

/** UUID v4/v7 for future migration. Accepts both. */
export const uuidSchema = z.string().uuid("ID inválido");

// Accept either format for maximum forward-compat
export const idSchema = z.string().min(1, "ID requerido");

// ── Contact ───────────────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .email("Ingresá un correo electrónico válido")
  .toLowerCase()
  .trim();

// ── Numeric primitives ────────────────────────────────────────────────────────

/**
 * Decimal string as coming from a form input.
 * Accepts "75.5", "75", "75,5" (comma → dot normalized).
 * Produces a number (float). Use where precision matters — store as Decimal in DB.
 */
export const decimalStrSchema = z
  .string()
  .transform((v) => v.replace(",", "."))
  .pipe(z.coerce.number().finite());

/** Weight in kilograms. Range 1–500 kg. */
export const weightKgSchema = z.coerce
  .number()
  .min(1, "El peso mínimo es 1 kg")
  .max(500, "El peso máximo es 500 kg");

/** Height in centimeters. Range 50–250 cm. */
export const heightCmSchema = z.coerce
  .number()
  .min(50, "La altura mínima es 50 cm")
  .max(250, "La altura máxima es 250 cm");

/** Body circumference in cm (waist, hip, neck, chest, arm, thigh). */
export const circumferenceCmSchema = z.coerce
  .number()
  .min(5, "Medida demasiado pequeña")
  .max(300, "Medida demasiado grande");

/** Body fat percentage. Range 3–70%. */
export const bodyFatPctSchema = z.coerce
  .number()
  .min(3, "El porcentaje mínimo es 3%")
  .max(70, "El porcentaje máximo es 70%");

/** RPE (Rate of Perceived Exertion). 1–10. */
export const rpeSchema = z.coerce
  .number()
  .min(1, "El RPE mínimo es 1")
  .max(10, "El RPE máximo es 10");

/** Repetitions per set. 1–100. */
export const repsSchema = z.coerce
  .number()
  .int("Las reps deben ser un número entero")
  .min(1, "Mínimo 1 rep")
  .max(100, "Máximo 100 reps");

/** Sets count. 1–20. */
export const setsSchema = z.coerce
  .number()
  .int("Los sets deben ser un número entero")
  .min(1, "Mínimo 1 set")
  .max(20, "Máximo 20 sets");

/** Rest time in seconds. 0–600 s (10 min max). */
export const restSecondsSchema = z.coerce
  .number()
  .int("El descanso debe ser entero (segundos)")
  .min(0, "El descanso no puede ser negativo")
  .max(600, "El descanso máximo es 10 minutos");

/** CRC monetary amount. Min ₡0. Max ₡10,000,000. */
export const crcAmountSchema = z.coerce
  .number()
  .min(0, "El monto no puede ser negativo")
  .max(10_000_000, "Monto máximo excedido");

// ── Date / time ───────────────────────────────────────────────────────────────

/** ISO 8601 date-only string (YYYY-MM-DD). Validates basic format. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida. Formato esperado: YYYY-MM-DD")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Fecha inválida");

/** Full ISO 8601 datetime (UTC). Coerces to Date. */
export const isoDateTimeSchema = z.coerce
  .date()
  .refine((d) => !Number.isNaN(d.getTime()), "Fecha y hora inválidas");

// ── Text ──────────────────────────────────────────────────────────────────────

/** Short text field (e.g. name, title). Trims whitespace. */
export const shortTextSchema = (max = 100) =>
  z.string().trim().min(1, "Este campo es requerido").max(max, `Máximo ${max} caracteres`);

/** Long text field (notes, descriptions). */
export const longTextSchema = (max = 2000) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`).optional();

// ── Storage / media ───────────────────────────────────────────────────────────

/** MIME type string for image uploads. */
export const imageMimeSchema = z
  .string()
  .regex(/^image\/(jpeg|jpg|png|webp|heic|heif)$/, "Formato de imagen no soportado");

/** MIME type for document uploads. */
export const documentMimeSchema = z
  .string()
  .regex(/^(application\/pdf|image\/(jpeg|jpg|png))$/, "Solo se aceptan PDF o imágenes");

// ── Pagination ────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Type exports ──────────────────────────────────────────────────────────────

export type Pagination = z.infer<typeof paginationSchema>;
