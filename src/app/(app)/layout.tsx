"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DemoAuthProvider } from "@/lib/demo/auth-context";
import { Topbar } from "@/components/layout/topbar";
import { TrainerBottomNav, TrainerSidebar } from "@/components/layout/trainer-nav";
import { OfflineBanner } from "@/components/shared/offline-banner";

// DEMO_TRAINER mirrors the shape Topbar expects from the original `user` prop.
const DEMO_TRAINER = {
  id: "trainer-demo-001",
  name: "Coach Demo",
  email: "demo@forja.app",
  role: "TRAINER" as const,
  emailVerified: new Date("2024-01-01"),
  pushOptIn: false,
  avatarUrl: null,
  gender: "MALE" as const,
  dateOfBirth: new Date("1985-01-01"),
  passwordHash: null,
  locale: "es-CR",
  theme: "dark",
  trainerProfile: {
    id: "trainer-profile-demo",
    userId: "trainer-demo-001",
    tradeName: "Forja Demo Gym",
    specialty: "Hipertrofia y pérdida de grasa",
    bio: "Cuenta demo para presentación.",
    defaultMonthlyPriceCRC: { toString: () => "60000" },
  },
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date(),
  deletedAt: null,
};

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    // Lazy import to avoid SSR issues. seed-runner is created by Agent 3.
    import("@/lib/demo/seed-runner")
      .then(({ ensureDemoSeeded }) => {
        ensureDemoSeeded()
          .then(() => setSeeded(true))
          .catch((err: unknown) => {
            console.error("[demo] seed failed:", err);
            setSeeded(true); // proceed anyway
          });
      })
      .catch((err: unknown) => {
        console.error("[demo] seed-runner not found:", err);
        setSeeded(true); // proceed anyway until Agent 3 delivers seed-runner
      });
  }, []);

  if (!seeded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090B] text-[#A1A1AA]">
        <p className="text-sm">Cargando demo...</p>
      </div>
    );
  }

  return (
    <DemoAuthProvider>
      {/* Demo banner */}
      <div className="bg-[#FF6A1A]/10 border-b border-[#FF6A1A]/30 px-4 py-1.5 text-center text-xs text-[#FF6A1A]">
        Modo demo · Tus datos se guardan solo en este navegador
      </div>

      <div className="flex min-h-dvh flex-col bg-[#09090B]">
        <OfflineBanner />
        <Topbar user={DEMO_TRAINER} />

        <div className="flex flex-1 overflow-hidden">
          {/* Desktop sidebar — always trainer in demo */}
          <TrainerSidebar />

          {/* Page content — sm:pl-56 compensates for the fixed sidebar on desktop */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto scrollbar-thin pb-20 sm:pb-6 px-4 pt-6 sm:pl-56"
          >
            <div className="mx-auto max-w-5xl">{children}</div>
          </main>
        </div>

        {/* Bottom nav — mobile only */}
        <TrainerBottomNav />
      </div>
    </DemoAuthProvider>
  );
}
