// =============================================================================
// VIZION — Next.js Edge Middleware (auth protection)
// Owner: backend-api.
//
// Guards all routes under /(app)/* — the authenticated shell of the app.
// Unauthenticated requests are redirected to /ingresar with a `callbackUrl`
// query param so the sign-in page can redirect back after successful auth.
//
// Public routes that do NOT require a session:
//   /                   — marketing landing
//   /ingresar           — sign-in / magic link
//   /registrarse        — sign-up (trainer onboarding entry point)
//   /verificar          — email verification landing
//   /invitacion/*       — client invitation flows
//   /pricing            — public pricing page
//   /legal/*            — privacy, terms, LPDP
//   /api/webhooks/*     — Tilopay / Resend webhook receivers (use HMAC auth)
//   /api/auth/*         — NextAuth internal routes (must stay open)
//
// The matcher excludes Next.js internals (_next/*), static files and common
// asset extensions so middleware never runs on non-page requests.
// =============================================================================

import NextAuth from "next-auth";
import { authConfig } from "@/server/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Create an Edge-compatible auth wrapper — no PrismaClient, no Node.js modules.
const { auth } = NextAuth(authConfig);

// -----------------------------------------------------------------------------
// Public path prefixes — requests matching these skip the auth gate.
// Keep this list in sync with the route tree.
// -----------------------------------------------------------------------------

const PUBLIC_PREFIXES: string[] = [
  "/ingresar",
  "/registrarse",
  "/verificar",
  "/invitacion",
  "/pricing",
  "/legal",
  "/api/webhooks",
  "/api/auth",
  "/api/health",
];

/**
 * Returns true if `pathname` is explicitly public (no auth required).
 * The root path "/" is also public.
 */
function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// -----------------------------------------------------------------------------
// Middleware handler
// -----------------------------------------------------------------------------

export default auth(function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets and _next internals are excluded by the matcher config below,
  // but guard here as well for defensive clarity.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // auth() injects `req.auth` on the extended request object.
  // Cast is required because NextAuth augments NextRequest.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = (req as any).auth as { user?: { id?: string } } | null;

  if (!session?.user?.id) {
    // Build the redirect URL with a callbackUrl so the sign-in page can
    // bounce the user back after successful authentication.
    const signInUrl = new URL("/ingresar", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Session exists — allow the request through.
  return NextResponse.next();
});

// -----------------------------------------------------------------------------
// Matcher configuration
// -----------------------------------------------------------------------------
//
// Exclude:
//   - _next/static  — compiled assets
//   - _next/image   — Image Optimization API
//   - favicon.ico   — browser favicon request
//   - Common static file extensions (images, fonts, manifests, etc.)
//
// The regex is evaluated by the Next.js Edge runtime before middleware runs,
// so this pattern is the first performance gate.
// -----------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static (static files)
     *   - _next/image (image optimization)
     *   - favicon.ico
     *   - Files with extensions: .svg .png .jpg .jpeg .gif .webp .ico .woff .woff2 .ttf .otf .json .xml .txt
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|json|xml|txt)$).*)",
  ],
};
