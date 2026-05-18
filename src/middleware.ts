// =============================================================================
// VIZION — Next.js Edge Middleware (auth protection + rate limiting)
// Owner: backend-api.
//
// Guards all routes under /(app)/* — the authenticated shell of the app.
// Unauthenticated requests are redirected to /ingresar with a `callbackUrl`
// query param so the sign-in page can redirect back after successful auth.
//
// Rate limiting is applied to auth endpoints (see RATE_LIMITED_PREFIXES below).
// The limiter is in-process and per-Edge-worker-instance. In multi-instance
// deployments the effective limit is (limit × instance-count) — acceptable
// for the current single-instance Railway deployment. Replace with
// @upstash/ratelimit for global rate limiting when scaling horizontally.
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
import { checkRateLimit, AUTH_LIMIT_PER_MIN } from "@/lib/rate-limit";
import { safeRedirect } from "@/lib/safe-redirect";

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
 * Path prefixes that are rate-limited per IP.
 * These are sensitive auth/account endpoints where brute-force is a concern.
 * Limit: AUTH_LIMIT_PER_MIN requests per minute (default 5, env: RATE_LIMIT_AUTH_PER_MIN).
 */
const RATE_LIMITED_PREFIXES: string[] = [
  "/api/auth/signin",
  "/api/auth/callback",
  "/api/auth/session",
  "/ingresar",
  "/registrarse",
  "/api/lpdp",
];

/**
 * Returns true if `pathname` is explicitly public (no auth required).
 * The root path "/" is also public.
 */
function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Returns true if `pathname` should be rate-limited.
 */
function isRateLimitedPath(pathname: string): boolean {
  return RATE_LIMITED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Extract the best-effort client IP from the request headers.
 * On Railway the real IP arrives via X-Forwarded-For.
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // X-Forwarded-For may contain a comma-separated list; leftmost is the client.
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Fallback: use a stable key so rate limiting still works even without IP.
  return "unknown";
}

// -----------------------------------------------------------------------------
// Middleware handler
// -----------------------------------------------------------------------------

export default auth(function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Check before the auth gate so unauthenticated brute-force attempts are also
  // throttled. Applied only to the paths listed in RATE_LIMITED_PREFIXES.
  if (isRateLimitedPath(pathname)) {
    const ip = getClientIp(req);
    const key = `rl:auth:${ip}`;
    const result = checkRateLimit(key, AUTH_LIMIT_PER_MIN, 60_000);

    if (!result.allowed) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(AUTH_LIMIT_PER_MIN),
          "X-RateLimit-Remaining": "0",
          "Content-Type": "text/plain",
        },
      });
    }
  }

  // ── Public path passthrough ────────────────────────────────────────────────
  // Static assets and _next internals are excluded by the matcher config below,
  // but guard here as well for defensive clarity.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ── Session check ──────────────────────────────────────────────────────────
  // auth() injects `req.auth` on the extended request object.
  // Cast is required because NextAuth augments NextRequest.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = (req as any).auth as { user?: { id?: string } } | null;

  if (!session?.user?.id) {
    // Build the redirect URL with a callbackUrl so the sign-in page can
    // bounce the user back after successful authentication.
    // safeRedirect ensures pathname can never be an external URL even if
    // the matcher config is misconfigured and leaks an external path.
    const safePath = safeRedirect(pathname, "/inicio");
    const signInUrl = new URL("/ingresar", req.url);
    signInUrl.searchParams.set("callbackUrl", safePath);
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
     *   - manifest.webmanifest (PWA manifest — must stay public)
     *   - robots.txt / sitemap.xml (SEO assets)
     *   - Files with extensions: .svg .png .jpg .jpeg .gif .webp .ico .woff .woff2 .ttf .otf .json .xml .txt .webmanifest
     */
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|json|xml|txt|webmanifest)$).*)",
  ],
};
