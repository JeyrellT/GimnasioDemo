// =============================================================================
// BLACKLINE FITNESS — Finance Zod validation schemas
// Owner: backend-api.
// =============================================================================

import { z } from "zod";
import { idSchema, isoDateTimeSchema, longTextSchema } from "./shared.schema";

// ── Shared primitives ─────────────────────────────────────────────────────────

const crcPositiveSchema = z.coerce.number().positive().max(10_000_000);
const crcNonNegSchema = z.coerce.number().nonnegative().max(10_000_000);

// ── Enums (mirror Prisma — avoids importing generated client in validation) ───

const locationKindEnum = z.enum([
  "HOME",
  "GYM",
  "STUDIO",
  "CLIENT_HOME",
  "OUTDOOR",
  "OTHER",
]);

const locationCostModelEnum = z.enum(["FLAT", "PER_KM", "HYBRID"]);

const expenseCategoryEnum = z.enum([
  "TRANSPORTE",
  "ALQUILER_ESPACIO",
  "EQUIPO",
  "MARKETING",
  "EDUCACION",
  "SOFTWARE",
  "COMIDAS",
  "IMPUESTOS",
  "SERVICIOS_PROFESIONALES",
  "OTROS",
]);

const incomeCategoryEnum = z.enum([
  "SESION_PT",
  "EVALUACION_INICIAL",
  "PLAN_NUTRICIONAL",
  "CLASE_GRUPAL",
  "ASESORIA_ONLINE",
  "PRODUCTO",
  "OTROS",
]);

const oneOffPaidStatusEnum = z.enum(["PAID", "PENDING", "CANCELLED"]);

// ── Location ──────────────────────────────────────────────────────────────────

export const createLocationSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es requerido").max(80),
    address: z.string().trim().max(200).optional(),
    kind: locationKindEnum,
    costModel: locationCostModelEnum.default("FLAT"),
    costPerVisitCRC: crcPositiveSchema.optional(),
    costPerKmCRC: crcPositiveSchema.optional(),
    defaultKm: z.coerce.number().positive().max(1000).optional(),
    monthlyRentCRC: crcNonNegSchema.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(
    (d) => {
      if (d.costModel === "FLAT") return d.costPerVisitCRC != null;
      if (d.costModel === "PER_KM") return d.costPerKmCRC != null;
      return true; // HYBRID: no strict requirement at schema level
    },
    { message: "Costo requerido según modelo de cobro seleccionado" },
  );

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1, "El nombre es requerido").max(80).optional(),
    address: z.string().trim().max(200).optional().nullable(),
    kind: locationKindEnum.optional(),
    costModel: locationCostModelEnum.optional(),
    costPerVisitCRC: crcPositiveSchema.optional().nullable(),
    costPerKmCRC: crcPositiveSchema.optional().nullable(),
    defaultKm: z.coerce.number().positive().max(1000).optional().nullable(),
    monthlyRentCRC: crcNonNegSchema.optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine((d) => d.id.length > 0, { message: "ID requerido", path: ["id"] });

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// ── Expense ───────────────────────────────────────────────────────────────────

export const createExpenseSchema = z.object({
  occurredAt: isoDateTimeSchema,
  amountCRC: crcPositiveSchema,
  category: expenseCategoryEnum,
  locationId: idSchema.optional(),
  description: z.string().trim().max(500).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

// ── One-off sale ──────────────────────────────────────────────────────────────

export const createOneOffSaleSchema = z.object({
  occurredAt: isoDateTimeSchema,
  amountCRC: crcPositiveSchema,
  category: incomeCategoryEnum,
  clientUserId: idSchema.optional(),
  description: z.string().trim().max(500).optional(),
  paidStatus: oneOffPaidStatusEnum.default("PAID"),
});

export type CreateOneOffSaleInput = z.infer<typeof createOneOffSaleSchema>;

// ── Location visit ────────────────────────────────────────────────────────────

export const createLocationVisitSchema = z.object({
  locationId: idSchema,
  visitedAt: isoDateTimeSchema,
  kmTraveled: z.coerce.number().positive().max(10_000).optional(),
  notes: longTextSchema(500),
});

export type CreateLocationVisitInput = z.infer<typeof createLocationVisitSchema>;

// ── Finance filters ───────────────────────────────────────────────────────────

export const financeFiltersSchema = z
  .object({
    fromDate: isoDateTimeSchema,
    toDate: isoDateTimeSchema,
  })
  .refine((d) => d.fromDate <= d.toDate, {
    message: "La fecha de inicio no puede ser posterior a la fecha de fin",
    path: ["fromDate"],
  });

export type FinanceFiltersInput = z.infer<typeof financeFiltersSchema>;
