// =============================================================================
// FORJA — Onboarding wizard page
// Owner: frontend-react.
// Server component wrapper — satisfies static export + generateStaticParams.
// The actual interactive shell is rendered by OnboardingClientPage.
// =============================================================================

import { OnboardingClientPage } from "./_client";

// ── generateStaticParams ──────────────────────────────────────────────────────
// Satisfies Next.js static export requirement for dynamic segments.
// Actual drafts are created at runtime in IndexedDB; "draft-demo" is a
// placeholder so the segment is pre-rendered.

export function generateStaticParams() {
  return [{ draftId: "draft-demo" }];
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ draftId: string }>;
}

export default async function OnboardingPage({ params }: PageProps) {
  const { draftId } = await params;
  return <OnboardingClientPage draftId={draftId} />;
}
