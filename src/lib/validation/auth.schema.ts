// =============================================================================
// VIZION — Auth validation schemas
// Owner: backend-api.
// =============================================================================

import { z } from "zod";
import { emailSchema, idSchema } from "./shared.schema";
import { safeRedirect } from "@/lib/safe-redirect";

// ── Sign up ───────────────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  email: emailSchema,
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede superar 100 caracteres"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .refine((v) => {
      const dob = new Date(v);
      if (Number.isNaN(dob.getTime())) return false;
      const now = new Date();
      const ageYears =
        (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return ageYears >= 15;
    }, "La edad mínima es 15 años (Ley 8968)")
    .optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

// ── Magic link request (sign in) ─────────────────────────────────────────────

export const requestMagicLinkSchema = z.object({
  email: emailSchema,
  /**
   * Optional URL to redirect to after authentication. Must be same-origin.
   * Validated via safeRedirect — relative paths starting with "/" (not "//")
   * are allowed; absolute URLs must match APP_URL / NEXTAUTH_URL origin.
   * Any unsafe value is silently replaced with "/" rather than rejected, so
   * the magic-link request still succeeds even if an attacker injects a bad URL.
   */
  callbackUrl: z
    .string()
    .transform((v) => safeRedirect(v, "/"))
    .optional(),
});

export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;

// ── Accept invitation ─────────────────────────────────────────────────────────

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token de invitación requerido"),
  userId: idSchema,
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

// ── Update profile (basic) ────────────────────────────────────────────────────

export const updateProfileBasicSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Mínimo 2 caracteres")
      .max(100, "Máximo 100 caracteres")
      .optional(),
    avatarUrl: z.string().url("URL de avatar inválida").optional(),
    theme: z.enum(["dark", "light"]).optional(),
    pushOptIn: z.boolean().optional(),
  })
  .strict();

export type UpdateProfileBasicInput = z.infer<typeof updateProfileBasicSchema>;
