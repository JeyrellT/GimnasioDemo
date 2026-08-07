"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AuthProvider,
  useAuth,
  type AuthUser,
} from "@/components/providers/auth-provider";
import { BrandingProvider } from "@/lib/branding/branding-context";
import { Topbar } from "@/components/layout/topbar";
import {
  TrainerBottomNav,
  TrainerSidebar,
} from "@/components/layout/trainer-nav";
import { ClientBottomNav, ClientSidebar } from "@/components/layout/client-nav";
import { AdminSuperNav } from "@/app/(app)/admin/_components/admin-super-nav";
import { AdminBottomNav } from "@/components/layout/admin-bottom-nav";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { CoachAssistant } from "@/components/chat/coach-assistant";
import { useAssistantStore } from "@/stores/assistant-store";
import type { MirrorViewSwitcherState } from "@/app/(app)/admin/_components/mirror-view-switcher";

function AppShell({
  children,
  mirrorSwitcher,
  tieneIA,
}: {
  children: ReactNode;
  mirrorSwitcher?: MirrorViewSwitcherState;
  /** El plan del coach incluye el asistente con IA. */
  tieneIA: boolean;
}) {
  const { user, avatarUrl, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect unauthenticated users to /ingresar. Must run in useEffect:
  // calling router.replace() during render is a setState-during-render
  // which React 19 punishes by halting Suspense streaming on subsequent
  // navigations, leaving the page permanently blank in the browser.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/ingresar");
    }
  }, [isLoading, isAuthenticated, router]);

  // Segunda señal de reconcileOwnership() (ver assistant-store.ts): en cuanto
  // el perfil activo se resuelve, intenta reconciliar el historial del chat
  // de IA con ese perfil. Es no-op si la rehidratación de IndexedDB todavía
  // no terminó — en ese caso la propia rehidratación dispara la reconciliación
  // cuando termine. Corre para todo rol (no solo trainer): el store se carga
  // igual por el import estático de CoachAssistant más abajo, así que vale la
  // pena aislarlo aunque este usuario no sea coach.
  useEffect(() => {
    if (!isLoading && user) {
      useAssistantStore.getState().reconcileOwnership();
    }
  }, [isLoading, user]);

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas text-neutral-400">
        <p className="text-sm">Redirigiendo…</p>
      </div>
    );
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

  const Sidebar = isAdmin
    ? AdminSuperNav
    : isTrainer
      ? TrainerSidebar
      : ClientSidebar;
  const BottomNav = isAdmin
    ? AdminBottomNav
    : isTrainer
      ? TrainerBottomNav
      : ClientBottomNav;

  return (
    // `w-full overflow-x-hidden` en la raíz: en celular nada puede empujar la
    // página hacia los lados. Sin esto la pantalla se corría y el contenido
    // aparecía cortado en ambos bordes.
    <div className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-canvas">
      <div className="sticky top-0 z-40 bg-canvas">
        <OfflineBanner />
        <Topbar
          user={{ name: user.name, avatarUrl }}
          mirrorSwitcher={mirrorSwitcher}
        />
      </div>

      <div className="flex min-w-0 flex-1 overflow-hidden">
        <Sidebar />

        <main
          id="main-content"
          // `min-w-0` es la clave: un ítem flex arranca con `min-width: auto`,
          // así que NO se encoge por debajo del ancho natural de su contenido.
          // Bastaba un elemento ancho adentro (una tabla, un texto largo sin
          // cortes) para estirar el main más allá de la pantalla y desplazar
          // toda la interfaz. Con min-w-0 el contenido se adapta en su lugar.
          className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin px-4 pb-20 pt-6 sm:pb-6 sm:pl-56"
        >
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <BottomNav />

      {/* Chat flotante del asistente: solo para coaches cuyo plan incluye IA.
          La sección /trainer/asistente tiene su propia puerta con la
          invitación a cambiar de plan. */}
      {isTrainer && tieneIA && <CoachAssistant />}
    </div>
  );
}

export function ClientLayout({
  children,
  effectiveUser,
  mirrorSwitcher,
  tieneIA = false,
}: {
  children: ReactNode;
  effectiveUser?: AuthUser;
  mirrorSwitcher?: MirrorViewSwitcherState;
  tieneIA?: boolean;
}) {
  return (
    <AuthProvider effectiveUser={effectiveUser}>
      <BrandingProvider>
        <AppShell mirrorSwitcher={mirrorSwitcher} tieneIA={tieneIA}>
          {children}
        </AppShell>
      </BrandingProvider>
    </AuthProvider>
  );
}
