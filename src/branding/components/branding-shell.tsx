import type { ReactNode } from "react";
import { BrandingHeader } from "@/branding/components/branding-header";
import { BrandingFooter } from "@/branding/components/branding-footer";

interface BrandingShellProps {
  children: ReactNode;
}

export function BrandingShell({ children }: BrandingShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#09090B]">
      <BrandingHeader />
      <main className="flex-1">{children}</main>
      <BrandingFooter />
    </div>
  );
}
