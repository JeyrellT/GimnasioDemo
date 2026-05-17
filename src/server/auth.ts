// =============================================================================
// VIZION — NextAuth v5 real configuration
// Owner: backend-api.
//
// Session strategy: JWT (stateless). We do not persist sessions in the DB so
// horizontal scale is frictionless. The JWT carries { id, role, name } only —
// never sensitive fields.
//
// Providers:
//   1. Email (magic link) — via Resend + MagicLinkEmail React template.
//   2. Credentials (email + password) — PBKDF2 verification via verifyPassword().
//
// Callbacks:
//   - signIn:   blocks soft-deleted users; updates lastLoginAt; writes AuditLog.
//   - jwt:      stamps id, role, name into the token.
//   - session:  exposes id, role, name on session.user.
//
// Pages:
//   /ingresar — sign-in page
//   /ingresar — error page (same page, reads ?error= param)
// =============================================================================

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/nodemailer";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Session, User } from "next-auth";
import type { AdapterUser } from "@auth/core/adapters";

import { prisma } from "@/server/db";
import { serverEnv } from "@/server/env";
import { verifyPassword } from "@/lib/crypto/passwords";
import { sendEmail } from "@/lib/email/client";
import { logInfo, logWarn, logError } from "@/lib/logger";
import MagicLinkEmail from "@/lib/email/templates/magic-link";
import { MAGIC_LINK_EXPIRY_MIN } from "@/lib/consts";
import type { UserRole, AuditAction } from "@prisma/client";

// -----------------------------------------------------------------------------
// Augment next-auth types to carry role through the JWT / session pipeline
// -----------------------------------------------------------------------------

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
// Internal helpers
// -----------------------------------------------------------------------------

/**
 * Write an audit log entry for auth events.
 * Fire-and-forget: never throw. A logging failure must never block sign-in.
 */
async function writeAuditLog(
  actorUserId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType: "User",
        entityId: actorUserId,
        metadata: metadata ?? null,
      },
    });
  } catch (err) {
    logError(err, { fn: "writeAuditLog", action });
  }
}

// -----------------------------------------------------------------------------
// NextAuth configuration object
// -----------------------------------------------------------------------------

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),

  // JWT sessions — stateless, no DB session table needed.
  session: {
    strategy: "jwt",
    // 30-day inactivity expiry. Tokens are short-lived at the HTTP layer via
    // the rolling session cookie — this is the absolute max lifetime.
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },

  pages: {
    signIn: "/ingresar",
    error: "/ingresar",
  },

  providers: [
    // ── 1. Magic link (email) ────────────────────────────────────────────────
    // next-auth v5 uses `nodemailer` provider for email; we override sendVerificationRequest
    // to use our own Resend-backed sendEmail() instead of an SMTP server.
    EmailProvider({
      // `server` and `from` are required by the provider typings but we bypass
      // the built-in nodemailer transport entirely via sendVerificationRequest.
      server: "smtp://localhost:25",
      from: serverEnv.RESEND_FROM_EMAIL,

      // TTL: MAGIC_LINK_EXPIRY_MIN minutes (15 by default, see consts.ts).
      maxAge: MAGIC_LINK_EXPIRY_MIN * 60,

      /**
       * Custom send function — bypasses nodemailer, uses Resend via our
       * sendEmail() wrapper with the React Email template.
       */
      async sendVerificationRequest({ identifier: email, url }) {
        try {
          await sendEmail({
            to: email,
            subject: "Tu acceso a Vizion",
            react: MagicLinkEmail({
              url,
              email,
              expiresInMinutes: MAGIC_LINK_EXPIRY_MIN,
            }),
          });
          logInfo("Magic link sent", { action: "magic_link_send" });
        } catch (err) {
          logError(err, { action: "magic_link_send_failed" });
          throw err; // Re-throw so NextAuth surfaces the error to the user.
        }
      },
    }),

    // ── 2. Credentials (email + password) ────────────────────────────────────
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string"
        ) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password;

        // Never reveal whether the email exists — return null for all failures.
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
            deletedAt: true,
          },
        });

        if (!user || user.deletedAt !== null || !user.passwordHash) {
          // Constant-time guard: still run derivation to avoid timing oracle.
          await verifyPassword("_dummy_", "pbkdf2|200000|dGVzdA==|dGVzdA==");
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);

        if (!valid) {
          logWarn("Credentials sign-in failed: wrong password", {
            userId: user.id,
          });
          return null;
        }

        logInfo("Credentials sign-in success", { userId: user.id });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  callbacks: {
    /**
     * signIn callback — runs after any provider successfully authenticates.
     * Blocks soft-deleted users and fires post-auth side effects.
     */
    async signIn({ user }: { user: User | AdapterUser }) {
      if (!user.id) return false;

      // Verify the user is not soft-deleted. For magic links, the adapter may
      // create a new user row if the email is new — we only block *existing*
      // deleted rows.
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { deletedAt: true, id: true },
      });

      if (dbUser?.deletedAt !== null && dbUser?.deletedAt !== undefined) {
        logWarn("Blocked sign-in for soft-deleted user", { userId: user.id });
        return false;
      }

      // Fire-and-forget: update lastLoginAt and write the audit log.
      // We do NOT await inside the signIn callback to avoid adding latency;
      // failures are logged but do not block the sign-in.
      void (async () => {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
          await writeAuditLog(user.id!, "LOGIN");
        } catch (err) {
          logError(err, { fn: "signIn.postEffect", userId: user.id });
        }
      })();

      return true;
    },

    /**
     * jwt callback — called when a JWT is created or updated.
     * Stamps role and name into the token from the DB on first sign-in,
     * then passes through on subsequent requests (token already has the fields).
     */
    async jwt({ token, user }: { token: JWT; user?: User | AdapterUser }) {
      // `user` is only present on the initial sign-in — not on subsequent
      // token refreshes.
      if (user?.id) {
        token.id = user.id;

        // Fetch the authoritative role and name from the DB on first sign-in.
        // Subsequent refreshes use the cached token values; role changes take
        // effect on the next sign-in or when the token is explicitly rotated.
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, name: true },
        });

        token.role = dbUser?.role ?? ("CLIENT" as UserRole);
        token.name = dbUser?.name ?? (user.name ?? "");
      }

      return token;
    },

    /**
     * session callback — shapes the session object returned to the client.
     * Reads from the JWT; never hits the DB again here.
     */
    session({ session, token }: { session: Session; token: JWT }) {
      session.user = {
        id: token.id,
        email: token.email ?? "",
        name: token.name,
        role: token.role,
      };
      return session;
    },
  },
};

// -----------------------------------------------------------------------------
// Initialize NextAuth and export named exports
// -----------------------------------------------------------------------------

const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

export { auth, handlers, signIn, signOut };
