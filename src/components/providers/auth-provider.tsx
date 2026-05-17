"use client";

// =============================================================================
// VIZION — Unified Auth Provider (dual-mode: demo / production)
//
// Wraps the entire (app) layout. In demo mode (GitHub Pages) it renders
// DemoAuthProvider backed by localStorage; in production (Railway) it renders
// NextAuth's SessionProvider backed by JWT.
//
// All components read auth state through the exported `useAuth()` hook which
// returns a normalised AuthContextValue regardless of the underlying provider.
// =============================================================================

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { DemoAuthProvider, useDemoAuth } from "@/lib/demo/auth-context";

// Build-time constant — dead branch is eliminated by webpack/turbopack.
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "TRAINER" | "CLIENT" | "ADMIN";
}

export interface AuthContextValue {
  user: AuthUser | null;
  /** true while session is being fetched (prod only; always false in demo) */
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Data-URL or remote URL; null when no avatar */
  avatarUrl: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  avatarUrl: null,
});

// ---------------------------------------------------------------------------
// Bridge components — each reads from its provider and writes to AuthContext
// ---------------------------------------------------------------------------

/** Reads NextAuth session and bridges it into AuthContext. */
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
    avatarUrl: null, // TODO: fetch from User.avatarUrl once profile upload is wired
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Reads DemoAuthContext and bridges it into AuthContext. */
function DemoAuthBridge({ children }: { children: ReactNode }) {
  const { user, avatarUrl } = useDemoAuth();

  const value: AuthContextValue = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    isLoading: false,
    isAuthenticated: true,
    avatarUrl,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Wraps children with the correct auth provider based on build mode.
 * Use at the root of `(app)/layout.tsx`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (IS_DEMO) {
    return (
      <DemoAuthProvider>
        <DemoAuthBridge>{children}</DemoAuthBridge>
      </DemoAuthProvider>
    );
  }

  return (
    <SessionProvider>
      <ProdAuthBridge>{children}</ProdAuthBridge>
    </SessionProvider>
  );
}

/**
 * Returns the current auth state. Works in both demo and production.
 * Must be used inside `<AuthProvider>`.
 */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
