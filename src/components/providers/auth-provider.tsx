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

function ProdAuthBridge({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const value: AuthContextValue = {
    user: session?.user
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }
      : null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    avatarUrl: session?.user?.avatarUrl ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ProdAuthBridge>{children}</ProdAuthBridge>
    </SessionProvider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
