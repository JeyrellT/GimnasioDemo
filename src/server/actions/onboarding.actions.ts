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
import { requireTrainer, requireUser, assertOwnsClient } from "@/server/guards";
import { tryCatch } from "@/lib/result";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { logInfo, logError } from "@/lib/logger";
import { MAX_PHOTO_SIZE_BYTES } from "@/lib/consts";
import {
  generateStorageKey,
  uploadFile,
  BucketType,
} from "@/lib/storage/upload";
import type { ActionResult } from "@/types/api";
import type { OnboardingMode } from "@prisma/client";
import type {
  OnboardingCedulaExtraction,
  OnboardingDraftDTO,
  OnboardingPayload,
} from "@/types/onboarding";
import type { WorkoutPhotoExtraction } from "@/lib/ai/extract-workout-photos";

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
  data: object,
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
    const mergedData = { ...existingData, [`step${step}`]: data };

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
): Promise<ActionResult<{ clientUserId: string }>> {
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

    return { clientUserId: userId };
  });
}

// =============================================================================
// getOnboardingDraft
// =============================================================================

export async function getOnboardingDraft(
  draftId: string,
): Promise<ActionResult<OnboardingDraftDTO>> {
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

    // Transform to DTO format expected by frontend
    const draftData = (draft.dataJson as Record<string, unknown>) ?? {};
    return {
      id: draft.id,
      mode: draft.mode,
      currentStep: Math.max(1, draft.currentStep),
      data: draftData as Partial<OnboardingPayload>,
      aiConsentGranted: draft.aiConsentGranted,
      cedulaExtractionCount: draft.cedulaExtractionCount,
      workoutPhotoExtractionCount: draft.workoutPhotoExtractionCount,
      expiresAt: draft.expiresAt.toISOString(),
      completedAt: draft.completedAt?.toISOString() ?? null,
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

// =============================================================================
// saveOnboardingStep — alias of updateOnboardingStep
// =============================================================================

export async function saveOnboardingStep(...args: Parameters<typeof updateOnboardingStep>) {
  return updateOnboardingStep(...args);
}

// =============================================================================
// createClientFromOnboarding — alias of completeOnboarding
// =============================================================================

export async function createClientFromOnboarding(...args: Parameters<typeof completeOnboarding>) {
  return completeOnboarding(...args);
}

// =============================================================================
// abandonOnboardingDraft
// Soft-deletes a draft by setting abandonedAt. Trainer must own the draft.
// =============================================================================

export async function abandonOnboardingDraft(
  draftId: string,
): Promise<ActionResult<{ abandoned: true }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const draft = await prisma.onboardingDraft.findUnique({
      where: { id: draftId },
      select: {
        id: true,
        trainerId: true,
        completedAt: true,
        abandonedAt: true,
      },
    });

    if (!draft) {
      throw new NotFoundError("DRAFT_NOT_FOUND", "Borrador no encontrado.");
    }

    if (draft.trainerId !== trainer.id) {
      throw new ForbiddenError(
        "DRAFT_NOT_OWNED",
        "Este borrador no te pertenece.",
      );
    }

    if (draft.completedAt) {
      throw new ValidationError(
        "DRAFT_COMPLETED",
        "No se puede abandonar un onboarding ya completado.",
      );
    }

    if (draft.abandonedAt) {
      throw new ValidationError(
        "DRAFT_ALREADY_ABANDONED",
        "Este borrador ya fue abandonado.",
      );
    }

    await prisma.onboardingDraft.update({
      where: { id: draftId },
      data: { abandonedAt: new Date() },
    });

    await writeAuditLog(trainer.id, draftId, { action: "ABANDON" });

    logInfo("Onboarding draft abandoned", {
      trainerId: trainer.id,
      draftId,
    });

    return { abandoned: true };
  });
}

// =============================================================================
// grantAiConsent
// Sets aiConsentGranted=true on an onboarding draft and creates an AI_PROCESSING
// Consent record if a clientUserId is already linked to the draft.
// Takes draftId to match the component call-site contract.
// =============================================================================

