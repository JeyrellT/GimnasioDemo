"use server";
// =============================================================================
// VIZION — Onboarding wizard server actions
// Owner: backend-api.
//
// The onboarding wizard has two modes:
//   TRAINER_SIDE — trainer fills the form during a face-to-face intake session.
//   INVITE       — client self-completes via an invitation link.
//
// Drafts expire after 30 days. Completion is atomic (Prisma transaction).
// =============================================================================

import { prisma, Prisma } from "@/server/db";
import { requireTrainer, requireUser } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { logInfo, logError } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import type { OnboardingMode } from "@prisma/client";

// =============================================================================
// Helper types
// =============================================================================

export interface OnboardingDraftDetail {
  id: string;
  trainerId: string;
  mode: OnboardingMode;
  invitationId: string | null;
  clientUserId: string | null;
  currentStep: number;
  dataJson: Record<string, unknown>;
  aiConsentGranted: boolean;
  aiConsentGrantedAt: Date | null;
  cedulaExtractionCount: number;
  workoutPhotoExtractionCount: number;
  completedAt: Date | null;
  abandonedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingDraftSummary {
  id: string;
  mode: OnboardingMode;
  currentStep: number;
  clientUserId: string | null;
  completedAt: Date | null;
  abandonedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

// =============================================================================
// Internal audit helper
// =============================================================================

async function writeAuditLog(
  actorUserId: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        action: "UPDATE",
        entityType: "OnboardingDraft",
        entityId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    logError(e, { fn: "onboarding.writeAuditLog", entityId });
  }
}

// =============================================================================
// createOnboardingDraft
// =============================================================================

export async function createOnboardingDraft(
  formData: FormData,
): Promise<ActionResult<{ draftId: string }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const rawMode = formData.get("mode") as OnboardingMode;
    const validModes: OnboardingMode[] = ["TRAINER_SIDE", "INVITE"];

    if (!validModes.includes(rawMode)) {
      throw new ValidationError(
        "INVALID_MODE",
        "El modo de onboarding no es válido.",
      );
    }

    const rawInvitationId = formData.get("invitationId");
    const invitationId =
      typeof rawInvitationId === "string" && rawInvitationId.trim()
        ? rawInvitationId.trim()
        : null;

    const rawClientUserId = formData.get("clientUserId");
    const clientUserId =
      typeof rawClientUserId === "string" && rawClientUserId.trim()
        ? rawClientUserId.trim()
        : null;

    // If INVITE mode, an invitationId is required
    if (rawMode === "INVITE" && !invitationId) {
      throw new ValidationError(
        "MISSING_INVITATION",
        "El modo de invitación requiere un ID de invitación.",
      );
    }

    // Validate the invitation belongs to this trainer
    if (invitationId) {
      const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId },
        select: { id: true, trainerId: true, usedAt: true, expiresAt: true },
      });

      if (!invitation) {
        throw new NotFoundError(
          "INVITATION_NOT_FOUND",
          "La invitación no existe.",
        );
      }

      if (invitation.trainerId !== trainer.id) {
        throw new ForbiddenError(
          "INVITATION_NOT_OWNED",
          "Esta invitación no te pertenece.",
        );
      }

      if (invitation.usedAt) {
        throw new ValidationError(
          "INVITATION_USED",
          "Esta invitación ya fue utilizada.",
        );
      }

      if (invitation.expiresAt < new Date()) {
        throw new ValidationError(
          "INVITATION_EXPIRED",
          "Esta invitación expiró.",
        );
      }
    }

    // Drafts expire 30 days from creation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const draft = await prisma.onboardingDraft.create({
      data: {
        trainerId: trainer.id,
        mode: rawMode,
        invitationId,
        clientUserId,
        currentStep: 0,
        // Prisma requires a serializable InputJsonValue — cast empty object
        dataJson: {} as Prisma.InputJsonValue,
        expiresAt,
      },
      select: { id: true },
    });

    await writeAuditLog(trainer.id, draft.id, { action: "CREATE", mode: rawMode });

    logInfo("Onboarding draft created", {
      trainerId: trainer.id,
      draftId: draft.id,
      mode: rawMode,
    });

    return { draftId: draft.id };
  });
}

