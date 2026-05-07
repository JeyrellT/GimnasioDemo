// =============================================================================
// FORJA — Demo mode auth actions stub
// Replaces the real server actions. All operations are no-ops or client-side
// redirects. Static export does not support Server Actions.
// =============================================================================

import type { ActionResult } from "@/types/api";
import type { User } from "@/types/domain";

// ── Sign out ──────────────────────────────────────────────────────────────────

export async function signOutAction(): Promise<ActionResult<void>> {
  if (typeof window !== "undefined") {
    window.location.href = "/ingresar";
  }
  return { ok: true, value: undefined };
}

// ── Request magic link ────────────────────────────────────────────────────────

export async function requestMagicLink(
  _email: string,
  _callbackUrl?: string,
): Promise<ActionResult<{ sent: boolean; email: string }>> {
  return { ok: true, value: { sent: true, email: _email } };
}

// ── Register new user ─────────────────────────────────────────────────────────

export async function registerUser(
  _raw: unknown,
): Promise<ActionResult<{ sent: boolean; email: string }>> {
  return { ok: true, value: { sent: true, email: "demo@forja.app" } };
}

// ── Update basic profile ──────────────────────────────────────────────────────

export async function updateProfileBasic(
  _raw: unknown,
): Promise<ActionResult<Pick<User, "id" | "name" | "avatarUrl" | "theme">>> {
  return {
    ok: true,
    value: {
      id: "trainer-demo-001",
      name: "Coach Demo",
      avatarUrl: null,
      theme: "dark",
    },
  };
}