export async function grantAiConsent(
  draftId: string,
): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const draft = await prisma.onboardingDraft.findUnique({
      where: { id: draftId },
      select: { id: true, trainerId: true, clientUserId: true, aiConsentGranted: true },
    });

    if (!draft) {
      throw new NotFoundError("DRAFT_NOT_FOUND", "Borrador no encontrado.");
    }

    if (draft.trainerId !== trainer.id) {
      throw new ForbiddenError(
        "DRAFT_NOT_OWNED",
        "Este borrador no te pertenece.",
      );
    }

    const now = new Date();

    // Mark the draft's aiConsentGranted flag
    await prisma.onboardingDraft.update({
      where: { id: draftId },
      data: { aiConsentGranted: true, aiConsentGrantedAt: now },
    });

    // If the draft already has a linked client, also write a Consent record
    if (draft.clientUserId && !draft.aiConsentGranted) {
      const existingConsent = await prisma.consent.findFirst({
        where: { userId: draft.clientUserId, type: "AI_PROCESSING", revokedAt: null },
        select: { id: true },
      });

      if (!existingConsent) {
        const consent = await prisma.consent.create({
          data: {
            userId: draft.clientUserId,
            type: "AI_PROCESSING",
            granted: true,
            version: "1.0",
            grantedAt: now,
          },
          select: { id: true },
        });

        await prisma.auditLog.create({
          data: {
            actorUserId: trainer.id,
            action: "CREATE",
            entityType: "Consent",
            entityId: consent.id,
            metadata: {
              type: "AI_PROCESSING",
              clientUserId: draft.clientUserId,
              source: "onboarding",
              draftId,
            } as Prisma.InputJsonValue,
          },
        });
      }
    }

    logInfo("AI consent granted on draft", { trainerId: trainer.id, draftId });
  });
}

// =============================================================================
// checkEmailAvailable
// Returns whether an email is free to register.
// =============================================================================

export async function checkEmailAvailable(
  email: string,
): Promise<ActionResult<{ available: boolean }>> {
  return tryCatch(async () => {
    await requireUser();

    if (!email || !email.includes("@")) {
      throw new ValidationError(
        "INVALID_EMAIL",
        "El correo electrónico no es válido.",
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });

    return { available: existing === null };
  });
}

// =============================================================================
// uploadOnboardingImage
// Receives a file blob in FormData, uploads it to R2, and returns the storage
// key + public URL. Return type matches the demo layer's { key, url } contract
// so that onboarding components work without changes.
// =============================================================================

export async function uploadOnboardingImage(
  formData: FormData,
): Promise<ActionResult<{ key: string; url: string }>> {
  return tryCatch(async () => {
    const trainer = await requireTrainer();

    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      throw new ValidationError(
        "UPLOAD_NO_FILE",
        "No se recibió ninguna imagen.",
      );
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      throw new ValidationError(
        "UPLOAD_TOO_LARGE",
        "La imagen supera el límite de 10 MB.",
      );
    }

    const contentType = file.type || "image/jpeg";
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(contentType)) {
      throw new ValidationError(
        "INVALID_CONTENT_TYPE",
        "Tipo de archivo no permitido. Usá JPEG, PNG o WebP.",
      );
    }

    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const key = generateStorageKey("onboarding-images", trainer.id, ext);

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadFile({
      bucket: BucketType.PHOTOS,
      key,
      body: buffer,
      contentType,
    });

    logInfo("Onboarding image uploaded", { trainerId: trainer.id, key });

    return { key, url };
  });
}

// =============================================================================
// extractCedulaForOnboarding
// Stub — server-side OCR not yet implemented. Agent 4 will replace with Gemini.
// Signature matches the demo layer: (draftId, imageKey) → OnboardingCedulaExtraction.
// =============================================================================

export async function extractCedulaForOnboarding(
  _draftId: string,
  _imageKey: string,
): Promise<ActionResult<OnboardingCedulaExtraction>> {
  return tryCatch(async () => {
    await requireTrainer();

    throw new ValidationError(
      "OCR_NOT_IMPLEMENTED",
      "El procesamiento de cédula por IA aún no está disponible en el servidor.",
    );
  });
}

// =============================================================================
// extractWorkoutPhotosForOnboarding
// Stub — server-side photo analysis not yet implemented. Agent 4 replaces with Gemini.
// Signature matches the demo layer: (draftId, imageKeys) → WorkoutPhotoExtraction.
// =============================================================================

export async function extractWorkoutPhotosForOnboarding(
  _draftId: string,
  _imageKeys: string[],
): Promise<ActionResult<WorkoutPhotoExtraction>> {
  return tryCatch(async () => {
    await requireTrainer();

    throw new ValidationError(
      "PHOTO_ANALYSIS_NOT_IMPLEMENTED",
      "El análisis de fotos de entrenamiento por IA aún no está disponible en el servidor.",
    );
  });
}
