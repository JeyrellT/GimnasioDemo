// =============================================================================
// BLACKLINE FITNESS — Trainer branding: types + defaults
// The actual persistence is handled by server actions (branding.actions.ts).
// This file defines the shared type, defaults, and a localStorage cache layer
// for instant hydration before the DB response arrives.
// =============================================================================

import { DEFAULT_PALETTE_ID } from "./presets";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TrainerBranding {
  /** Palette preset id (e.g. "blue", "emerald") */
  paletteId: string;
  /** Base64 data-URL for the full logo (desktop header). null = use default BL. */
  logoFull: string | null;
  /** Base64 data-URL for the mark/abbreviated logo (mobile). null = use default BL. */
  logoMark: string | null;
  /** Optional business name shown in the wordmark area */
  businessName: string;
}

// -----------------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------------

export const DEFAULT_BRANDING: TrainerBranding = {
  paletteId: DEFAULT_PALETTE_ID,
  logoFull: null,
  logoMark: null,
  businessName: "",
};

// -----------------------------------------------------------------------------
// localStorage cache (instant hydration before DB responds)
// -----------------------------------------------------------------------------

const CACHE_KEY = "blackline-fitness_branding_cache";

export function getCachedBranding(): TrainerBranding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TrainerBranding>;
    return {
      paletteId: parsed.paletteId ?? DEFAULT_BRANDING.paletteId,
      logoFull: parsed.logoFull ?? DEFAULT_BRANDING.logoFull,
      logoMark: parsed.logoMark ?? DEFAULT_BRANDING.logoMark,
      businessName: parsed.businessName ?? DEFAULT_BRANDING.businessName,
    };
  } catch {
    return null;
  }
}

export function setCachedBranding(branding: TrainerBranding): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(branding));
  } catch {
    // quota exceeded — ignore
  }
}

export function clearCachedBranding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
  // Also clean up legacy key from the old localStorage-only system
  localStorage.removeItem("blackline-fitness_trainer_branding");
}
