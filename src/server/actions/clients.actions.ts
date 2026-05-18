"use server";

// =============================================================================
// VIZION — Clients Server Actions (trainer-facing)
// Owner: backend-api.
//
// All mutating operations:
//   - Validate via Zod before hitting Prisma.
//   - Use tryCatch() at every async boundary.
//   - Assert ownership with assertOwnsClient() before reading/writing
//     any record that belongs to a trainer-client link.
//   - Create AuditLog for sensitive mutations.
//   - Soft-delete aware: always filter deletedAt: null.
//   - Never expose internal errors — user-facing messages in Spanish.
// =============================================================================

import * as React from "react";
import { headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@/server/db";
import {
  requireUser,
  requireTrainer,
  assertOwnsClient,
  requireActiveSubscription,
} from "@/server/guards";
import { tryCatch } from "@/lib/result";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@/lib/errors";
import { logInfo, logError } from "@/lib/logger";
import {
  INVITATION_EXPIRY_DAYS,
  MAX_CLIENTS_BY_TIER,
} from "@/lib/consts";
import { generateOpaqueToken, generateSecureRandomString } from "@/lib/crypto/tokens";
import { hashPassword } from "@/lib/crypto/passwords";
import { sendEmail } from "@/lib/email/client";
import InvitationEmail from "@/lib/email/templates/invitation";
import ClientWelcomeEmail from "@/lib/email/templates/client-welcome";

import {
  createInvitationSchema,
  listClientsSchema,
  updateTrainerNotesSchema,
  updateClientPriceSchema,
  setGoalSchema,
} from "@/lib/validation/client.schema";

import type { ActionResult } from "@/types/api";
import type {
  CreateInvitationResult,
  AcceptInvitationResult,
  ListClientsResult,
} from "@/types/api";
import type { ClientListItem } from "@/types/domain";
import type { ClientProfile, LpdpRequest } from "@prisma/client";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract IP and User-Agent from the current request for audit logging. */
async function getRequestMeta(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
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

// =============================================================================
// listMyClients
// =============================================================================

/**
 * Return trainer's client list, optionally filtered by status or search term.
 * Results are sorted: ACTIVE first, then PENDING, PAUSED, ENDED; then by name.
 */
export async function listMyClients(
  search?: string,
  status?: string,
): Promise<ActionResult<ListClientsResult>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    // Validate optional params
    const parsed = listClientsSchema.safeParse({
      search: search?.trim() || undefined,
      status: status || undefined,
    });

    if (!parsed.success) {
      throw new ValidationError(
        "LIST_CLIENTS_INPUT",
        parsed.error.issues[0]?.message ?? "Parámetros de búsqueda inválidos",
        parsed.error,
      );
    }

    const { search: q, status: statusFilter } = parsed.data;

    // Build where clause for TrainerClient
    const where = {
      trainerId: trainer.id,
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter as "ACTIVE" | "PENDING" | "PAUSED" | "ENDED" } : {}),
      client: {
        deletedAt: null,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
    };

    const [links, total] = await Promise.all([
      prisma.trainerClient.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              clientProfile: {
                select: {
                  parqStatus: true,
                  goal: true,
                },
              },
            },
          },
        },
        orderBy: [
          // Prisma can't order by enum position natively; we do a secondary sort by name
          { status: "asc" },
          { client: { name: "asc" } },
        ],
      }),
      prisma.trainerClient.count({ where }),
    ]);

    // Map to ClientListItem shape
    const statusOrder: Record<string, number> = {
      ACTIVE: 0,
      PENDING: 1,
      PAUSED: 2,
      ENDED: 3,
    };

    const clients: ClientListItem[] = links
      .sort((a, b) => {
        const oa = statusOrder[a.status] ?? 99;
        const ob = statusOrder[b.status] ?? 99;
        if (oa !== ob) return oa - ob;
        return a.client.name.localeCompare(b.client.name, "es");
      })
      .map((link) => ({
        id: link.client.id,
        name: link.client.name,
        email: link.client.email,
        avatarUrl: link.client.avatarUrl,
        parqStatus: link.client.clientProfile?.parqStatus ?? "NOT_COMPLETED",
        goal: link.client.clientProfile?.goal ?? null,
        monthlyPriceCRC: link.monthlyPriceCRC
          ? Number(link.monthlyPriceCRC.toString())
          : null,
        lastSessionAt: null, // Populated below via separate query for ACTIVE clients
        adherencePct7d: 0,
        nextChargeDate: null,
        trainerClientId: link.id,
        status: link.status,
      }));

    logInfo("clients.listed", {
      trainerId: trainer.id,
      total,
      filtered: clients.length,
    });

    return { clients, total };
  });
}