// =============================================================================
// updateOnboardingStep
// =============================================================================

export async function updateOnboardingStep(
  draftId: string,
  step: number,
  data: Record<string, unknown>,
): Promise<ActionResult<{ updated: true }>> {
  return tryCatch(async () => {
    const actor = await requireUser();

    const draft = await prisma.onboardingDraft.findUnique({
      where: { id: draftId },
      select: {
        id: true,
        trainerId: true,
        clientUserId: true,
        completedAt: true,
        abandonedAt: true,
        expiresAt: true,
        dataJson: true,
      },
    });

    if (!draft) {
      throw new NotFoundError("DRAFT_NOT_FOUND", "Borrador no encontrado.");
    }

    // Access: trainer who owns the draft, or the linked client
    const isTrainer = actor.id === draft.trainerId;
    const isLinkedClient =
      draft.clientUserId !== null && actor.id === draft.clientUserId;

    if (!isTrainer && !isLinkedClient) {
      throw new ForbiddenError(
        "DRAFT_NOT_OWNED",
        "No tenés acceso a este borrador.",
      );
    }

    if (draft.completedAt) {
      throw new ValidationError(
        "DRAFT_COMPLETED",
        "Este onboarding ya fue completado.",
      );
    }

    if (draft.abandonedAt) {
      throw new ValidationError(
        "DRAFT_ABANDONED",
        "Este onboarding fue abandonado.",
      );
    }

    if (draft.expiresAt < new Date()) {
      throw new ValidationError(
        "DRAFT_EXPIRED",
        "Este borrador de onboarding expiró.",
      );
    }

    if (!Number.isInteger(step) || step < 0) {
      throw new ValidationError("INVALID_STEP", "El paso no es válido.");
    }

    // Merge new data into existing dataJson
    const existingData = (draft.dataJson as Record<string, unknown>) ?? {};
    const mergedData = { ...existingData, [`step_${step}`]: data };

    await prisma.onboardingDraft.update({
      where: { id: draftId },
      data: {
        currentStep: step,
        dataJson: mergedData as Prisma.InputJsonValue,
      },
    });

    return { updated: true };
  });
}

// =============================================================================
// completeOnboarding
// Creates/updates User, ClientProfile, InitialAssessment, ParqAnswers, Consents
// in a single transaction.
// =============================================================================

