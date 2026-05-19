"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/providers/auth-provider";
import { BrandingProvider } from "@/lib/branding/branding-context";
import { Topbar } from "@/components/layout/topbar";
import { TrainerBottomNav, TrainerSidebar } from "@/components/layout/trainer-nav";
import { ClientBottomNav, ClientSidebar } from "@/components/layout/client-nav";
import { AdminSuperNav } from "@/app/(app)/admin/_components/admin-super-nav";
import { AdminBottomNav } from "@/components/layout/admin-bottom-nav";
import { OfflineBanner } from "@/components/shared/offline-banner";

function AppShell({ children }: { children: ReactNode }) {
  const { user, avatarUrl, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  if (!isLoading && !isAuthenticated) {
    router.replace("/ingresar");
    return null;
  }

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
      <div className="sticky top-0 z-40 bg-canvas">
        <OfflineBanner />
        <Topbar user={{ name: user.name, avatarUrl }} />
      </div>

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
  return (
    <AuthProvider>
      <BrandingProvider>
        <AppShell>{children}</AppShell>
      </BrandingProvider>
    </AuthProvider>
  );
}