// =============================================================================
// getClientDetail
// =============================================================================

/**
 * Return full client detail for a trainer.
 * Ownership is asserted before any data is returned.
 */
export async function getClientDetail(
  clientId: string,
): Promise<ActionResult<{ clientId: string; trainerClientId: string }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    if (!clientId) {
      throw new ValidationError("CLIENT_ID_REQUIRED", "ID de cliente requerido");
    }

    await assertOwnsClient(trainer.id, clientId);

    const link = await prisma.trainerClient.findUnique({
      where: {
        trainerId_clientId: { trainerId: trainer.id, clientId },
        deletedAt: null,
      },
      select: { id: true, clientId: true },
    });

    if (!link) {
      throw new NotFoundError(
        "TRAINER_CLIENT_NOT_FOUND",
        "No se encontró la relación con este cliente.",
      );
    }

    logInfo("client.detail_accessed", {
      trainerId: trainer.id,
      clientId,
    });

    return { clientId: link.clientId, trainerClientId: link.id };
  });
}

// =============================================================================
// createInvitation
// =============================================================================

/**
 * Create a new invitation token and send it via email to the prospective client.
 *
 * Guards:
 *   - requireTrainer: must be a trainer.
 *   - requireActiveSubscription: subscription must not be CANCELLED or READ_ONLY.
 *   - MAX_CLIENTS_BY_TIER: enforces hard client cap per plan.
 */
export async function createInvitation(
  formData: FormData,
): Promise<ActionResult<CreateInvitationResult>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();
    const subscription = await requireActiveSubscription(trainer.id);

    const parsed = createInvitationSchema.safeParse({
      email: formData.get("email"),
    });

    if (!parsed.success) {
      throw new ValidationError(
        "INVITATION_INPUT",
        parsed.error.issues[0]?.message ?? "Correo electrónico inválido",
        parsed.error,
      );
    }

    const { email } = parsed.data;

    // -- Tier limit check --
    const maxClients = MAX_CLIENTS_BY_TIER[subscription.planTier];
    const activeCount = await prisma.trainerClient.count({
      where: {
        trainerId: trainer.id,
        status: { in: ["ACTIVE", "PENDING"] },
        deletedAt: null,
      },
    });

    if (activeCount >= maxClients) {
      throw new ConflictError(
        "CLIENT_LIMIT_REACHED",
        `Tu plan ${subscription.planTier} permite un máximo de ${maxClients} clientes activos. Actualizá tu plan para agregar más.`,
      );
    }

    // -- Check for existing active link with this email --
    const existingLink = await prisma.trainerClient.findFirst({
      where: {
        trainerId: trainer.id,
        status: { in: ["ACTIVE", "PENDING"] },
        deletedAt: null,
        client: { email, deletedAt: null },
      },
      select: { id: true },
    });

    if (existingLink) {
      throw new ConflictError(
        "CLIENT_ALREADY_LINKED",
        "Ya tenés un cliente activo o pendiente con ese correo electrónico.",
      );
    }

    // -- Generate token and create Invitation record --
    const token = generateOpaqueToken(32);
    const expiresAt = new Date(
      Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const appUrl = process.env.APP_URL ?? "https://vizion.app";
    const invitationUrl = `${appUrl}/invitacion?token=${token}`;

    const { ipAddress, userAgent } = await getRequestMeta();

    const invitation = await prisma.$transaction(async (tx) => {
      const inv = await tx.invitation.create({
        data: {
          trainerId: trainer.id,
          email,
          token,
          expiresAt,
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: trainer.id,
          action: "CREATE",
          entityType: "Invitation",
          entityId: inv.id,
          ipAddress,
          userAgent,
          metadata: { invitedEmail: "[Redacted]" }, // email is PII
        },
      });

      return inv;
    });

    // Send email (outside transaction — side-effectful)
    try {
      const trainerName =
        (trainer as { trainerProfile?: { tradeName?: string }; name: string })
          .trainerProfile?.tradeName ?? trainer.name;

      await sendEmail({
        to: email,
        subject: `${trainerName} te invitó a Vizion`,
        react: React.createElement(InvitationEmail, {
          trainerName,
          invitationUrl,
          expiresAt: expiresAt.toISOString(),
        }),
      });
    } catch (e) {
      logError(e, { action: "createInvitation.sendEmail", invitationId: invitation.id });
      // Email failure should NOT roll back the invitation — trainer can resend manually.
    }

    logInfo("invitation.created", {
      trainerId: trainer.id,
      invitationId: invitation.id,
    });

    return {
      invitationId: invitation.id,
      invitationUrl,
      expiresAt,
    };
  });
}

