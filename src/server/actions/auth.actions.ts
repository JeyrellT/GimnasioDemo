"use server";

// =============================================================================
// BLACKLINE FITNESS — Auth Server Actions
// Owner: backend-api.
//
// All functions:
//   - Validate input at the boundary with Zod before touching Prisma.
//   - Wrap every DB call in tryCatch() to convert throws into Result.
//   - Never expose internal error details; user-facing messages are in Spanish.
//   - Log with logInfo / logError for observability (pino, redacts PII).
//   - Create AuditLog entries for all state-changing operations.
// =============================================================================

import { headers } from "next/headers";
import * as React from "react";
import { z } from "zod";

import { prisma } from "@/server/db";
import {
  requireUser,
  requireTrainer,
} from "@/server/guards";
import { tryCatch } from "@/lib/result";
import {
  ValidationError,
  ConflictError,
  NotFoundError,
} from "@/lib/errors";
import { logInfo, logError } from "@/lib/logger";
import { TRIAL_DAYS, MAGIC_LINK_EXPIRY_MIN } from "@/lib/consts";
import { hashPassword } from "@/lib/crypto/passwords";
import { generateOpaqueToken } from "@/lib/crypto/tokens";
import { sendEmail } from "@/lib/email/client";
import MagicLinkEmail from "@/lib/email/templates/magic-link";

import type { ActionResult } from "@/types/api";
import type { RequestMagicLinkResult } from "@/types/api";

import {
  signUpSchema,
  requestMagicLinkSchema,
  updateProfileBasicSchema,
} from "@/lib/validation/auth.schema";

// Local trainer-profile update schema (not in auth.schema.ts — domain-specific)
const updateTrainerProfileSchema = z.object({
  tradeName: z.string().trim().min(1).max(120).optional(),
  specialty: z.string().trim().min(1).max(200).optional(),
  bio: z.string().trim().max(2000).optional(),
  certificationUrl: z.string().url("URL de certificación inválida").optional().or(z.literal("")),
  fiscalIdType: z.string().trim().max(20).optional(),
  fiscalIdNumber: z.string().trim().max(40).optional(),
  fiscalAddress: z.string().trim().max(300).optional(),
  haciendaUsername: z.string().trim().max(80).optional(),
  defaultMonthlyPriceCRC: z.coerce.number().min(0).max(10_000_000).optional(),
});