export async function completeOnboarding(
  draftId: string,
): Promise<ActionResult<{ userId: string }>> {
  return tryCatch(async () => {
    const actor = await requireUser();

    const draft = await prisma.onboardingDraft.findUnique({
      where: { id: draftId },
      select: {
        id: true,
        trainerId: true,
        clientUserId: true,
        mode: true,
        invitationId: true,
        dataJson: true,
        completedAt: true,
        abandonedAt: true,
        expiresAt: true,
      },
    });

    if (!draft) {
      throw new NotFoundError("DRAFT_NOT_FOUND", "Borrador no encontrado.");
    }

    if (actor.id !== draft.trainerId) {
      throw new ForbiddenError(
        "DRAFT_NOT_OWNED",
        "Solo el entrenador puede finalizar el onboarding.",
      );
    }

    if (draft.completedAt) {
      throw new ValidationError(
        "DRAFT_ALREADY_COMPLETED",
        "Este onboarding ya fue completado.",
      );
    }

    if (draft.abandonedAt) {
      throw new ValidationError(
        "DRAFT_ABANDONED",
        "Este onboarding fue abandonado.",
      );
    }

    if (draft.expiresAt < new Date()) {
      throw new ValidationError(
        "DRAFT_EXPIRED",
        "Este borrador expiró. Iniciá uno nuevo.",
      );
    }

    // Parse accumulated form data from dataJson
    const data = (draft.dataJson as Record<string, Record<string, unknown>>) ?? {};

    // Gather step data — the keys are "step_0", "step_1", etc.
    const allStepData: Record<string, unknown> = {};
    for (const [, v] of Object.entries(data)) {
      if (typeof v === "object" && v !== null) {
        Object.assign(allStepData, v);
      }
    }

    // Minimal required fields
    const email = allStepData["email"] as string | undefined;
    const name = allStepData["name"] as string | undefined;

    if (!email || !name) {
      throw new ValidationError(
        "MISSING_REQUIRED_FIELDS",
        "El nombre y el correo electrónico son requeridos para completar el onboarding.",
      );
    }

    const userId = await prisma.$transaction(async (tx) => {
      // 1. Create or update User
      const user = await tx.user.upsert({
        where: { email: email.toLowerCase().trim() },
        create: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          role: "CLIENT",
          dateOfBirth: allStepData["dateOfBirth"]
            ? new Date(allStepData["dateOfBirth"] as string)
            : undefined,
          gender:
            (allStepData["gender"] as "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_SAY" | undefined) ??
            undefined,
        },
        update: {
          name: name.trim(),
          dateOfBirth: allStepData["dateOfBirth"]
            ? new Date(allStepData["dateOfBirth"] as string)
            : undefined,
        },
        select: { id: true },
      });

      // 2. Create or update ClientProfile
      await tx.clientProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          goal:
            (allStepData["goal"] as
              | "FAT_LOSS"
              | "MUSCLE_GAIN"
              | "MAINTENANCE"
              | "PERFORMANCE"
              | "GENERAL_HEALTH"
              | undefined) ?? undefined,
          heightCm: allStepData["heightCm"] !== undefined
            ? Number(allStepData["heightCm"])
            : undefined,
          weightKg: allStepData["weightKg"] !== undefined
            ? Number(allStepData["weightKg"])
            : undefined,
          locationCity:
            (allStepData["locationCity"] as string | undefined) ?? undefined,
        },
        update: {
          goal:
            (allStepData["goal"] as
              | "FAT_LOSS"
              | "MUSCLE_GAIN"
              | "MAINTENANCE"
              | "PERFORMANCE"
              | "GENERAL_HEALTH"
              | undefined) ?? undefined,
          heightCm: allStepData["heightCm"] !== undefined
            ? Number(allStepData["heightCm"])
            : undefined,
          weightKg: allStepData["weightKg"] !== undefined
            ? Number(allStepData["weightKg"])
            : undefined,
        },
      });

      // 3. Create InitialAssessment if we have height + weight
      const heightCm = allStepData["heightCm"]
        ? Number(allStepData["heightCm"])
        : null;
      const weightKg = allStepData["weightKg"]
        ? Number(allStepData["weightKg"])
        : null;

      if (heightCm && weightKg) {
        const existingAssessment = await tx.initialAssessment.findUnique({
          where: { clientUserId: user.id },
          select: { id: true },
        });

        if (!existingAssessment) {
          await tx.initialAssessment.create({
            data: {
              clientUserId: user.id,
              heightCm,
              weightKg,
              bodyFatPct: allStepData["bodyFatPct"] !== undefined
                ? Number(allStepData["bodyFatPct"])
                : undefined,
              restingHrBpm: allStepData["restingHrBpm"] !== undefined
                ? Number(allStepData["restingHrBpm"])
                : undefined,
              waistCm: allStepData["waistCm"] !== undefined
                ? Number(allStepData["waistCm"])
                : undefined,
              hipCm: allStepData["hipCm"] !== undefined
                ? Number(allStepData["hipCm"])
                : undefined,
              neckCm: allStepData["neckCm"] !== undefined
                ? Number(allStepData["neckCm"])
                : undefined,
              chestCm: allStepData["chestCm"] !== undefined
                ? Number(allStepData["chestCm"])
                : undefined,
              armCm: allStepData["armCm"] !== undefined
                ? Number(allStepData["armCm"])
                : undefined,
              thighCm: allStepData["thighCm"] !== undefined
                ? Number(allStepData["thighCm"])
                : undefined,
            },
          });
        }
      }

      // 4. Create TERMS + HEALTH_DATA consents (required)
      const consentVersion = "1.0";
      const now = new Date();

      const consentTypes: Array<"TERMS_AND_PRIVACY" | "HEALTH_DATA"> = [
        "TERMS_AND_PRIVACY",
        "HEALTH_DATA",
      ];

      for (const type of consentTypes) {
        const existing = await tx.consent.findFirst({
          where: { userId: user.id, type },
          select: { id: true },
        });
        if (!existing) {
          await tx.consent.create({
            data: {
              userId: user.id,
              type,
              granted: true,
              version: consentVersion,
              grantedAt: now,
            },
          });
        }
      }

      // 5. Create TrainerClient link if not already present
      const existingLink = await tx.trainerClient.findUnique({
        where: {
          trainerId_clientId: {
            trainerId: draft.trainerId,
            clientId: user.id,
          },
        },
        select: { id: true },
      });

      if (!existingLink) {
        await tx.trainerClient.create({
          data: {
            trainerId: draft.trainerId,
            clientId: user.id,
            status: "ACTIVE",
          },
        });
      }

      // 6. Mark invitation as used if present
      if (draft.invitationId) {
        await tx.invitation.update({
          where: { id: draft.invitationId },
          data: { usedAt: now, clientId: user.id },
        });
      }

      // 7. Mark draft as completed
      await tx.onboardingDraft.update({
        where: { id: draftId },
        data: {
          completedAt: now,
          clientUserId: user.id,
        },
      });

      return user.id;
    });

    await writeAuditLog(actor.id, draftId, {
      action: "COMPLETE",
      newUserId: userId,
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "CREATE",
        entityType: "User",
        entityId: userId,
        metadata: { source: "onboarding", draftId },
      },
    });

    logInfo("Onboarding completed", {
      trainerId: actor.id,
      draftId,
      newUserId: userId,
    });

    return { userId };
  });
}