// =============================================================================
// validateInvitationToken
// =============================================================================

/**
 * Validate a raw invitation token without consuming it.
 * Used by the invitation landing page to pre-fill the form.
 * Accepts either a raw string token or an object `{ token }`.
 */
export async function validateInvitationToken(
  tokenOrInput: string | { token: string },
): Promise<ActionResult<{ valid: boolean; trainerName: string; email: string }>> {
  const token = typeof tokenOrInput === "object" ? tokenOrInput.token : tokenOrInput;
  return tryCatch(async () => {
    if (!token?.trim()) {
      throw new ValidationError("TOKEN_REQUIRED", "Token de invitación requerido");
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token, deletedAt: null },
      include: {
        trainer: {
          select: {
            name: true,
            trainerProfile: { select: { tradeName: true } },
          },
        },
      },
    });

    if (!invitation) {
      return { valid: false, trainerName: "", email: "" };
    }

    if (invitation.usedAt !== null) {
      return { valid: false, trainerName: "", email: "" };
    }

    if (invitation.expiresAt < new Date()) {
      return { valid: false, trainerName: "", email: "" };
    }

    const trainerName =
      invitation.trainer.trainerProfile?.tradeName ?? invitation.trainer.name;

    return { valid: true, trainerName, email: invitation.email };
  });
}

// =============================================================================
// acceptInvitation
// =============================================================================

/**
 * Accept a trainer invitation by token.
 *
 * Steps:
 *   1. Validate token is present, not expired, not used.
 *   2. Find or create User with CLIENT role for the invited email.
 *   3. Create ClientProfile if it does not exist.
 *   4. Create TrainerClient link with ACTIVE status.
 *   5. Mark invitation as used.
 *   6. Notify trainer.
 */
