// =============================================================================
// SUPER_ADMIN — /admin layout
// Server component. Guards with requireSuperAdmin() and renders the admin
// sidebar + children.
// =============================================================================

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireSuperAdmin } from "@/server/guards";
import { AdminSuperNav } from "./_components/admin-super-nav";

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
    <div className="flex min-h-0 flex-1">
      <AdminSuperNav />
      <div className="flex-1 min-w-0 pl-0 sm:pl-56">
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </div>
    </div>
  );
}
