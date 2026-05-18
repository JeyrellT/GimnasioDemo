// =============================================================================
// VIZION — Safe redirect helper
// Owner: backend-api.
//
// Prevents open redirect vulnerabilities by ensuring any URL that originated
// from user-controlled input (query params, form fields, etc.) is either:
//   a) a relative path on the same origin, OR
//   b) an absolute URL whose origin matches the application origin.
//
// Usage:
//   import { safeRedirect } from "@/lib/safe-redirect";
//   router.push(safeRedirect(callbackUrl));
//   redirect(safeRedirect(rawParam, "/inicio"));
// =============================================================================

/**
 * Derive the trusted application origin from environment variables.
 * Falls back to an empty string so the absolute-URL check always fails safely
 * when neither variable is set (e.g. during static export builds).
 */
function appOrigin(): string {
  // NEXTAUTH_URL is the canonical auth base; APP_URL is the public base.
  // Both should resolve to the same origin in a normal deployment.
  const raw =
    process.env.NEXTAUTH_URL ??
    process.env.APP_URL ??
    "";

  if (!raw) return "";

  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

/**
 * Returns `url` only if it is safe to redirect to; otherwise returns `fallback`.
 *
 * Safe means:
 *   - A relative path that starts with "/" but NOT "//" or "/\" (protocol-relative
 *     or UNC-style paths that browsers treat as absolute URLs).
 *   - An absolute URL whose origin exactly matches the trusted application origin.
 *
 * @param url      - The candidate redirect target (may come from user input).
 * @param fallback - Returned when `url` is unsafe. Must itself be a safe relative
 *                   path. Defaults to "/".
 */
export function safeRedirect(url: string | null | undefined, fallback = "/"): string {
  if (!url) return fallback;

  // Relative path — must start with "/" but not "//" (protocol-relative) or
  // "/\" (Windows-style UNC path that some browsers normalize to "//").
  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.startsWith("/\\")
  ) {
    return url;
  }

  // Absolute URL — only allow if it matches the trusted origin.
  try {
    const origin = appOrigin();
    if (origin && new URL(url).origin === origin) {
      return url;
    }
  } catch {
    // Malformed URL — fall through to reject.
  }

  return fallback;
}

/**
 * Narrow variant for use in NextAuth callbacks.redirect.
 * Returns `url` if safe, `baseUrl` if not (NextAuth convention).
 *
 * @param url     - Candidate URL passed by NextAuth (may be user-controlled).
 * @param baseUrl - Application base URL provided by NextAuth.
 */
export function safeNextAuthRedirect(url: string, baseUrl: string): string {
  // Relative paths are always allowed.
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
    return url;
  }

  // Absolute URL — only allow if it starts with the trusted baseUrl origin.
  try {
    const trusted = new URL(baseUrl).origin;
    if (new URL(url).origin === trusted) {
      return url;
    }
  } catch {
    // Fall through.
  }

  return baseUrl;
}
