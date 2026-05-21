// =============================================================================
// BLACKLINE FITNESS — NextAuth v5 full configuration (Node.js runtime only)
// Owner: backend-api.
//
// Extends the edge-compatible base config (auth.config.ts) with:
//   - PrismaAdapter (requires PrismaClient → Node.js runtime)
//   - Email + Credentials providers
//   - DB-dependent callbacks (signIn, jwt with role fetch)
//
// IMPORTANT: This file MUST NOT be imported from middleware.ts.
// Middleware uses auth.config.ts directly to stay Edge-compatible.
// =============================================================================

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/nodemailer";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Session, User } from "next-auth";
import type { AdapterUser } from "@auth/core/adapters";

import { authConfig } from "./auth.config";
import { prisma, prismaRaw } from "@/server/db";
import { serverEnv } from "@/server/env";
import { safeNextAuthRedirect } from "@/lib/safe-redirect";
import { verifyPassword } from "@/lib/crypto/passwords";
import { sendEmail } from "@/lib/email/client";
import { logInfo, logWarn, logError } from "@/lib/logger";
import MagicLinkEmail from "@/lib/email/templates/magic-link";
import { MAGIC_LINK_EXPIRY_MIN } from "@/lib/consts";
import type { UserRole, AuditAction } from "@prisma/client";

// Type augmentations are in auth.config.ts (shared by Edge + Node configs)

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
        metadata: metadata as import("@prisma/client").Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    logError(err, { fn: "writeAuditLog", action });
  }
}

// -----------------------------------------------------------------------------
// NextAuth configuration object
// -----------------------------------------------------------------------------

export const fullAuthConfig: NextAuthConfig = {
  ...authConfig,
  // prismaRaw — auth tables (Account, Session, VerificationToken) don't have
  // deletedAt, so the soft-delete extension must not apply to the adapter.
  adapter: PrismaAdapter(prismaRaw),

  providers: [
    // ── 1. Magic link (email) ────────────────────────────────────────────────
    // next-auth v5 uses `nodemailer` provider for email; we override sendVerificationRequest
    // to use our own Gmail-backed sendEmail() instead of an SMTP server.
    EmailProvider({
      // `server` and `from` are required by the provider typings but we bypass
      // the built-in nodemailer transport entirely via sendVerificationRequest.
      server: "smtp://localhost:25",
      from: serverEnv.GMAIL_USER ?? serverEnv.RESEND_FROM_EMAIL,

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
            subject: "Tu acceso a Blackline Fitness",
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
    ...authConfig.callbacks,

    /**
     * redirect callback — guards every post-auth redirect URL.
     * NextAuth calls this with the URL the user was trying to reach (which can
     * originate from the `callbackUrl` query param — user-controlled input).
     * Returning an external URL here would be an open redirect.
     */
    redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      return safeNextAuthRedirect(url, baseUrl);
    },

    /**
     * signIn callback — runs after any provider successfully authenticates.
     * Blocks soft-deleted users and fires post-auth side effects.
     */
    async signIn({ user }: { user: User | AdapterUser }) {
      if (!user.id) return false;

      // ── Guard 1: block re-registration of a previously soft-deleted email ──
      // SUPER_ADMIN's deleteUser action scrambles the deleted user's email to
      // "<localpart>+deleted-<timestamp>@blackline.local". Without this guard,
      // someone could re-register with the original email via magic link (the
      // PrismaAdapter would create a fresh CLIENT row because the original
      // email no longer matches any User row). That contradicts the LPDP-grade
      // "the user can never sign in again" promise of deleteUser.
      if (user.email) {
        const attemptedEmail = user.email.toLowerCase();
        const localPart = attemptedEmail.split("@")[0];
        if (localPart && !localPart.includes("+deleted-")) {
          // Match any soft-deleted user whose scrambled email starts with
          // "<localpart>+deleted-" — the canonical pattern emitted by
          // deleteUser. Uses prismaRaw to bypass the soft-delete filter.
          const previouslyDeleted = await prismaRaw.user.findFirst({
            where: {
              deletedAt: { not: null },
              email: { startsWith: `${localPart}+deleted-` },
            },
            select: { id: true },
          });
          if (previouslyDeleted) {
            logWarn(
              "Blocked sign-in: email belongs to a soft-deleted account",
              { attemptedEmail, deletedUserId: previouslyDeleted.id },
            );
            return false;
          }
        }
      }

      // ── Guard 2: block sign-in by user id for soft-deleted rows ────────────
      // Verify the user is not soft-deleted. For magic links, the adapter may
      // create a new user row if the email is new — we only block *existing*
      // deleted rows here.
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
    async jwt({
      token,
      user,
      trigger,
    }: {
      token: JWT;
      user?: User | AdapterUser;
      trigger?: "signIn" | "signUp" | "update";
    }) {
      // `user` is only present on the initial sign-in — not on subsequent
      // token refreshes.
      if (user?.id) {
        token.id = user.id;

        // Fetch the authoritative role, name, and mustChangePassword from DB
        // on first sign-in. Subsequent refreshes use the cached token values;
        // role changes take effect on the next sign-in or explicit rotation.
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, name: true, mustChangePassword: true },
        });

        token.role = dbUser?.role ?? ("CLIENT" as UserRole);
        token.name = dbUser?.name ?? (user.name ?? "");
        token.mustChangePassword = dbUser?.mustChangePassword ?? false;
      } else if (trigger === "update" && token.id) {
        // Explicit session refresh (e.g. after the client completes the forced
        // password change). Re-read mustChangePassword from DB so the middleware
        // stops redirecting them to /client/bienvenida.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, name: true, mustChangePassword: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.mustChangePassword = dbUser.mustChangePassword;
        }
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
        mustChangePassword: token.mustChangePassword ?? false,
      };
      return session;
    },
  },
};

// -----------------------------------------------------------------------------
// Initialize NextAuth and export named exports
// -----------------------------------------------------------------------------

const { auth, handlers, signIn, signOut } = NextAuth(fullAuthConfig);

export { auth, handlers, signIn, signOut };
