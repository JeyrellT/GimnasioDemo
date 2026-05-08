// =============================================================================
// VIZION — Onboarding domain types
// Owner: backend-api.
// =============================================================================

import type { OnboardingMode, ParqStatus, Goal, Gender } from "@prisma/client";

// ── Step payloads ─────────────────────────────────────────────────────────────

export interface OnboardingStep1Data {
  name: string;
  email: string;
  phone?: string;
  /** ISO date string (YYYY-MM-DD). */
  dateOfBirth: string;
  gender: Gender;
  address?: string;
  locationCity?: string;
}

export interface OnboardingCedulaExtraction {
  fullName?: string;
  idNumber?: string;
  dateOfBirth?: string;
  gender?: Gender;
  /** true when trainer has reviewed and confirmed the extracted data. */
  approved: boolean;
}

export interface OnboardingStep2Data {
  /** R2 key of the cédula image. */
  cedulaImageKey?: string;
  extracted?: OnboardingCedulaExtraction;
  skipped?: boolean;
}

export interface OnboardingStep3Data {
  /** R2 keys for workout reference photos (max 3). */
  workoutPhotoKeys: string[];
  skipped?: boolean;
}

export interface OnboardingStep4Data {
  goal: Goal;
  /** Multi-objective notes and lifestyle context. */
  goalNotes?: string;
  /** questionId → "yes" | "no". */
  parqAnswers: Record<string, "yes" | "no">;
  /** Computed at save time from parqAnswers. */
  parqStatus: ParqStatus;
  trainingDaysPerWeek?: number;
  hasInjuries?: boolean;
  injuryNotes?: string;
  takesMedication?: boolean;
  medicationNotes?: string;
}

export interface OnboardingStep5Data {
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  waistCm?: number;
  hipCm?: number;
}

export interface OnboardingStep6Data {
  frontPhotoKey?: string;
  sidePhotoKey?: string;
  backPhotoKey?: string;
  skipped?: boolean;
}

export interface OnboardingStep7Data {
  monthlyPriceCRC: number;
  routineTemplateId?: string;
  notes?: string;
}

export interface OnboardingStep8Data {
  consentTerms: boolean;
  consentHealthData: boolean;
  consentAiProcessing: boolean;
  consentMarketing?: boolean;
}

// ── Composite payload stored in OnboardingDraft.dataJson ─────────────────────

export interface OnboardingPayload {
  step1: OnboardingStep1Data;
  step2?: OnboardingStep2Data;
  step3?: OnboardingStep3Data;
  step4: OnboardingStep4Data;
  step5: OnboardingStep5Data;
  step6?: OnboardingStep6Data;
  step7: OnboardingStep7Data;
  step8: OnboardingStep8Data;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface OnboardingDraftDTO {
  id: string;
  mode: OnboardingMode;
  currentStep: number;
  data: Partial<OnboardingPayload>;
  aiConsentGranted: boolean;
  cedulaExtractionCount: number;
  workoutPhotoExtractionCount: number;
  /** ISO datetime. */
  expiresAt: string;
  /** ISO datetime or null. */
  completedAt: string | null;
}

export interface CreateClientResult {
  clientUserId: string;
  trainerClientId: string;
  /** Present only when mode=INVITE. */
  invitationUrl?: string;
}
