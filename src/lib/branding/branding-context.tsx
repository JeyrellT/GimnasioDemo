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
import {
  getClientTrainerBranding,
  getTrainerBranding,
  updateTrainerBranding,
  type TrainerBrandingData,
} from "@/app/actions/branding";

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

function normalizeBranding(data: TrainerBrandingData): TrainerBranding {
  return {
    paletteId: data.paletteId || DEFAULT_BRANDING.paletteId,
    businessName: data.businessName ?? "",
    logoFull: data.logoFull ?? null,
    logoMark: data.logoMark ?? null,
  };
}

function isDefaultBranding(branding: TrainerBranding): boolean {
  return (
    branding.paletteId === DEFAULT_BRANDING.paletteId &&
    branding.businessName === DEFAULT_BRANDING.businessName &&
    branding.logoFull === DEFAULT_BRANDING.logoFull &&
    branding.logoMark === DEFAULT_BRANDING.logoMark
  );
}

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isTrainer = user?.role === "TRAINER";
  const isClient = user?.role === "CLIENT";

  const [branding, setBranding] = useState<TrainerBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    let cancelled = false;

    async function loadBranding() {
      if (isTrainer) {
        const cached = getBranding();
        setBranding(cached);

        const result = await getTrainerBranding();
        if (cancelled) return;

        if (!result.ok) return;

        const remote = normalizeBranding(result.value);
        const shouldSeedRemote = isDefaultBranding(remote) && !isDefaultBranding(cached);

        if (shouldSeedRemote) {
          void updateTrainerBranding(cached);
          setBranding(cached);
          return;
        }

        setBranding(remote);
        saveBranding(remote);
        return;
      }

      if (isClient) {
        setBranding(DEFAULT_BRANDING);
        const result = await getClientTrainerBranding();
        if (cancelled) return;
        setBranding(result.ok ? normalizeBranding(result.value) : DEFAULT_BRANDING);
        return;
      }

      setBranding(DEFAULT_BRANDING);
    }

    void loadBranding();

    return () => {
      cancelled = true;
    };
  }, [user, isTrainer, isClient]);

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
      if (!isTrainer) return;
      setBranding((prev) => {
        const next = { ...prev, ...patch };
        saveBranding(next);
        void updateTrainerBranding(next);
        return next;
      });
    },
    [isTrainer],
  );

  const reset = useCallback(() => {
    if (!isTrainer) return;
    setBranding(DEFAULT_BRANDING);
    saveBranding(DEFAULT_BRANDING);
    void updateTrainerBranding(DEFAULT_BRANDING);
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
