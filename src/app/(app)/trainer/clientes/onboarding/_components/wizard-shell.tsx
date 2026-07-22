"use client";

import { useEffect } from "react";

import { useOnboardingStore } from "@/stores/onboarding-wizard-store";
import type { OnboardingDraftDTO } from "@/types/onboarding";

import { StepProgress } from "./step-progress";
import { Step1Basic } from "./step-1-basic";
import { Step2Cedula } from "./step-2-cedula";
import { Step3Workout } from "./step-3-workout";
import { Step4Questionnaire } from "./step-4-questionnaire";
import { Step5Anthropometry } from "./step-5-anthropometry";
import { Step6Photos } from "./step-6-photos";
import { Step7Plan } from "./step-7-plan";
import { Step8Consents } from "./step-8-consents";
import { Step9Review } from "./step-9-review";

interface WizardShellProps {
  draft: OnboardingDraftDTO;
  trainerId: string;
}

export function WizardShell({ draft, trainerId }: WizardShellProps) {
  // Selectores individuales para evitar re-renders en cambios de otros fields.
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const hydrate = useOnboardingStore((s) => s.hydrate);

  useEffect(() => {
    hydrate(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id]);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Nuevo cliente</h1>
        <p className="mt-0.5 text-sm text-[#71717A]">
          Completá la información del cliente. Podés retomar en cualquier momento.
        </p>
      </div>

      <StepProgress currentStep={currentStep} total={9} />

      {/* Step panels */}
      {currentStep === 1 && <Step1Basic draftId={draft.id} />}
      {currentStep === 2 && (
        <Step2Cedula
          draftId={draft.id}
          aiConsentAlreadyGranted={draft.aiConsentGranted}
          extractionUsed={draft.cedulaExtractionCount > 0}
        />
      )}
      {currentStep === 3 && (
        <Step3Workout
          draftId={draft.id}
          aiConsentAlreadyGranted={draft.aiConsentGranted}
          extractionUsed={draft.workoutPhotoExtractionCount > 0}
        />
      )}
      {currentStep === 4 && <Step4Questionnaire draftId={draft.id} />}
      {currentStep === 5 && <Step5Anthropometry draftId={draft.id} />}
      {currentStep === 6 && <Step6Photos draftId={draft.id} />}
      {currentStep === 7 && <Step7Plan draftId={draft.id} />}
      {currentStep === 8 && <Step8Consents draftId={draft.id} aiWasUsed={draft.aiConsentGranted} />}
      {currentStep === 9 && <Step9Review draftId={draft.id} trainerId={trainerId} />}
    </div>
  );
}
