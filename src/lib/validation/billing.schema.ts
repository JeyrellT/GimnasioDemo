// =============================================================================
// VIZION — Billing validation schemas
// Owner: backend-api.
// =============================================================================

import { z } from "zod";
import { idSchema, isoDateSchema } from "./shared.schema";

// ── Generate monthly charges ──────────────────────────────────────────────────

export const generateMonthlyChargesSchema = z.object({
  // trainerId is resolved from the authenticated session via requireTrainer() —
  // the caller must NOT pass it; this schema only validates the period range.
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
}).refine(
  (d) => new Date(d.periodEnd) > new Date(d.periodStart),
  {
    message: "El período debe tener fecha de fin posterior al inicio",
    path: ["periodEnd"],
  },
);

export type GenerateMonthlyChargesInput = z.infer<typeof generateMonthlyChargesSchema>;

// ── Record payment ────────────────────────────────────────────────────────────

export const recordPaymentSchema = z.object({
  chargeId: idSchema,
  paymentMethodInfo: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

// ── Generate invoice XML ──────────────────────────────────────────────────────

export const generateInvoiceSchema = z.object({
  chargeId: idSchema,
});

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;

// ── List invoices filter ──────────────────────────────────────────────────────

export const listInvoicesSchema = z.object({
  since: z.coerce.date().optional(),
  status: z.enum(["DRAFT", "SIGNED", "ACCEPTED", "REJECTED", "FAILED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListInvoicesInput = z.infer<typeof listInvoicesSchema>;