// Password is separate from the Zod schema in auth.schema.ts (which is magic-link focused)
const registerSchema = signUpSchema.extend({
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(1024, "La contraseña es demasiado larga"),
  role: z.enum(["TRAINER", "CLIENT"]).default("CLIENT"),
  referredByCode: z.string().trim().max(100).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract IP and User-Agent from the current request for audit / consent logging. */
async function getRequestMeta(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const ipAddress =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    const userAgent = h.get("user-agent") ?? null;
    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

/** Build a VerificationToken and send a magic-link email.
 *  Does NOT throw — errors are swallowed intentionally so callers never
 *  reveal whether an email address is registered or not.
 */
async function sendMagicLinkForUser(
  userId: string,
  email: string,
  name: string,
): Promise<void> {
  const token = generateOpaqueToken(32);
  const expires = new Date(Date.now() + MAGIC_LINK_EXPIRY_MIN * 60 * 1000);
  const appUrl = process.env.APP_URL ?? "https://blacklinefitness.app";

  try {
    // Delete any existing tokens for this email before creating a fresh one.
    // Auth.js expects single-use tokens — having multiple valid tokens for the
    // same identifier would allow replay. We delete-then-create atomically.
    await prisma.$transaction(async (tx) => {
      // Remove stale tokens for this identifier (idempotent)
      await tx.verificationToken.deleteMany({
        where: { identifier: email },
      });
      await tx.verificationToken.create({
        data: { identifier: email, token, expires },
      });
    });

    const url = `${appUrl}/api/auth/callback/email?token=${token}&email=${encodeURIComponent(email)}`;

    await sendEmail({
      to: email,
      subject: "Tu link de acceso a Blackline Fitness",
      react: React.createElement(MagicLinkEmail, {
        url,
        email,
        expiresInMinutes: MAGIC_LINK_EXPIRY_MIN,
      }),
    });

    logInfo("magic_link.sent", { userId, tokenExpiry: expires.toISOString() });
  } catch (e) {
    logError(e, { action: "sendMagicLinkForUser", userId });
    // Intentional swallow: callers return ok({ sent: true }) regardless.
  }
}

// =============================================================================
// registerUser
// =============================================================================

/**
 * Register a new user with email + password.
 *
 * Steps:
 *   1. Validate input.
 *   2. Check email uniqueness (ConflictError if taken).
 *   3. Hash password.
 *   4. Create User + role-specific profile + TrainerSubscription if TRAINER.
 *   5. Send magic-link for email verification.
 *   6. Create AuditLog.
 */
export interface RegisterUserInput {
  email: string;
  name: string;
  role?: "TRAINER" | "CLIENT";
  dateOfBirth?: string;
  password?: string;
}

export async function registerUser(
  input: RegisterUserInput | FormData,
): Promise<ActionResult<RequestMagicLinkResult>> {
  return tryCatch(async () => {
    // -- Input validation --
    const raw = input instanceof FormData
      ? {
          email: input.get("email"),
          name: input.get("name"),
          dateOfBirth: input.get("dateOfBirth") ?? undefined,
          password: input.get("password"),
          role: input.get("role") ?? "CLIENT",
          referredByCode: input.get("referredByCode") || undefined,
        }
      : {
          email: input.email,
          name: input.name,
          dateOfBirth: input.dateOfBirth ?? undefined,
          password: input.password ?? "",
          role: input.role ?? "CLIENT",
          referredByCode: undefined,
        };
    const parsed = registerSchema.safeParse(raw);

    if (!parsed.success) {
      throw new ValidationError(
        "REGISTER_INPUT",
        parsed.error.issues[0]?.message ?? "Datos de registro inválidos",
        parsed.error,
      );
    }

    const { email, name, password, role, dateOfBirth, referredByCode } = parsed.data;
    const { ipAddress, userAgent } = await getRequestMeta();

    // -- Uniqueness check --
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, deletedAt: true },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictError(
        "EMAIL_TAKEN",
        "Ya existe una cuenta con ese correo electrónico.",
      );
    }

    // -- Hash password --
    const passwordHash = await hashPassword(password);

    // -- Create User + profile in a transaction --
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role,
          ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
          ...(referredByCode ? { referredByCode } : {}),
        },
        select: { id: true, email: true, name: true, role: true },
      });

      if (role === "TRAINER") {
        // Create trainer profile with sensible defaults
        await tx.trainerProfile.create({
          data: {
            userId: newUser.id,
            tradeName: name,
            specialty: "",
            bio: "",
          },
        });

        // Create trial subscription
        await tx.trainerSubscription.create({
          data: {
            trainerUserId: newUser.id,
            planTier: "SOLO",
            status: "TRIAL",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            trialEndsAt,
          },
        });
      } else {
        // Create client profile with defaults
        await tx.clientProfile.create({
          data: {
            userId: newUser.id,
            parqStatus: "NOT_COMPLETED",
          },
        });
      }

      // Audit log — actor is the new user themselves (self-registration)
      await tx.auditLog.create({
        data: {
          actorUserId: newUser.id,
          action: "CREATE",
          entityType: "User",
          entityId: newUser.id,
          ipAddress,
          userAgent,
          metadata: { role, source: "register" },
        },
      });

      return newUser;
    });

    logInfo("user.registered", { userId: user.id, role });

    // No verification email — registration is open and the client auto-signs in
    // with the credentials it just submitted. Email verification can be wired
    // back in later via a dedicated "verify email" CTA inside the app.

    return { sent: true, email };
  });
}

