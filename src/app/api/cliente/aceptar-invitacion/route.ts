// =============================================================================
// BLACKLINE FITNESS — Auto-login route for quick-add client flow
// Owner: backend-api.
//
// GET /api/cliente/aceptar-invitacion?token=<invitation-token>
//
// Flow:
//   1. Look up the Invitation by token.
//   2. Verify it is not expired and not already used.
//   3. Mark usedAt = now.
//   4. Mint a NextAuth v5 JWT (same format the session cookie uses) and set the
//      session cookie — this is the "server-side signIn" for a GET handler.
//      We cannot call the NextAuth signIn() server action here because that
//      helper is designed for RSC / Server Action boundaries, not GET handlers.
//      Instead we use @auth/core/jwt encode() + set the cookie directly.
//   5. Redirect to /client/bienvenida (the forced password-change page).
//
// On any error (token missing, expired, already used) → redirect to
//   /ingresar?error=invalid_token
//
// NOTE on the JWT cookie name:
//   NextAuth v5 uses "__Secure-authjs.session-token" on HTTPS and
//   "authjs.session-token" on HTTP (local dev). The salt passed to encode()
//   must match the cookie name — Auth.js derives the encryption key from
//   (secret + salt). We inspect the APP_URL to pick the correct prefix.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/server/db";
import { logError, logInfo, logWarn } from "@/lib/logger";

// Force Node.js runtime — we use Prisma which requires Node.js.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Returns true when APP_URL is HTTPS (used for cookie prefix + Secure flag). */
function useSecureCookies(): boolean {
  const appUrl = process.env.APP_URL ?? "";
  return appUrl.startsWith("https://");
}

/** Cookie name NextAuth v5 reads for the session JWT. */
function sessionCookieName(): string {
  return useSecureCookies()
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

// Cookie max-age: 30 days in seconds (matches authConfig.session.maxAge).
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// -----------------------------------------------------------------------------
// Route handler
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");

  const errorUrl = new URL("/ingresar", request.url);
  errorUrl.searchParams.set("error", "invalid_token");

  // ── 1. Validate token presence ──────────────────────────────────────────────
  if (!token?.trim()) {
    logWarn("aceptar-invitacion: token param missing");
    return NextResponse.redirect(errorUrl);
  }

  try {
    // ── 2. Look up invitation ──────────────────────────────────────────────────
    const invitation = await prisma.invitation.findUnique({
      where: { token, deletedAt: null },
      select: {
        id: true,
        clientId: true,
        usedAt: true,
        expiresAt: true,
      },
    });

    if (!invitation || !invitation.clientId) {
      logWarn("aceptar-invitacion: invitation not found or missing clientId", {
        tokenHead: token.slice(0, 8),
      });
      return NextResponse.redirect(errorUrl);
    }

    // ── 3. Verify not expired ──────────────────────────────────────────────────
    if (invitation.expiresAt < new Date()) {
      logWarn("aceptar-invitacion: token expired", {
        invitationId: invitation.id,
      });
      return NextResponse.redirect(errorUrl);
    }

    // ── 4. Verify not already used ─────────────────────────────────────────────
    if (invitation.usedAt !== null) {
      logWarn("aceptar-invitacion: token already used", {
        invitationId: invitation.id,
      });
      return NextResponse.redirect(errorUrl);
    }

    // ── 5. Fetch the client user ───────────────────────────────────────────────
    const clientUser = await prisma.user.findUnique({
      where: { id: invitation.clientId, deletedAt: null },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!clientUser) {
      logWarn("aceptar-invitacion: clientId not found in users", {
        invitationId: invitation.id,
        clientId: invitation.clientId,
      });
      return NextResponse.redirect(errorUrl);
    }

    // ── 6. Mark invitation used ────────────────────────────────────────────────
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    });

    // ── 7. Mint session JWT ────────────────────────────────────────────────────
    // We build the JWT payload that matches what the jwt() callback writes
    // (see auth.ts). id, role, name, email, sub are the fields NextAuth reads
    // back from the token to populate session.user.
    const secret = process.env.NEXTAUTH_SECRET ?? "";
    const cookieName = sessionCookieName();

    const jwtToken = await encode({
      token: {
        sub: clientUser.id,
        id: clientUser.id,
        email: clientUser.email,
        name: clientUser.name,
        role: clientUser.role,
      },
      secret,
      // The salt MUST match the cookie name — Auth.js uses (secret + salt)
      // as the HKDF input to derive the encryption key.
      salt: cookieName,
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    // ── 8. Set cookie and redirect ─────────────────────────────────────────────
    const isSecure = useSecureCookies();
    const welcomeUrl = new URL("/client/bienvenida", request.url);

    const response = NextResponse.redirect(welcomeUrl);

    response.cookies.set(cookieName, jwtToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isSecure,
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    logInfo("aceptar-invitacion: auto-login successful", {
      invitationId: invitation.id,
      clientId: clientUser.id,
    });

    return response;
  } catch (err) {
    logError(err, { action: "aceptar-invitacion" });
    return NextResponse.redirect(errorUrl);
  }
}
