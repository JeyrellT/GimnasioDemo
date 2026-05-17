// =============================================================================
// VIZION — NextAuth v5 edge-compatible configuration
// Owner: backend-api.
//
// This file contains ONLY the auth settings that are safe to import in
// Next.js Edge Runtime (middleware). It must NOT import PrismaClient,
// database modules, or any Node.js-only package.
//
// The full auth configuration (with PrismaAdapter, providers, DB callbacks)
// lives in auth.ts which extends this config.
// =============================================================================

import type { NextAuthConfig } from "next-auth";

// Type augmentation — kept here so both edge and Node configs share the types.
// import type is erased at compile time, so it's edge-safe.
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  }

  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    name: string;
  }
}

// -----------------------------------------------------------------------------
// Edge-compatible auth config
// -----------------------------------------------------------------------------

export const authConfig = {
  // JWT sessions — stateless, no DB session table needed.
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/ingresar",
    error: "/ingresar",
  },

  // Providers are set in the full auth.ts — empty here for Edge safety.
  providers: [],

  callbacks: {
    /**
     * session callback — shapes the session object from the JWT.
     * No DB access needed; safe for Edge runtime.
     */
    session({ session, token }: { session: any; token: any }) {
      session.user = {
        id: token.id,
        email: token.email ?? "",
        name: token.name,
        role: token.role,
      };
      return session;
    },
  },
} satisfies NextAuthConfig;
