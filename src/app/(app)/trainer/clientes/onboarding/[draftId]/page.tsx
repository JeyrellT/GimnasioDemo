// =============================================================================
// BLACKLINE FITNESS — Onboarding wizard page
// Owner: frontend-react.
// Server component wrapper — satisfies static export + generateStaticParams.
// The actual interactive shell is rendered by OnboardingClientPage.
// =============================================================================

import { OnboardingClientPage } from "./_client";

// Production: dynamically rendered. Demo uses generateStaticParams in its branch.

interface PageProps {
  params: Promise<{ draftId: string }>;
}

export default async function OnboardingPage({ params }: PageProps) {
  const { draftId } = await params;
  return <OnboardingClientPage draftId={draftId} />;
}