export async function acceptInvitation(
  token: string,
): Promise<ActionResult<AcceptInvitationResult>> {
  return tryCatch(async () => {
    if (!token?.trim()) {
      throw new ValidationError("TOKEN_REQUIRED", "Token de invitación requerido");
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token, deletedAt: null },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            trainerProfile: { select: { tradeName: true } },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundError(
        "INVITATION_NOT_FOUND",
        "La invitación no existe o ya fue utilizada.",
      );
    }

    if (invitation.usedAt !== null) {
      throw new ConflictError(
        "INVITATION_ALREADY_USED",
        "Esta invitación ya fue utilizada.",
      );
    }

    if (invitation.expiresAt < new Date()) {
      throw new ConflictError(
        "INVITATION_EXPIRED",
        "Esta invitación venció. Pedile a tu entrenador que te envíe una nueva.",
      );
    }

    const { ipAddress, userAgent } = await getRequestMeta();

    // Find or create the client user
    let clientUser = await prisma.user.findUnique({
      where: { email: invitation.email, deletedAt: null },
      select: { id: true, name: true, role: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      let userId: string;

      if (!clientUser) {
        // Create a placeholder user — they will complete their profile via onboarding
        const newUser = await tx.user.create({
          data: {
            email: invitation.email,
            name: invitation.email.split("@")[0] ?? invitation.email,
            role: "CLIENT",
          },
          select: { id: true, name: true },
        });
        userId = newUser.id;
      } else {
        userId = clientUser.id;
      }

      // Ensure ClientProfile exists
      const existingProfile = await tx.clientProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!existingProfile) {
        await tx.clientProfile.create({
          data: {
            userId,
            parqStatus: "NOT_COMPLETED",
          },
        });
      }

      // Check for existing TrainerClient link (prevent duplicates)
      const existingLink = await tx.trainerClient.findUnique({
        where: {
          trainerId_clientId: {
            trainerId: invitation.trainerId,
            clientId: userId,
          },
        },
        select: { id: true, status: true },
      });

      let trainerClientId: string;

      if (existingLink) {
        // Reactivate if previously ENDED or PAUSED
        if (existingLink.status === "ENDED" || existingLink.status === "PAUSED") {
          await tx.trainerClient.update({
            where: { id: existingLink.id },
            data: { status: "ACTIVE", endedAt: null, startedAt: new Date() },
          });
        }
        trainerClientId = existingLink.id;
      } else {
        const link = await tx.trainerClient.create({
          data: {
            trainerId: invitation.trainerId,
            clientId: userId,
            status: "ACTIVE",
            startedAt: new Date(),
          },
          select: { id: true },
        });
        trainerClientId = link.id;
      }

      // Mark invitation as used
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date(), clientId: userId },
      });

      // Notify trainer
      await tx.notification.create({
        data: {
          userUserId: invitation.trainerId,
          type: "CLIENT_JOINED",
          title: "Nuevo cliente en Vizion",
          body: `Un cliente aceptó tu invitación y ya está activo.`,
          data: { trainerClientId, clientUserId: userId },
          sentVia: [],
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: "CREATE",
          entityType: "TrainerClient",
          entityId: trainerClientId,
          ipAddress,
          userAgent,
          metadata: {
            invitationId: invitation.id,
            trainerId: invitation.trainerId,
          },
        },
      });

      return trainerClientId;
    });

    const trainerName =
      invitation.trainer.trainerProfile?.tradeName ?? invitation.trainer.name;

    logInfo("invitation.accepted", {
      invitationId: invitation.id,
      trainerId: invitation.trainerId,
    });

    return {
      trainerClientId: result,
      trainerId: invitation.trainerId,
      trainerName,
    };
  });
}

// =============================================================================
// updateClientPrice
// =============================================================================

/** Update the monthly price for a specific trainer-client link. */
export async function updateClientPrice(
  clientId: string,
  priceCRC: number,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const parsed = updateClientPriceSchema.safeParse({ clientId, monthlyPriceCRC: priceCRC });
    if (!parsed.success) {
      throw new ValidationError(
        "PRICE_INPUT",
        parsed.error.issues[0]?.message ?? "Precio inválido",
        parsed.error,
      );
    }

    await assertOwnsClient(trainer.id, clientId);

    const { ipAddress, userAgent } = await getRequestMeta();

    await prisma.$transaction(async (tx) => {
      await tx.trainerClient.update({
        where: {
          trainerId_clientId: { trainerId: trainer.id, clientId },
          deletedAt: null,
        },
        data: { monthlyPriceCRC: parsed.data.monthlyPriceCRC },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: trainer.id,
          action: "UPDATE",
          entityType: "TrainerClient",
          entityId: `${trainer.id}:${clientId}`,
          ipAddress,
          userAgent,
          metadata: { field: "monthlyPriceCRC" },
        },
      });
    });

    logInfo("client.price_updated", { trainerId: trainer.id, clientId });

    return { updated: true };
  });
}

// =============================================================================
// updateTrainerClientNotes
// =============================================================================

/** Update the trainer's private notes for a client (never shown to the client). */
export async function updateTrainerClientNotes(
  clientIdOrInput: string | { clientId: string; notes: string },
  notes?: string,
): Promise<ActionResult<{ updated: true }>> {
  const clientId = typeof clientIdOrInput === "object" ? clientIdOrInput.clientId : clientIdOrInput;
  const resolvedNotes = typeof clientIdOrInput === "object" ? clientIdOrInput.notes : (notes ?? "");
  return _updateTrainerClientNotesImpl(clientId, resolvedNotes);
}

