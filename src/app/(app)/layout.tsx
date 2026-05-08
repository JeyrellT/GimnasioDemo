"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DemoAuthProvider, useDemoAuth } from "@/lib/demo/auth-context";
import { Topbar } from "@/components/layout/topbar";
import { TrainerBottomNav, TrainerSidebar } from "@/components/layout/trainer-nav";
import { ClientBottomNav, ClientSidebar } from "@/components/layout/client-nav";
import { OfflineBanner } from "@/components/shared/offline-banner";

function AppShell({ children }: { children: ReactNode }) {
  const { user, avatarUrl } = useDemoAuth();
  const isTrainer = user.role === "TRAINER";

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* Sticky header block: banner + topbar together */}
      <div className="sticky top-0 z-40 bg-canvas">
        <div className="bg-brand-primary/10 border-b border-brand-primary/30 px-4 py-1.5 text-center text-xs text-brand-primary">
          Modo demo · Tus datos se guardan solo en este navegador
        </div>
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
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    import("@/lib/demo/seed-runner")
      .then(({ ensureDemoSeeded }) => {
        ensureDemoSeeded()
          .then(() => setSeeded(true))
          .catch((err: unknown) => {
            console.error("[demo] seed failed:", err);
            setSeeded(true);
          });
      })
      .catch((err: unknown) => {
        console.error("[demo] seed-runner not found:", err);
        setSeeded(true);
      });
  }, []);

  if (!seeded) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas text-neutral-400">
        <p className="text-sm">Cargando demo...</p>
      </div>
    );
  }

  return (
    <DemoAuthProvider>
      <AppShell>{children}</AppShell>
    </DemoAuthProvider>
  );
}
