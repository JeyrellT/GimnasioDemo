"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { SessionProvider, useSession } from "next-auth/react";

import { setActiveProfile } from "@/lib/demo/settings-store";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "TRAINER" | "CLIENT" | "ADMIN" | "SUPER_ADMIN";
  avatarUrl?: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  avatarUrl: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  avatarUrl: null,
});

// ---------------------------------------------------------------------------
// Bridge: reads NextAuth session and writes to AuthContext
// ---------------------------------------------------------------------------

function ProdAuthBridge({
  children,
  effectiveUser,
}: {
  children: ReactNode;
  effectiveUser?: AuthUser;
}) {
  const { data: session, status } = useSession();

  const sessionUser: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        avatarUrl: session.user.avatarUrl ?? null,
      }
    : null;

  // The JWT remains attached to the real Super Admin. During a mirror session
  // the server supplies the effective target so client-side navigation,
  // branding and role gates match the account being observed.
  const user = effectiveUser ?? sessionUser;

  // Fija el perfil activo para el storage de la API key de Gemini (por
  // perfil, ver settings-store.ts). A propósito NO es un useEffect: se llama
  // acá mismo, durante el render de este provider — que está montado cerca de
  // la raíz — para que quede fijado ANTES de que cualquier componente hijo
  // más abajo en el árbol lea getGeminiKey()/hasGeminiKey() en su propio
  // efecto de montaje. Es una asignación idempotente a una variable de
  // módulo; no afecta lo que se renderiza.
  setActiveProfile(user?.id ?? null);

  const value: AuthContextValue = {
    user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    avatarUrl: user?.avatarUrl ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function AuthProvider({
  children,
  effectiveUser,
}: {
  children: ReactNode;
  effectiveUser?: AuthUser;
}) {
  return (
    <SessionProvider>
      <ProdAuthBridge effectiveUser={effectiveUser}>{children}</ProdAuthBridge>
    </SessionProvider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
