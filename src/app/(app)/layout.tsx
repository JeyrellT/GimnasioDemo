import type { ReactNode } from "react";
import { ClientLayout } from "./_client-layout";
import { ImpersonationBanner } from "./admin/_components/impersonation-banner";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ImpersonationBanner />
      <ClientLayout>{children}</ClientLayout>
    </>
  );
}
