// =============================================================================
// BLACKLINE FITNESS — Onboarding atomic client creation payload builder
// Owner: backend-api.
//
// Called exclusively inside createClientFromOnboarding, which wraps everything
// in a prisma.$transaction. This module only builds Prisma create-args from
// a validated OnboardingPayload — it does NOT execute any queries itself.
// =============================================================================

import type { Prisma } from "@prisma/client";
import type { OnboardingPayload } from "@/types/onboarding";

// ── PAR-Q helpers ─────────────────────────────────────────────────────────────

export interface ParqAnswerCreateArgs {
  questionCode: string;
  question: string;
  answer: boolean;
}

/**
 * Convert the flat parqAnswers record into rows for ParqAnswer.createMany.
 * The question text is not stored in the payload — the code itself is the
 * canonical identifier. We store the code both as questionCode and as question
 * text for readability in exports.
 */
export function buildParqAnswerRows(
  parqAnswers: Record<string, "yes" | "no">,
): ParqAnswerCreateArgs[] {
  return Object.entries(parqAnswers).map(([questionCode, answer]) => ({
    questionCode,
    question: questionCode,
    answer: answer === "yes",
  }));
}

// ── Consent rows ──────────────────────────────────────────────────────────────

export interface ConsentCreateArgs {
  type: "TERMS_AND_PRIVACY" | "HEALTH_DATA" | "AI_PROCESSING" | "MARKETING";
  granted: boolean;
  version: string;
  grantedAt: Date | null;
}

const CONSENT_VERSION = "1.0";

export function buildConsentRows(
  step8: OnboardingPayload["step8"],
  now: Date,
): ConsentCreateArgs[] {
  return [
    {
      type: "TERMS_AND_PRIVACY",
      granted: step8.consentTerms,
      version: CONSENT_VERSION,
      grantedAt: step8.consentTerms ? now : null,
    },
    {
      type: "HEALTH_DATA",
      granted: step8.consentHealthData,
      version: CONSENT_VERSION,
      grantedAt: step8.consentHealthData ? now : null,
    },
    {
      type: "AI_PROCESSING",
      granted: step8.consentAiProcessing,
      version: CONSENT_VERSION,
      grantedAt: step8.consentAiProcessing ? now : null,
    },
    {
      type: "MARKETING",
      granted: step8.consentMarketing ?? false,
      version: CONSENT_VERSION,
      grantedAt: step8.consentMarketing ? now : null,
    },
  ];
}

// ── Progress photo view mapping ───────────────────────────────────────────────

export interface ProgressPhotoCreateArgs {
  view: "FRONT" | "SIDE_LEFT" | "BACK";
  storageKey: string;
}

export function buildProgressPhotoRows(
  step6: NonNullable<OnboardingPayload["step6"]>,
): ProgressPhotoCreateArgs[] {
  const rows: ProgressPhotoCreateArgs[] = [];
  if (step6.frontPhotoKey) {
    rows.push({ view: "FRONT", storageKey: step6.frontPhotoKey });
  }
  if (step6.sidePhotoKey) {
    rows.push({ view: "SIDE_LEFT", storageKey: step6.sidePhotoKey });
  }
  if (step6.backPhotoKey) {
    rows.push({ view: "BACK", storageKey: step6.backPhotoKey });
  }
  return rows;
}

// ── AssignedRoutine snapshot ──────────────────────────────────────────────────

/**
 * Fetch the routine template to build a snapshot.
 * The snapshot JSON must be passed into AssignedRoutine.create so that
 * subsequent trainer edits do not retroactively change the client's view.
 *
 * This function is intentionally a stub — the transaction caller must resolve
 * the template inside the tx and pass the result here.
 */
export function buildRoutineSnapshot(
  template: { id: string; name: string; [key: string]: unknown },
): Prisma.InputJsonValue {
  // Shallow clone is sufficient for the immutable snapshot contract.
  return { ...template } as Prisma.InputJsonValue;
}
