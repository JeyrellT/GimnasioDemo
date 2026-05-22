"use client";

// =============================================================================
// BLACKLINE FITNESS — Branding context
// Provides the active palette + logo across the app. On mount it reads from
// localStorage and injects CSS custom properties so that every component using
// var(--brand-primary) etc. picks up the trainer's chosen palette automatically.
//
// IMPORTANT: branding is per-trainer. localStorage is per-browser, so we MUST
// gate by role — otherwise a coach who configured branding and then logs into
// the same browser as a client would leak their logo/palette onto the client UI.
// Only TRAINER sees their custom branding; clients/admins always see defaults.
// =============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// useLayoutEffect fires synchronously after DOM mutations but before paint,
// eliminating the blue-flash on first client render. It only warns in SSR
// (where it can't run) — fall back to useEffect on the server.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
import {
  getBranding,
  saveBranding,
  type TrainerBranding,
  DEFAULT_BRANDING,
} from "./branding-store";
import { getPaletteById, type PaletteColors } from "./presets";
import { useAuth } from "@/components/providers/auth-provider";

// -----------------------------------------------------------------------------
// Context shape
// -----------------------------------------------------------------------------

export interface BrandingContextValue {
  branding: TrainerBranding;
  palette: PaletteColors;
  /** Update one or more fields and persist to localStorage */
  update: (patch: Partial<TrainerBranding>) => void;
  /** Reset everything to defaults */
  reset: () => void;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  palette: getPaletteById(DEFAULT_BRANDING.paletteId),
  update: () => {},
  reset: () => {},
});

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isTrainer = user?.role === "TRAINER";

  // Branding is a trainer-only feature. Clients/admins always see defaults
  // to avoid leaking a coach's localStorage into another role's UI in the
  // same browser. We start from DEFAULT_BRANDING and only hydrate from
  // localStorage when the authenticated user is a trainer.
  const [branding, setBranding] = useState<TrainerBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isTrainer) {
      setBranding(getBranding());
    } else {
      setBranding(DEFAULT_BRANDING);
    }
  }, [isTrainer]);

  const palette = useMemo(
    () => getPaletteById(branding.paletteId),
    [branding.paletteId],
  );

  // Inject CSS custom properties onto :root whenever palette changes.
  // useLayoutEffect ensures variables are set before browser paint.
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", palette.primary);
    root.style.setProperty("--brand-primary-hover", palette.primaryHover);
    root.style.setProperty("--brand-accent", palette.accent);
    root.style.setProperty("--brand-glow", palette.glow);
    root.style.setProperty("--brand-deep", palette.deep);
    root.style.setProperty("--brand-tint", palette.tint);

    // Also update the Tailwind v4 @theme tokens that use --color-brand-*
    root.style.setProperty("--color-brand-primary", palette.primary);
    root.style.setProperty("--color-brand-primary-hover", palette.primaryHover);
    root.style.setProperty("--color-brand-accent", palette.accent);
    root.style.setProperty("--color-brand-glow", palette.glow);
    root.style.setProperty("--color-brand-deep", palette.deep);

    return () => {
      // Clean up on unmount (e.g. if provider is removed)
      root.style.removeProperty("--brand-primary");
      root.style.removeProperty("--brand-primary-hover");
      root.style.removeProperty("--brand-accent");
      root.style.removeProperty("--brand-glow");
      root.style.removeProperty("--brand-deep");
      root.style.removeProperty("--brand-tint");
      root.style.removeProperty("--color-brand-primary");
      root.style.removeProperty("--color-brand-primary-hover");
      root.style.removeProperty("--color-brand-accent");
      root.style.removeProperty("--color-brand-glow");
      root.style.removeProperty("--color-brand-deep");
    };
  }, [palette]);

  const update = useCallback(
    (patch: Partial<TrainerBranding>) => {
      // Guard: only trainers can mutate branding. Prevents accidental writes
      // from a non-trainer session polluting the shared localStorage key.
      if (!isTrainer) return;
      setBranding((prev) => {
        const next = { ...prev, ...patch };
        saveBranding(next);
        return next;
      });
    },
    [isTrainer],
  );

  const reset = useCallback(() => {
    if (!isTrainer) return;
    setBranding(DEFAULT_BRANDING);
    saveBranding(DEFAULT_BRANDING);
  }, [isTrainer]);

  const value = useMemo<BrandingContextValue>(
    () => ({ branding, palette, update, reset }),
    [branding, palette, update, reset],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}
