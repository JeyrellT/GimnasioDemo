"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/providers/auth-provider";
import { Topbar } from "@/components/layout/topbar";
import { TrainerBottomNav, TrainerSidebar } from "@/components/layout/trainer-nav";
import { ClientBottomNav, ClientSidebar } from "@/components/layout/client-nav";
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

  const isTrainer = user.role === "TRAINER";

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* Sticky header block: banner + topbar together */}
      <div className="sticky top-0 z-40 bg-canvas">
        {IS_DEMO && (
          <div className="bg-brand-primary/10 border-b border-brand-primary/30 px-4 py-1.5 text-center text-xs text-brand-primary">
            Modo demo &middot; Tus datos se guardan solo en este navegador
          </div>
        )}
        <OfflineBanner />
        <Topbar user={{ name: user.name, avatarUrl }} />
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {isTrainer ? <TrainerSidebar /> : <ClientSidebar />}

        <main
          id="main-content"
          className="flex-1 overflow-y-auto scrollbar-thin pb-20 sm:pb-6 px-4 pt-6 sm:pl-56"
        >
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>

      {isTrainer ? <TrainerBottomNav /> : <ClientBottomNav />}
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
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
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
