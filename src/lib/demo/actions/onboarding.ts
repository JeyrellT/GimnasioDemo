// =============================================================================
// BLACKLINE FITNESS — Demo actions: onboarding lifecycle + AI extraction
//
// AI calls (extractCedulaForOnboarding, extractWorkoutPhotosForOnboarding) hit
// Gemini directly from the browser via the demo gemini-browser client. They
// require:
//   1. The user to have stored a Gemini API key in /trainer/ajustes (localStorage).
//   2. The draft to have aiConsentGranted = true.
//   3. The image blob to have been persisted via uploadOnboardingImage, which
//      stores it in db.photoQueue keyed by storageKey.
// =============================================================================

import { createId } from "@paralleldrive/cuid2";

import { db } from "@/lib/offline/db";
import { err, tryCatch } from "@/lib/result";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import type { ActionResult } from "@/types/api";
import type {
  OnboardingDraftDTO,
  CreateClientResult,
  OnboardingCedulaExtraction,
} from "@/types/onboarding";
import type {
  DemoOnboardingDraftRow,
  DemoClientRow,
  DemoTrainerClientRow,
  LocalPhoto,
} from "@/lib/offline/db";
import type { Gender } from "@prisma/client";

// AI modules are intentionally NOT statically imported — they pull in
// @google/generative-ai (~200 kB) and should only be loaded when the user
// actually triggers an AI extraction action.
import type { WorkoutPhotoExtraction } from "@/lib/ai/extract-workout-photos";

import { DEMO_TRAINER_ID } from "../seed-data";

const DRAFT_TTL_DAYS = 7;

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

function expiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + DRAFT_TTL_DAYS);
  return d.toISOString();
}

async function getDraft(draftId: string): Promise<DemoOnboardingDraftRow> {
  const draft = await db.demoOnboardingDrafts.get(draftId);
  if (!draft) {
    throw new NotFoundError(
      "DRAFT_NOT_FOUND",
      "El borrador de onboarding no existe o no te pertenece.",
    );
  }
  if (draft.completedAt) {
    throw new ForbiddenError(
      "DRAFT_COMPLETED",
      "Este borrador ya fue completado.",
    );
  }
  if (new Date(draft.expiresAt) < new Date()) {
    throw new ForbiddenError(
      "DRAFT_EXPIRED",
      "Este borrador expiró. Creá uno nuevo.",
    );
  }
  return draft;
}

function toDTO(draft: DemoOnboardingDraftRow): OnboardingDraftDTO {
  return {
    id: draft.id,
    mode: draft.mode,
    currentStep: draft.currentStep,
    data: draft.dataJson as OnboardingDraftDTO["data"],
    aiConsentGranted: draft.aiConsentGranted,
    cedulaExtractionCount: draft.cedulaExtractionCount,
    workoutPhotoExtractionCount: draft.workoutPhotoExtractionCount,
    expiresAt: draft.expiresAt,
    completedAt: draft.completedAt,
  };
}

/**
 * Look up a previously uploaded onboarding image by its storage key.
 * uploadOnboardingImage stores the blob with `storageKey` set to the returned
 * `key`, so we can retrieve it without ever hitting the network.
 *
 * NOTE: photoQueue.storageKey is NOT a Dexie index. We filter() rather than
 * where() to avoid a SchemaError. Onboarding flows touch ~3 photos at most so
 * this scan is cheap.
 */
async function findOnboardingPhoto(key: string): Promise<LocalPhoto> {
  const photo = await db.photoQueue
    .filter((p) => p.storageKey === key)
    .first();
  if (!photo) {
    throw new NotFoundError(
      "PHOTO_NOT_FOUND",
      "No encontramos la imagen subida. Probá subirla de nuevo.",
    );
  }
  return photo;
}

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// -----------------------------------------------------------------------------
// Onboarding draft lifecycle
// -----------------------------------------------------------------------------

export async function createOnboardingDraft(
  mode: "TRAINER_SIDE" | "INVITE",
): Promise<ActionResult<{ draftId: string }>> {
  return tryCatch(async () => {
    const id = `draft-${Date.now()}`;
    const now = new Date().toISOString();
    await db.demoOnboardingDrafts.put({
      id,
      trainerId: DEMO_TRAINER_ID,
      mode,
      currentStep: 1,
      dataJson: {},
      aiConsentGranted: false,
      cedulaExtractionCount: 0,
      workoutPhotoExtractionCount: 0,
      expiresAt: expiresAt(),
      completedAt: null,
      createdAt: now,
    });
    return { draftId: id };
  });
}

export async function getOnboardingDraft(
  draftId: string,
): Promise<ActionResult<OnboardingDraftDTO>> {
  return tryCatch(async () => {
    const draft = await getDraft(draftId);
    return toDTO(draft);
  });
}

