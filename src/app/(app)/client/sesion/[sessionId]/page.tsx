// =============================================================================
// VIZION — /client/sesion/[sessionId] — Demo stub
// Client-facing active session page — not available in trainer demo.
// =============================================================================

import { UnavailableInDemo } from "@/components/shared/unavailable-in-demo";

export function generateStaticParams() {
  return [{ sessionId: "demo-stub" }];
}

export default function ActiveSessionPage() {
  return <UnavailableInDemo />;
}
