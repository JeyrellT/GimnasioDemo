// =============================================================================
// VIZION — Onboarding wizard Zustand store
// Owner: frontend-react.
// =============================================================================

import { create } from "zustand";
import type { OnboardingDraftDTO, OnboardingPayload } from "@/types/onboarding";

interface OnboardingStore {
  draftId: string | null;
  currentStep: number;
  payload: Partial<OnboardingPayload>;

  hydrate: (draft: OnboardingDraftDTO) => void;
  goToStep: (step: number) => void;
  goNext: () => void;
  goBack: () => void;
  setStepData: <K extends keyof OnboardingPayload>(
    key: K,
    data: OnboardingPayload[K],
  ) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  draftId: null,
  currentStep: 1,
  payload: {} as Partial<OnboardingPayload>,
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...INITIAL_STATE,

  hydrate: (draft) =>
    set({
      draftId: draft.id,
      currentStep: Math.max(1, Math.min(draft.currentStep, 9)),
      payload: draft.data,
    }),

  goToStep: (step) =>
    set({ currentStep: Math.max(1, Math.min(step, 9)) }),

  goNext: () =>
    set((s) => ({ currentStep: Math.min(s.currentStep + 1, 9) })),

  goBack: () =>
    set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),

  setStepData: (key, data) =>
    set((s) => ({ payload: { ...s.payload, [key]: data } })),

  reset: () => set(INITIAL_STATE),
}));
