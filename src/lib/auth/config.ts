// =============================================================================
// FORJA — Demo mode Auth.js config stub
// Replaces the real NextAuth setup. No real providers, no DB adapter.
// Exports the same names so callsites do not break.
// =============================================================================

export const authConfig = {};

export const handlers = {
  GET: () => new Response(null, { status: 404 }),
  POST: () => new Response(null, { status: 404 }),
};

// auth() — returns a dummy session object
export async function auth() {
  return {
    user: {
      id: "trainer-demo-001",
      email: "demo@forja.app",
      name: "Coach Demo",
      role: "TRAINER",
    },
    expires: "2099-12-31T00:00:00.000Z",
  };
}

// signIn — no-op in demo (navigation is handled client-side)
export async function signIn(
  _provider?: string,
  _options?: Record<string, unknown>,
) {
  return { ok: true };
}

// signOut — no-op in demo
export async function signOut(
  _options?: Record<string, unknown>,
) {
  return { ok: true };
}