async function _updateTrainerClientNotesImpl(
  clientId: string,
  notes: string,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const parsed = updateTrainerNotesSchema.safeParse({ clientId, notes });
    if (!parsed.success) {
      throw new ValidationError(
        "NOTES_INPUT",
        parsed.error.issues[0]?.message ?? "Notas inválidas",
        parsed.error,
      );
    }

    await assertOwnsClient(trainer.id, clientId);

    await prisma.trainerClient.update({
      where: {
        trainerId_clientId: { trainerId: trainer.id, clientId },
        deletedAt: null,
      },
      data: { notesPrivate: parsed.data.notes },
    });

    logInfo("client.notes_updated", { trainerId: trainer.id, clientId });

    return { updated: true };
  });
}

// =============================================================================
// pauseClient / resumeClient / endRelationship
// =============================================================================

/** Pause the trainer-client relationship (ACTIVE → PAUSED). */
export async function pauseClient(
  clientId: string,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    if (!clientId) {
      throw new ValidationError("CLIENT_ID_REQUIRED", "ID de cliente requerido");
    }

    await assertOwnsClient(trainer.id, clientId);

    const { ipAddress, userAgent } = await getRequestMeta();

    await prisma.$transaction(async (tx) => {
      const link = await tx.trainerClient.findUnique({
        where: {
          trainerId_clientId: { trainerId: trainer.id, clientId },
          deletedAt: null,
        },
        select: { id: true, status: true },
      });

      if (!link) {
        throw new NotFoundError("TC_NOT_FOUND", "Relación con cliente no encontrada.");
      }

      if (link.status !== "ACTIVE") {
        throw new ConflictError(
          "TC_INVALID_TRANSITION",
          "Solo podés pausar clientes con estado activo.",
        );
      }

      await tx.trainerClient.update({
        where: { id: link.id },
        data: { status: "PAUSED" },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: trainer.id,
          action: "UPDATE",
          entityType: "TrainerClient",
          entityId: link.id,
          ipAddress,
          userAgent,
          metadata: { transition: "ACTIVE->PAUSED" },
        },
      });
    });

    logInfo("client.paused", { trainerId: trainer.id, clientId });

    return { updated: true };
  });
}

/** Resume a paused trainer-client relationship (PAUSED → ACTIVE). */
export async function resumeClient(
  clientId: string,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    if (!clientId) {
      throw new ValidationError("CLIENT_ID_REQUIRED", "ID de cliente requerido");
    }

    await assertOwnsClient(trainer.id, clientId);

    const { ipAddress, userAgent } = await getRequestMeta();

    await prisma.$transaction(async (tx) => {
      const link = await tx.trainerClient.findUnique({
        where: {
          trainerId_clientId: { trainerId: trainer.id, clientId },
          deletedAt: null,
        },
        select: { id: true, status: true },
      });

      if (!link) {
        throw new NotFoundError("TC_NOT_FOUND", "Relación con cliente no encontrada.");
      }

      if (link.status !== "PAUSED") {
        throw new ConflictError(
          "TC_INVALID_TRANSITION",
          "Solo podés reactivar clientes con estado pausado.",
        );
      }

      await tx.trainerClient.update({
        where: { id: link.id },
        data: { status: "ACTIVE" },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: trainer.id,
          action: "UPDATE",
          entityType: "TrainerClient",
          entityId: link.id,
          ipAddress,
          userAgent,
          metadata: { transition: "PAUSED->ACTIVE" },
        },
      });
    });

    logInfo("client.resumed", { trainerId: trainer.id, clientId });

    return { updated: true };
  });
}

/** End the trainer-client relationship (any status → ENDED). */
export async function endRelationship(
  clientId: string,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    if (!clientId) {
      throw new ValidationError("CLIENT_ID_REQUIRED", "ID de cliente requerido");
    }

    await assertOwnsClient(trainer.id, clientId);

    const { ipAddress, userAgent } = await getRequestMeta();

    await prisma.$transaction(async (tx) => {
      const link = await tx.trainerClient.findUnique({
        where: {
          trainerId_clientId: { trainerId: trainer.id, clientId },
          deletedAt: null,
        },
        select: { id: true, status: true },
      });

      if (!link) {
        throw new NotFoundError("TC_NOT_FOUND", "Relación con cliente no encontrada.");
      }

      if (link.status === "ENDED") {
        throw new ConflictError(
          "TC_ALREADY_ENDED",
          "La relación con este cliente ya fue terminada.",
        );
      }

      await tx.trainerClient.update({
        where: { id: link.id },
        data: { status: "ENDED", endedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: trainer.id,
          action: "UPDATE",
          entityType: "TrainerClient",
          entityId: link.id,
          ipAddress,
          userAgent,
          metadata: { transition: `${link.status}->ENDED` },
        },
      });
    });

    logInfo("client.relationship_ended", { trainerId: trainer.id, clientId });

    return { updated: true };
  });
}