export async function saveOnboardingStep(
  draftId: string,
  step: number,
  data: unknown,
): Promise<ActionResult<void>> {
  if (!Number.isInteger(step) || step < 1 || step > 8) {
    return err(
      new ValidationError(
        "STEP_NUMBER",
        "El número de paso debe estar entre 1 y 8.",
      ),
    );
  }

  return tryCatch(async () => {
    const draft = await getDraft(draftId);
    const current = (draft.dataJson ?? {}) as Record<string, unknown>;
    await db.demoOnboardingDrafts.update(draftId, {
      dataJson: { ...current, [`step${step}`]: data },
      currentStep: Math.max(draft.currentStep, step),
    });
  });
}

export async function abandonOnboardingDraft(
  draftId: string,
): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    await getDraft(draftId);
    await db.demoOnboardingDrafts.delete(draftId);
  });
}

export async function grantAiConsent(
  draftId: string,
): Promise<ActionResult<void>> {
  return tryCatch(async () => {
    await getDraft(draftId);
    await db.demoOnboardingDrafts.update(draftId, { aiConsentGranted: true });
  });
}

// -----------------------------------------------------------------------------
// uploadOnboardingImage — persists blob in db.photoQueue for downstream AI use
// -----------------------------------------------------------------------------

type UploadPurpose =
  | "cedula_front"
  | "cedula_back"
  | "workout"
  | "progress_front"
  | "progress_side"
  | "progress_back";

function mapPurpose(p: string): LocalPhoto["purpose"] {
  if (p.startsWith("cedula")) return "cedula";
  if (p === "workout") return "scale"; // closest neutral bucket; not a workout-specific enum exists
  if (p.startsWith("progress")) return "progress";
  return "progress";
}

export async function uploadOnboardingImage(
  formData: FormData,
): Promise<ActionResult<{ key: string; url: string }>> {
  return tryCatch(async () => {
    const file = formData.get("file");
    const purpose = (formData.get("purpose") ?? "progress") as UploadPurpose;

    if (!(file instanceof Blob)) {
      throw new ValidationError(
        "UPLOAD_NO_FILE",
        "No se recibió ninguna imagen.",
      );
    }
    if (file.size === 0) {
      throw new ValidationError("UPLOAD_EMPTY", "La imagen está vacía.");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new ValidationError(
        "UPLOAD_TOO_LARGE",
        "La imagen no puede superar 10 MB.",
      );
    }

    const id = createId();
    const storageKey = `demo/onboarding/${purpose}/${id}.jpg`;
    const url = URL.createObjectURL(file);

    const entry: LocalPhoto = {
      id,
      blob: file,
      bucket: "photos",
      purpose: mapPurpose(purpose),
      takenAt: new Date(),
      view: null,
      syncStatus: "synced", // demo mode: pretend it's already on R2
      syncError: null,
      retryCount: 0,
      storageKey,
      createdAt: new Date(),
    };

    await db.photoQueue.put(entry);

    return { key: storageKey, url };
  });
}

// -----------------------------------------------------------------------------
// createClientFromOnboarding
// -----------------------------------------------------------------------------

export async function createClientFromOnboarding(
  draftId: string,
): Promise<ActionResult<CreateClientResult>> {
  return tryCatch(async () => {
    const draft = await getDraft(draftId);
    const payload = draft.dataJson as Record<string, unknown>;
    const step1 = payload.step1 as
      | {
          name?: string;
          email?: string;
          dateOfBirth?: string;
          gender?: string;
          locationCity?: string;
        }
      | undefined;
    const step5 = payload.step5 as
      | { weightKg?: number; heightCm?: number }
      | undefined;
    const step7 = payload.step7 as { monthlyPriceCRC?: number } | undefined;

    if (!step1?.name || !step1?.email) {
      throw new ValidationError(
        "ONBOARDING_STEP1_MISSING",
        "Faltan datos personales (Paso 1).",
      );
    }

    const clientId = `client-new-${Date.now()}`;
    const now = new Date().toISOString();

    const newClient: DemoClientRow = {
      id: clientId,
      name: step1.name,
      email: step1.email,
      avatarUrl: null,
      gender: (step1.gender ?? null) as DemoClientRow["gender"],
      dateOfBirth: step1.dateOfBirth ?? now.slice(0, 10),
      parqStatus: "NOT_COMPLETED",
      goal: null,
      weightKg: step5?.weightKg ?? null,
      heightCm: step5?.heightCm ?? null,
      locationCity: step1.locationCity ?? null,
      encryptedCedula: null,
      createdAt: now,
    };

    const linkId = `tc-new-${Date.now()}`;
    const newLink: DemoTrainerClientRow = {
      id: linkId,
      trainerUserId: DEMO_TRAINER_ID,
      clientUserId: clientId,
      status: "ACTIVE",
      monthlyPriceCRC: step7?.monthlyPriceCRC ?? 0,
      notesPrivate: null,
      startedAt: now,
    };

    await db.demoClients.put(newClient);
    await db.demoTrainerClients.put(newLink);
    await db.demoOnboardingDrafts.update(draftId, { completedAt: now });

    return { clientUserId: clientId, trainerClientId: linkId };
  });
}

