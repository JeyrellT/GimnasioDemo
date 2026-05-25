import type { ReactNode } from "react";
import { BrandingShell } from "@/branding/components/branding-shell";

interface MarketingLayoutProps {
  children: ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return <BrandingShell>{children}</BrandingShell>;
}
