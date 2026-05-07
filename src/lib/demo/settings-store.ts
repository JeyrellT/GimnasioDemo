// =============================================================================
// FORJA — Demo settings: localStorage helpers (Gemini key + demo prefs)
// =============================================================================

const GEMINI_KEY = "forja_demo_gemini_key";
const DEMO_ACTIVE_KEY = "forja_demo_active";

// ── Gemini API key ─────────────────────────────────────────────────────────────

export function getGeminiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GEMINI_KEY);
}

export function setGeminiKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GEMINI_KEY, key);
}

export function clearGeminiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GEMINI_KEY);
}

export function hasGeminiKey(): boolean {
  return !!getGeminiKey();
}

// ── Demo mode flag ─────────────────────────────────────────────────────────────

export function isDemoActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_ACTIVE_KEY) === "true";
}

export function setDemoActive(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) {
    localStorage.setItem(DEMO_ACTIVE_KEY, "true");
  } else {
    localStorage.removeItem(DEMO_ACTIVE_KEY);
  }
}