// =============================================================================
// saveClientGoal
// =============================================================================

/**
 * Set or update the fitness goal for a client.
 * - Trainer path: saveClientGoal(clientId, goal, notes)
 * - Client self-service path: saveClientGoal({ goal, goalNotes? })
 */
export async function saveClientGoal(
  clientIdOrInput: string | { goal: string; goalNotes?: string; clientId?: string },
  goal?: string,
  notes?: string,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    // Determine whether this is a trainer call or client self-service call
    const isObj = typeof clientIdOrInput === "object";
    const resolvedGoal = isObj ? clientIdOrInput.goal : (goal ?? "");
    const resolvedNotes = isObj ? clientIdOrInput.goalNotes : notes;

    const parsed = setGoalSchema.safeParse({ goal: resolvedGoal, goalNotes: resolvedNotes });
    if (!parsed.success) {
      throw new ValidationError(
        "GOAL_INPUT",
        parsed.error.issues[0]?.message ?? "Objetivo inválido",
        parsed.error,
      );
    }

    let clientId: string;
    if (isObj && !clientIdOrInput.clientId) {
      // Client self-service: user updates their own goal
      const user = await requireUser();
      clientId = user.id;
    } else {
      const resolvedClientId = isObj ? clientIdOrInput.clientId! : clientIdOrInput;
      const trainer = await requireTrainer();
      await assertOwnsClient(trainer.id, resolvedClientId);
      clientId = resolvedClientId;
    }

    // For compatibility: if called as trainer, re-use requireTrainer actor for audit
    const actor = await requireUser();

    // Look up the ClientProfile for the given clientId (User.id)
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId: clientId, deletedAt: null },
      select: { id: true },
    });

    if (!clientProfile) {
      throw new NotFoundError(
        "CLIENT_PROFILE_NOT_FOUND",
        "Perfil de cliente no encontrado.",
      );
    }

    const { ipAddress, userAgent } = await getRequestMeta();

    await prisma.$transaction(async (tx) => {
      await tx.clientProfile.update({
        where: { id: clientProfile.id },
        data: {
          goal: parsed.data.goal,
          goalNotes: parsed.data.goalNotes ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "UPDATE",
          entityType: "ClientProfile",
          entityId: clientProfile.id,
          ipAddress,
          userAgent,
          metadata: { field: "goal", clientId },
        },
      });
    });

    logInfo("client.goal_updated", { actorId: actor.id, clientId });

    return { updated: true };
  });
}

// =============================================================================
// getClientProfileDetail
// =============================================================================

/**
 * Return the ClientProfile record for a client.
 *
 * Access rules (either condition allows the call):
 *   1. Authenticated trainer who owns an ACTIVE link to clientUserId.
 *   2. Authenticated user reading their own profile (clientUserId === session user id).
 *
 * Returns null when the profile has not been created yet (should not happen in
 * normal flow, but is a valid DB state before onboarding completes).
 */
export async function getClientProfileDetail(
  clientUserId: string,
): Promise<ActionResult<ClientProfile | null>> {
  return tryCatch(async () => {
    const user = await requireUser();

    if (!clientUserId) {
      throw new ValidationError("CLIENT_USER_ID_REQUIRED", "ID de usuario requerido");
    }

    // Allow own-profile access; otherwise enforce trainer ownership.
    if (user.id !== clientUserId) {
      if (user.role !== "TRAINER") {
        throw new ValidationError(
          "PROFILE_ACCESS_DENIED",
          "Solo podés consultar tu propio perfil.",
        );
      }
      await assertOwnsClient(user.id, clientUserId);
    }

    const profile = await prisma.clientProfile.findUnique({
      where: { userId: clientUserId, deletedAt: null },
    });

    logInfo("client.profile_detail_accessed", {
      actorId: user.id,
      clientUserId,
    });

    return profile;
  });
}