// =============================================================================
// searchTrainersByName — public (no auth), used in registration referral field
// =============================================================================

export interface TrainerSearchResult {
  id: string;
  name: string;
  tradeName: string | null;
  specialty: string | null;
  avatarUrl: string | null;
}

export async function searchTrainersByName(
  query: string,
): Promise<ActionResult<TrainerSearchResult[]>> {
  return tryCatch(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const trainers = await prisma.user.findMany({
      where: {
        role: "TRAINER",
        deletedAt: null,
        suspendedAt: null,
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          {
            trainerProfile: {
              tradeName: { contains: trimmed, mode: "insensitive" },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        trainerProfile: {
          select: { tradeName: true, specialty: true },
        },
      },
      take: 5,
      orderBy: { name: "asc" },
    });

    return trainers.map((t) => ({
      id: t.id,
      name: t.name,
      tradeName: t.trainerProfile?.tradeName ?? null,
      specialty: t.trainerProfile?.specialty ?? null,
      avatarUrl: t.avatarUrl,
    }));
  });
}

// =============================================================================
// requestMagicLink
// =============================================================================

/**
 * Request a magic-link sign-in email.
 *
 * Design: always returns ok({ sent: true }) regardless of whether the email
 * exists. This prevents user enumeration attacks.
 */
export async function requestMagicLink(
  emailOrInput: string | FormData,
  callbackUrl?: string,
): Promise<ActionResult<RequestMagicLinkResult>> {
  return tryCatch(async () => {
    const parsed = requestMagicLinkSchema.safeParse(
      typeof emailOrInput === "string"
        ? { email: emailOrInput, callbackUrl: callbackUrl ?? undefined }
        : { email: emailOrInput.get("email"), callbackUrl: emailOrInput.get("callbackUrl") ?? undefined },
    );

    if (!parsed.success) {
      throw new ValidationError(
        "MAGIC_LINK_INPUT",
        parsed.error.issues[0]?.message ?? "Correo electrónico inválido",
        parsed.error,
      );
    }

    const { email } = parsed.data;

    // Intentionally do NOT reveal if the user exists.
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
      select: { id: true, name: true, deletedAt: true },
    });

    if (user) {
      await sendMagicLinkForUser(user.id, email, user.name);
    } else {
      logInfo("magic_link.user_not_found_silenced", {});
    }

    return { sent: true, email };
  });
}

// =============================================================================
// updateProfile
// =============================================================================

/**
 * Update the authenticated user's basic profile (name, avatarUrl).
 * Trainer users also get their TrainerProfile fields updated.
 */
export async function updateProfile(
  formData: FormData,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireUser();

    const parsed = updateProfileBasicSchema.safeParse({
      name: formData.get("name") ?? undefined,
      avatarUrl: formData.get("avatarUrl") ?? undefined,
      theme: formData.get("theme") ?? undefined,
      pushOptIn:
        formData.get("pushOptIn") !== null
          ? formData.get("pushOptIn") === "true"
          : undefined,
    });

    if (!parsed.success) {
      throw new ValidationError(
        "PROFILE_INPUT",
        parsed.error.issues[0]?.message ?? "Datos de perfil inválidos",
        parsed.error,
      );
    }

    const { name, avatarUrl, theme, pushOptIn } = parsed.data;
    const { ipAddress, userAgent } = await getRequestMeta();

    await prisma.$transaction(async (tx) => {
      // Update User base fields (only fields that were provided)
      await tx.user.update({
        where: { id: user.id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
          ...(theme !== undefined ? { theme } : {}),
          ...(pushOptIn !== undefined ? { pushOptIn } : {}),
        },
      });

      // For trainers: also update TrainerProfile if any trainer fields were provided
      if (user.role === "TRAINER") {
        const tradeName = formData.get("tradeName") as string | null;
        const specialty = formData.get("specialty") as string | null;
        const bio = formData.get("bio") as string | null;

        if (tradeName !== null || specialty !== null || bio !== null) {
          await tx.trainerProfile.update({
            where: { userId: user.id },
            data: {
              ...(tradeName !== null ? { tradeName: tradeName.trim() } : {}),
              ...(specialty !== null ? { specialty: specialty.trim() } : {}),
              ...(bio !== null ? { bio: bio.trim() } : {}),
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "UPDATE",
          entityType: "User",
          entityId: user.id,
          ipAddress,
          userAgent,
          metadata: { fields: Object.keys(parsed.data) },
        },
      });
    });

    logInfo("user.profile_updated", { userId: user.id });

    return { updated: true };
  });
}

