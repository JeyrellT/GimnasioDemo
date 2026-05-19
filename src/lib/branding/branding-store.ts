// =============================================================================
// BLACKLINE FITNESS — Trainer branding: localStorage persistence
// Stores palette selection + custom logos (base64) per trainer.
// In production this would sync to the database; in demo mode it's local-only.
// =============================================================================

import { DEFAULT_PALETTE_ID } from "./presets";

const STORAGE_KEY = "blackline-fitness_trainer_branding";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TrainerBranding {
  /** Palette preset id (e.g. "blue", "emerald", "custom") */
  paletteId: string;
  /** Hex color when paletteId === "custom" */
  customHex: string | null;
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
  customHex: null,
  logoFull: null,
  logoMark: null,
  businessName: "",
};

// -----------------------------------------------------------------------------
// Read / Write
// -----------------------------------------------------------------------------

export function getBranding(): TrainerBranding {
  if (typeof window === "undefined") return DEFAULT_BRANDING;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    const parsed = JSON.parse(raw) as Partial<TrainerBranding>;
    return {
      paletteId: parsed.paletteId ?? DEFAULT_BRANDING.paletteId,
      customHex: parsed.customHex ?? DEFAULT_BRANDING.customHex,
      logoFull: parsed.logoFull ?? DEFAULT_BRANDING.logoFull,
      logoMark: parsed.logoMark ?? DEFAULT_BRANDING.logoMark,
      businessName: parsed.businessName ?? DEFAULT_BRANDING.businessName,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function saveBranding(branding: TrainerBranding): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
}

export function clearBranding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