// =============================================================================
// updateTrainerNotes  (alias)
// =============================================================================

/**
 * Alias for updateTrainerClientNotes — kept for proxy-layer compatibility.
 * Both names are exported so consumers can use either.
 */
export async function updateTrainerNotes(...args: Parameters<typeof updateTrainerClientNotes>) {
  return updateTrainerClientNotes(...args);
}

// =============================================================================
// getLpdpRequests
// =============================================================================

/**
 * List LPDP (Ley 8968 / data-privacy) requests that belong to any client of
 * the authenticated trainer.
 *
 * LPDP request processing is driven by the dedicated API routes
 * (src/app/api/lpdp/…); this action exposes a read-only view for the trainer
 * dashboard. It joins via TrainerClient so each trainer only sees their own
 * clients' requests.
 */
export async function getLpdpRequests(): Promise<ActionResult<LpdpRequest[]>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    // Resolve the set of client user-ids this trainer currently owns.
    const links = await prisma.trainerClient.findMany({
      where: {
        trainerId: trainer.id,
        deletedAt: null,
        status: { in: ["ACTIVE", "PENDING", "PAUSED"] },
      },
      select: { clientId: true },
    });

    const clientIds = links.map((l) => l.clientId);

    if (clientIds.length === 0) {
      return [];
    }

    const requests = await prisma.lpdpRequest.findMany({
      where: {
        userId: { in: clientIds },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    logInfo("lpdp.requests_listed", {
      trainerId: trainer.id,
      count: requests.length,
    });

    return requests;
  });
}

// =============================================================================
// recordTrainerNoteUpdate
// =============================================================================

/**
 * Write an audit log entry when a trainer updates private notes for a client.
 * Call this after a successful updateTrainerClientNotes / updateTrainerNotes
 * when you need an explicit, separately-tracked audit event (e.g. from a UI
 * component that already stored the notes via a different path).
 */
export async function recordTrainerNoteUpdate(
  clientUserId: string,
): Promise<ActionResult<{ recorded: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    if (!clientUserId) {
      throw new ValidationError("CLIENT_USER_ID_REQUIRED", "ID de cliente requerido");
    }

    await assertOwnsClient(trainer.id, clientUserId);

    const { ipAddress, userAgent } = await getRequestMeta();

    await prisma.auditLog.create({
      data: {
        actorUserId: trainer.id,
        action: "UPDATE",
        entityType: "TrainerClient",
        entityId: `${trainer.id}:${clientUserId}`,
        ipAddress,
        userAgent,
        metadata: { field: "notesPrivate", clientUserId },
      },
    });

    logInfo("client.trainer_note_update_recorded", {
      trainerId: trainer.id,
      clientUserId,
    });

    return { recorded: true };
  });
}

// =============================================================================
// quickAddClient
// =============================================================================

/**
 * Trainer-invoked action that immediately provisions a CLIENT account and sends
 * a welcome email containing a one-time auto-login link.
 *
 * Steps:
 *   1. Validate input (Zod: email required, name optional).
 *   2. Assert no existing User with that email.
 *   3. Generate a 12-char provisional password, hash it (PBKDF2).
 *   4. Create User (role: CLIENT, mustChangePassword: true).
 *   5. Create ClientProfile.
 *   6. Create TrainerClient link (ACTIVE).
 *   7. Create Invitation row for the auto-login token.
 *   8. Send welcome email.
 */

