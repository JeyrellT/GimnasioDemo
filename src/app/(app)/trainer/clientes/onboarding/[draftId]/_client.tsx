"use client";

// =============================================================================
// VIZION — Onboarding wizard client page
// Owner: frontend-react.
// Interactive shell that resolves the draftId param and passes it into WizardShell.
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { getOnboardingDraft } from "@/app/actions/onboarding";
import { WizardShell } from "../_components/wizard-shell";
import type { OnboardingDraftDTO, OnboardingPayload } from "@/types/onboarding";

// ── Inner content (rendered once draft is loaded) ─────────────────────────────

interface ContentProps {
  draftId: string;
}

export function OnboardingClientPage({ draftId }: ContentProps) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<OnboardingDraftDTO | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getOnboardingDraft(draftId).then((result) => {
      if (!result.ok) {
        // Draft not found or expired → go to clients list
        router.replace("/trainer/clientes");
        return;
      }
      const detail = result.value;
      // Map OnboardingDraftDetail (server shape) → OnboardingDraftDTO (UI shape)
      const dto: OnboardingDraftDTO = {
        id: detail.id,
        mode: detail.mode,
        currentStep: detail.currentStep,
        data: (detail.dataJson ?? {}) as Partial<OnboardingPayload>,
        aiConsentGranted: detail.aiConsentGranted,
        cedulaExtractionCount: detail.cedulaExtractionCount,
        workoutPhotoExtractionCount: detail.workoutPhotoExtractionCount,
        expiresAt: detail.expiresAt instanceof Date ? detail.expiresAt.toISOString() : String(detail.expiresAt),
        completedAt: detail.completedAt instanceof Date ? detail.completedAt.toISOString() : (detail.completedAt ?? null),
      };
      setDraft(dto);
      setLoading(false);
    });
  }, [draftId, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-[#18181B]" />
          <div className="h-4 w-64 rounded bg-[#18181B]" />
          <div className="h-2 w-full rounded-full bg-[#18181B]" />
          <div className="h-64 rounded-xl bg-[#18181B]" />
        </div>
      </div>
    );
  }

  if (!draft) return null;

  return <WizardShell draft={draft} trainerId="trainer-demo-001" />;
}
