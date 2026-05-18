// =============================================================================
// VIZION — (app) layout — Server Component
// Renders the ImpersonationBanner (server component, zero-cost when inactive)
// above the client AppShell.
//
// The middleware already guarantees all routes here have a valid session.
// getCurrentImpersonation() returns ok:false (ForbiddenError) for non-SUPER_ADMIN
// users, which ImpersonationBanner handles by returning null.
//
// Demo mode (static export): banner skipped — no DB available.
// =============================================================================

import type { ReactNode } from "react";
import { ClientLayout } from "./_client-layout";
import { ImpersonationBanner } from "./admin/_components/impersonation-banner";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {!IS_DEMO && <ImpersonationBanner />}
      <ClientLayout>{children}</ClientLayout>
    </>
  );
}
