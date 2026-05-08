"use client";

import { lazy, Suspense, useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { DemoAuthProvider, useDemoAuth } from "@/lib/demo/auth-context";
import { Topbar } from "@/components/layout/topbar";

const TrainerSidebar = lazy(() =>
  import("@/components/layout/trainer-nav").then((m) => ({ default: m.TrainerSidebar })),
);
const TrainerBottomNav = lazy(() =>
  import("@/components/layout/trainer-nav").then((m) => ({ default: m.TrainerBottomNav })),
);
const ClientSidebar = lazy(() =>
  import("@/components/layout/client-nav").then((m) => ({ default: m.ClientSidebar })),
);
const ClientBottomNav = lazy(() =>
  import("@/components/layout/client-nav").then((m) => ({ default: m.ClientBottomNav })),
);
const OfflineBanner = dynamic(
  () => import("@/components/shared/offline-banner").then((m) => m.OfflineBanner),
  { ssr: false },
);

function AppShell({ children }: { children: ReactNode }) {
  const { user, avatarUrl } = useDemoAuth();
  const isTrainer = user.role === "TRAINER";

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div className="sticky top-0 z-40 bg-canvas">
        <div className="bg-brand-primary/10 border-b border-brand-primary/30 px-4 py-1.5 text-center text-xs text-brand-primary">
          Modo demo · Tus datos se guardan solo en este navegador
        </div>
        <OfflineBanner />
        <Topbar user={{ name: user.name, avatarUrl }} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Suspense>
          {isTrainer ? <TrainerSidebar /> : <ClientSidebar />}
        </Suspense>

        <main
          id="main-content"
          className="flex-1 overflow-y-auto scrollbar-thin pb-20 sm:pb-6 px-4 pt-6 sm:pl-56"
        >
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>

      <Suspense>
        {isTrainer ? <TrainerBottomNav /> : <ClientBottomNav />}
      </Suspense>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Fire-and-forget background seed. Idempotent: fast KV flag check on
    // repeat visits (~5 ms). On first visit the full bulkPut transaction runs
    // while the user already sees the UI — Dexie live-query hooks in child
    // components update reactively once the transaction commits.
    import("@/lib/demo/seed-runner")
      .then(({ ensureDemoSeeded }) => ensureDemoSeeded())
      .catch((err: unknown) => {
        console.error("[demo] seed failed:", err);
      });
  }, []);

  return (
    <DemoAuthProvider>
      <AppShell>{children}</AppShell>
    </DemoAuthProvider>
  );
}

