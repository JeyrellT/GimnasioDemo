// =============================================================================
// FORJA — Consent validation schemas
// Owner: backend-api.
// =============================================================================

import { z } from "zod";

const consentTypeSchema = z.enum(
  ["TERMS_AND_PRIVACY", "HEALTH_DATA", "AI_PROCESSING", "MARKETING"],
  { required_error: "Tipo de consentimiento requerido" },
);

// ── Grant / revoke single consent ─────────────────────────────────────────────

export const grantConsentSchema = z.object({
  type: consentTypeSchema,
  version: z.string().min(1, "Se requiere la versión del consentimiento"),
});

export type GrantConsentInput = z.infer<typeof grantConsentSchema>;

export const revokeConsentSchema = z.object({
  type: consentTypeSchema,
});

export type RevokeConsentInput = z.infer<typeof revokeConsentSchema>;

// ── Batch grant (onboarding) ──────────────────────────────────────────────────

export const grantMultipleConsentsSchema = z.object({
  consents: z
    .array(
      z.object({
        type: consentTypeSchema,
        granted: z.boolean(),
        version: z.string().min(1),
      }),
    )
    .min(1)
    .refine(
      (items) => {
        const mandatory = ["TERMS_AND_PRIVACY", "HEALTH_DATA"];
        return mandatory.every((type) => {
          const item = items.find((i) => i.type === type);
          return item?.granted === true;
        });
      },
      {
        message:
          "Los consentimientos de Términos y Tratamiento de Datos de Salud son obligatorios",
      },
    ),
});

export type GrantMultipleConsentsInput = z.infer<typeof grantMultipleConsentsSchema>;