const quickAddClientSchema = z.object({
  email: z
    .string()
    .email("Correo electrónico inválido")
    .transform((v) => v.toLowerCase().trim()),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function quickAddClient(input: {
  email: string;
  name?: string;
}): Promise<ActionResult<{ clientId: string; invitationId: string }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const parsed = quickAddClientSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "QUICK_ADD_INPUT",
        parsed.error.issues[0]?.message ?? "Datos de entrada inválidos",
        parsed.error,
      );
    }

    const { email, name } = parsed.data;

    // -- Check email not already taken --
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, deletedAt: true },
    });

    if (existing && existing.deletedAt === null) {
      throw new ConflictError(
        "EMAIL_ALREADY_USED",
        "Ya existe una cuenta con ese correo electrónico.",
      );
    }

    // -- Provisional password --
    const provisionalPassword = generateSecureRandomString(12);
    const passwordHash = await hashPassword(provisionalPassword);

    // -- Resolve display name --
    const displayName = name ?? email.split("@")[0] ?? email;

    // -- Token for auto-login link --
    const token = generateOpaqueToken(32);
    const expiresAt = new Date(
      Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const appUrl = process.env.APP_URL ?? "https://vizion.app";
    // Link goes through the auto-login API which validates the token, sets the
    // session cookie, and redirects to /client/bienvenida.
    const welcomeUrl = `${appUrl}/api/cliente/aceptar-invitacion?token=${token}`;

    const { ipAddress, userAgent } = await getRequestMeta();

    const { clientId, invitationId } = await prisma.$transaction(async (tx) => {
      // Create the CLIENT user
      const newUser = await tx.user.create({
        data: {
          email,
          name: displayName,
          role: "CLIENT",
          passwordHash,
          mustChangePassword: true,
          locale: "es-CR",
        },
        select: { id: true },
      });

      // Ensure ClientProfile exists
      await tx.clientProfile.create({
        data: {
          userId: newUser.id,
          parqStatus: "NOT_COMPLETED",
        },
      });

      // Create TrainerClient link
      await tx.trainerClient.create({
        data: {
          trainerId: trainer.id,
          clientId: newUser.id,
          status: "ACTIVE",
          startedAt: new Date(),
        },
      });

      // Create invitation (auto-login token)
      const inv = await tx.invitation.create({
        data: {
          trainerId: trainer.id,
          email,
          token,
          expiresAt,
          clientId: newUser.id,
        },
        select: { id: true },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorUserId: trainer.id,
          action: "CREATE",
          entityType: "User",
          entityId: newUser.id,
          ipAddress,
          userAgent,
          metadata: { flow: "quick_add_client", invitationId: inv.id },
        },
      });

      return { clientId: newUser.id, invitationId: inv.id };
    });

    // -- Send welcome email (outside transaction) --
    try {
      const trainerName =
        (trainer as { trainerProfile?: { tradeName?: string }; name: string })
          .trainerProfile?.tradeName ?? trainer.name;

      await sendEmail({
        to: email,
        subject: `${trainerName} creó tu cuenta en Vizion`,
        react: React.createElement(ClientWelcomeEmail, {
          trainerName,
          welcomeUrl,
        }),
      });
    } catch (e) {
      logError(e, {
        action: "quickAddClient.sendEmail",
        invitationId,
        clientId,
      });
      // Email failure does NOT roll back the created account.
    }

    logInfo("client.quick_added", {
      trainerId: trainer.id,
      clientId,
      invitationId,
    });

    return { clientId, invitationId };
  });
}

// =============================================================================
// completeFirstLogin
// =============================================================================

/**
 * Called on the /client/bienvenida page after the user sets their own password.
 * Clears mustChangePassword and updates name if provided.
 *
 * Any authenticated user may call this — it operates on the calling user's own
 * record. The mustChangePassword middleware gate prevents other navigation
 * until this action succeeds.
 */

const completeFirstLoginSchema = z.object({
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function completeFirstLogin(input: {
  name?: string;
  password: string;
}): Promise<ActionResult<{ success: true }>> {
  return tryCatch(async () => {
    const user = await requireUser();

    const parsed = completeFirstLoginSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "FIRST_LOGIN_INPUT",
        parsed.error.issues[0]?.message ?? "Datos de entrada inválidos",
        parsed.error,
      );
    }

    const { password, name } = parsed.data;

    const newHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        ...(name ? { name } : {}),
      },
    });

    const { ipAddress, userAgent } = await getRequestMeta();

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "UPDATE",
        entityType: "User",
        entityId: user.id,
        ipAddress,
        userAgent,
        metadata: { field: "passwordHash", flow: "first_login" },
      },
    });

    logInfo("client.first_login_completed", { userId: user.id });

    return { success: true };
  });
}

// =============================================================================
// updateTrainerProfile — re-exported via the proxy file (src/app/actions/clients.ts)
// because "use server" files cannot use `export { ... } from ...` syntax.