export async function checkEmailAvailable(
  email: string,
): Promise<ActionResult<{ available: boolean }>> {
  return tryCatch(async () => {
    const existing = await db.demoClients.where({ email }).count();
    return { available: existing === 0 };
  });
}

// =============================================================================
// AI extraction
// =============================================================================

function mapSexToGender(sex: "M" | "F" | null): Gender | undefined {
  if (sex === "M") return "MALE" as Gender;
  if (sex === "F") return "FEMALE" as Gender;
  return undefined;
}

export async function extractCedulaForOnboarding(
  draftId: string,
  imageKey: string,
): Promise<ActionResult<OnboardingCedulaExtraction>> {
  return tryCatch(async () => {
    const draft = await getDraft(draftId);

    if (!draft.aiConsentGranted) {
      throw new ValidationError(
        "AI_CONSENT_REQUIRED",
        "Aceptá el procesamiento por IA antes de continuar.",
      );
    }
    if (draft.cedulaExtractionCount >= 1) {
      throw new ValidationError(
        "CEDULA_LIMIT",
        "Ya extrajiste la cédula para este borrador. Editá los datos manualmente si necesitás cambios.",
      );
    }

    const photo = await findOnboardingPhoto(imageKey);
    const buffer = await blobToBuffer(photo.blob);
    const mimeType = photo.blob.type || "image/jpeg";

    const { extractCedula } = await import("@/lib/ai/ocr-cedula");
    const extraction = await extractCedula({ imageBuffer: buffer, mimeType });
    if (!extraction.ok) throw extraction.error;

    // Increment the counter only on success — failed calls don't consume the slot.
    await db.demoOnboardingDrafts.update(draftId, {
      cedulaExtractionCount: draft.cedulaExtractionCount + 1,
    });

    const e = extraction.value;

    if (!e.isValidId) {
      throw new ValidationError(
        "CEDULA_NOT_VALID",
        "La imagen no parece ser una cédula costarricense válida. Probá con otra foto.",
      );
    }

    const fullName =
      [e.nombre, e.primerApellido, e.segundoApellido]
        .filter((s): s is string => Boolean(s))
        .join(" ")
        .trim() || undefined;

    const result: OnboardingCedulaExtraction = {
      fullName,
      idNumber: e.numeroCedula ?? undefined,
      dateOfBirth: e.fechaNacimiento ?? undefined,
      gender: mapSexToGender(e.sexo),
      approved: false,
    };

    return result;
  });
}

export async function extractWorkoutPhotosForOnboarding(
  draftId: string,
  imageKeys: string[],
): Promise<ActionResult<WorkoutPhotoExtraction>> {
  return tryCatch(async () => {
    const draft = await getDraft(draftId);

    if (!draft.aiConsentGranted) {
      throw new ValidationError(
        "AI_CONSENT_REQUIRED",
        "Aceptá el procesamiento por IA antes de continuar.",
      );
    }
    if (draft.workoutPhotoExtractionCount >= 1) {
      throw new ValidationError(
        "WORKOUT_LIMIT",
        "Ya procesaste las fotos para este borrador. Editá los datos manualmente.",
      );
    }
    if (!Array.isArray(imageKeys) || imageKeys.length === 0) {
      throw new ValidationError(
        "WORKOUT_NO_PHOTOS",
        "Subí al menos una foto antes de procesar.",
      );
    }
    if (imageKeys.length > 3) {
      throw new ValidationError(
        "WORKOUT_TOO_MANY",
        "Máximo 3 imágenes por extracción.",
      );
    }

    const images = await Promise.all(
      imageKeys.map(async (key) => {
        const photo = await findOnboardingPhoto(key);
        return {
          buffer: await blobToBuffer(photo.blob),
          mimeType: photo.blob.type || "image/jpeg",
        };
      }),
    );

    const { extractWorkoutPhotos } = await import("@/lib/ai/extract-workout-photos");
    const extraction = await extractWorkoutPhotos({ images });
    if (!extraction.ok) throw extraction.error;

    await db.demoOnboardingDrafts.update(draftId, {
      workoutPhotoExtractionCount: draft.workoutPhotoExtractionCount + 1,
    });

    return extraction.value;
  });
}
