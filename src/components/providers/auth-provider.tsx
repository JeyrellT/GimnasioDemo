"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { SessionProvider, useSession } from "next-auth/react";

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
