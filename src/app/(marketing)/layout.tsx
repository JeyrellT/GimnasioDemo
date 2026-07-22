import type { ReactNode } from "react";

interface MarketingLayoutProps {
  children: ReactNode;
}

/**
 * Layout del route group (marketing).
 *
 * Pasa-through: cada page maneja su propio shell.
 * - `/` (landing) renderiza <BrandingLandingPage /> que trae nav + footer propios.
 * - `/pricing` y `/legal/*` envuelven con <BrandingShell> el shell clásico.
 */
export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return <>{children}</>;
}