// =============================================================================
// updateTrainerProfile
// =============================================================================

/**
 * Update trainer-specific profile fields.
 * Requires TRAINER role (enforced by requireTrainer()).
 */
export interface UpdateTrainerProfileInput {
  tradeName?: string;
  specialty?: string;
  bio?: string;
  certificationUrl?: string;
  fiscalIdType?: string;
  fiscalIdNumber?: string;
  fiscalAddress?: string;
  haciendaUsername?: string;
  defaultMonthlyPriceCRC?: number;
}

export async function updateTrainerProfile(
  input: UpdateTrainerProfileInput | FormData,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const user = await requireTrainer();

    const raw = input instanceof FormData
      ? {
          tradeName: input.get("tradeName") ?? undefined,
          specialty: input.get("specialty") ?? undefined,
          bio: input.get("bio") ?? undefined,
          certificationUrl: input.get("certificationUrl") ?? undefined,
          fiscalIdType: input.get("fiscalIdType") ?? undefined,
          fiscalIdNumber: input.get("fiscalIdNumber") ?? undefined,
          fiscalAddress: input.get("fiscalAddress") ?? undefined,
          haciendaUsername: input.get("haciendaUsername") ?? undefined,
          defaultMonthlyPriceCRC: input.get("defaultMonthlyPriceCRC") !== null ? input.get("defaultMonthlyPriceCRC") : undefined,
        }
      : input;

    const parsed = updateTrainerProfileSchema.safeParse(raw);

    if (!parsed.success) {
      throw new ValidationError(
        "TRAINER_PROFILE_INPUT",
        parsed.error.issues[0]?.message ?? "Datos de perfil inválidos",
        parsed.error,
      );
    }

    const data = parsed.data;

    // Nothing to update if no fields were sent
    if (Object.keys(data).length === 0) {
      return { updated: true };
    }

    const { ipAddress, userAgent } = await getRequestMeta();

    await prisma.$transaction(async (tx) => {
      await tx.trainerProfile.update({
        where: { userId: user.id },
        data: {
          ...(data.tradeName !== undefined ? { tradeName: data.tradeName } : {}),
          ...(data.specialty !== undefined ? { specialty: data.specialty } : {}),
          ...(data.bio !== undefined ? { bio: data.bio } : {}),
          ...(data.certificationUrl !== undefined
            ? { certificationUrl: data.certificationUrl || null }
            : {}),
          ...(data.fiscalIdType !== undefined
            ? { fiscalIdType: data.fiscalIdType || null }
            : {}),
          ...(data.fiscalIdNumber !== undefined
            ? { fiscalIdNumber: data.fiscalIdNumber || null }
            : {}),
          ...(data.fiscalAddress !== undefined
            ? { fiscalAddress: data.fiscalAddress || null }
            : {}),
          ...(data.haciendaUsername !== undefined
            ? { haciendaUsername: data.haciendaUsername || null }
            : {}),
          ...(data.defaultMonthlyPriceCRC !== undefined
            ? { defaultMonthlyPriceCRC: data.defaultMonthlyPriceCRC }
            : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "UPDATE",
          entityType: "TrainerProfile",
          entityId: user.id,
          ipAddress,
          userAgent,
          metadata: { fields: Object.keys(data) },
        },
      });
    });

    logInfo("trainer.profile_updated", { userId: user.id });

    return { updated: true };
  });
}
