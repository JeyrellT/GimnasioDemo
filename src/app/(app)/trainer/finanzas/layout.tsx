// =============================================================================
// BLACKLINE FITNESS — /trainer/finanzas layout
// Wraps all finanzas routes. Renders the mobile FAB via FinanceFABLoader
// (Client Component — fetches data lazily on first tap).
// =============================================================================

import type { ReactNode } from "react";
import { FinanceFABLoader } from "@/components/finance/finance-fab-loader";

interface Props {
  children: ReactNode;
}

export default function FinanzasLayout({ children }: Props) {
  return (
    <>
      {children}
      <FinanceFABLoader />
    </>
  );
}
