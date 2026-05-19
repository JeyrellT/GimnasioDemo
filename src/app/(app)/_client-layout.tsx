"use client";

// =============================================================================
// BLACKLINE FITNESS — App Shell (client component)
// Formerly the full (app)/layout.tsx client component.
// Now called by the server layout.tsx which handles the ImpersonationBanner.
// =============================================================================

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/providers/auth-provider";
import { BrandingProvider } from "@/lib/branding/branding-context";
import { Topbar } from "@/components/layout/topbar";
import { TrainerBottomNav, TrainerSidebar } from "@/components/layout/trainer-nav";
import { ClientBottomNav, ClientSidebar } from "@/components/layout/client-nav";
import { AdminSuperNav } from "@/app/(app)/admin/_components/admin-super-nav";
import { AdminBottomNav } from "@/components/layout/admin-bottom-nav";
import { OfflineBanner } from "@/components/shared/offline-banner";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

function AppShell({ children }: { children: ReactNode }) {
  const { user, avatarUrl, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Production: redirect to login if not authenticated
  if (!IS_DEMO && !isLoading && !isAuthenticated) {
    router.replace("/ingresar");
    return null;
  }

  // Show loading state while session is being fetched
  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas text-neutral-400">
        <p className="text-sm">Cargando...</p>
      </div>
    );
  }

  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";
  const isTrainer = user.role === "TRAINER";

  const Sidebar = isAdmin ? AdminSuperNav : isTrainer ? TrainerSidebar : ClientSidebar;
  const BottomNav = isAdmin ? AdminBottomNav : isTrainer ? TrainerBottomNav : ClientBottomNav;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* Sticky header block: topbar + banners */}
      <div className="sticky top-0 z-40 bg-canvas">
        <OfflineBanner />
        <Topbar user={{ name: user.name, avatarUrl }} />
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto scrollbar-thin pb-20 sm:pb-6 px-4 pt-6 sm:pl-56"
        >
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

export function ClientLayout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!IS_DEMO);

  // Demo mode only: seed IndexedDB before rendering
  useEffect(() => {
    if (!IS_DEMO) return;
    import("@/lib/demo/seed-runner")
      .then(({ ensureDemoSeeded }) => {
        ensureDemoSeeded()
          .then(() => setReady(true))
          .catch((err: unknown) => {
            console.error("[demo] seed failed:", err);
            setReady(true);
          });
      })
      .catch((err: unknown) => {
        console.error("[demo] seed-runner not found:", err);
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas text-neutral-400">
        <p className="text-sm">Cargando demo...</p>
      </div>
    );
  }

  return (
    <AuthProvider>
      <BrandingProvider>
        <AppShell>{children}</AppShell>
      </BrandingProvider>
    </AuthProvider>
  );
}