// =============================================================================
// getOnboardingDraft
// =============================================================================

export async function getOnboardingDraft(
  draftId: string,
): Promise<ActionResult<OnboardingDraftDetail>> {
  return tryCatch(async () => {
    const actor = await requireUser();

    const draft = await prisma.onboardingDraft.findUnique({
      where: { id: draftId },
      select: {
        id: true,
        trainerId: true,
        mode: true,
        invitationId: true,
        clientUserId: true,
        currentStep: true,
        dataJson: true,
        aiConsentGranted: true,
        aiConsentGrantedAt: true,
        cedulaExtractionCount: true,
        workoutPhotoExtractionCount: true,
        completedAt: true,
        abandonedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!draft) {
      throw new NotFoundError("DRAFT_NOT_FOUND", "Borrador no encontrado.");
    }

    const isTrainer = actor.id === draft.trainerId;
    const isLinkedClient =
      draft.clientUserId !== null && actor.id === draft.clientUserId;

    if (!isTrainer && !isLinkedClient) {
      throw new ForbiddenError(
        "DRAFT_NOT_OWNED",
        "No tenés acceso a este borrador.",
      );
    }

    return {
      ...draft,
      dataJson: (draft.dataJson as Record<string, unknown>) ?? {},
    };
  });
}

// =============================================================================
// listOnboardingDrafts
// =============================================================================

export async function listOnboardingDrafts(): Promise<
  ActionResult<{ drafts: OnboardingDraftSummary[] }>
> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const drafts = await prisma.onboardingDraft.findMany({
      where: {
        trainerId: trainer.id,
        completedAt: null,
        abandonedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        mode: true,
        currentStep: true,
        clientUserId: true,
        completedAt: true,
        abandonedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      take: 50,
    });

    return { drafts };
  });
}
