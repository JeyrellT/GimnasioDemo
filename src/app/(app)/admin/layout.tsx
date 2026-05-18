// =============================================================================
// SUPER_ADMIN — /admin layout
// Server component. Guards with requireSuperAdmin() and renders the admin
// sidebar + children.
// =============================================================================

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireSuperAdmin } from "@/server/guards";
export default async function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireSuperAdmin();
  } catch {
    redirect("/inicio");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
  );
}
