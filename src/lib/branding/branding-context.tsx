"use client";

// =============================================================================
// BLACKLINE FITNESS — Branding context (DB-backed)
// Loads trainer branding from the database on mount. Uses localStorage as a
// cache for instant hydration (avoids flash of default palette). Trainers can
// update branding; clients see their assigned trainer's branding (read-only).
// =============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getCachedBranding,
  setCachedBranding,
  clearCachedBranding,
  type TrainerBranding,
  DEFAULT_BRANDING,
} from "./branding-store";
import { getPaletteById, type PaletteColors } from "./presets";

// -----------------------------------------------------------------------------
// Context shape
// -----------------------------------------------------------------------------

export interface BrandingContextValue {
  branding: TrainerBranding;
  palette: PaletteColors;
  /** Update one or more fields and persist to database */
  update: (patch: Partial<TrainerBranding>) => void;
  /** Reset everything to defaults */
  reset: () => void;
  /** True while loading from DB on mount */
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  palette: getPaletteById(DEFAULT_BRANDING.paletteId),
  update: () => {},
  reset: () => {},
  isLoading: true,
});

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  // Hydrate from cache immediately (avoids flash)
  const [branding, setBranding] = useState<TrainerBranding>(
    () => getCachedBranding() ?? DEFAULT_BRANDING,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Track whether we've loaded from DB to avoid re-fetching
  const loadedRef = useRef(false);
  // Track pending server action imports to avoid stale closures
  const actionsRef = useRef<{
    getTrainerBranding: (() => Promise<unknown>) | null;
    getClientTrainerBranding: (() => Promise<unknown>) | null;
    updateTrainerBranding: ((input: Partial<TrainerBranding>) => Promise<unknown>) | null;
  }>({ getTrainerBranding: null, getClientTrainerBranding: null, updateTrainerBranding: null });

  // Load server actions dynamically (tree-shakes in non-auth pages)
  useEffect(() => {
    import("@/app/actions/branding").then((mod) => {
      actionsRef.current.getTrainerBranding = mod.getTrainerBranding;
      actionsRef.current.getClientTrainerBranding = mod.getClientTrainerBranding;
      actionsRef.current.updateTrainerBranding = mod.updateTrainerBranding;
    }).catch(() => {
      // Server actions not available (e.g. build-time)
    });
  }, []);

  // Fetch from DB once authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || loadedRef.current) return;

    const fetchBranding = async () => {
      try {
        // Wait a tick for actions to be loaded
        await new Promise((r) => setTimeout(r, 50));

        let result: unknown;
        if (user.role === "TRAINER" || user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
          const fn = actionsRef.current.getTrainerBranding;
          if (fn) result = await fn();
        } else if (user.role === "CLIENT") {
          const fn = actionsRef.current.getClientTrainerBranding;
          if (fn) result = await fn();
        }

        // Server actions return { ok: true, value: ... } or { ok: false, error: ... }
        const res = result as { ok?: boolean; value?: TrainerBranding } | undefined;
        if (res?.ok && res.value) {
          const fromDb: TrainerBranding = {
            paletteId: res.value.paletteId ?? DEFAULT_BRANDING.paletteId,
            businessName: res.value.businessName ?? DEFAULT_BRANDING.businessName,
            logoFull: res.value.logoFull ?? DEFAULT_BRANDING.logoFull,
            logoMark: res.value.logoMark ?? DEFAULT_BRANDING.logoMark,
          };
          setBranding(fromDb);
          setCachedBranding(fromDb);
        }
      } catch {
        // Fallback to cache or defaults — already set
      } finally {
        loadedRef.current = true;
        setIsLoading(false);
      }
    };

    fetchBranding();
  }, [isAuthenticated, user]);

  // If not authenticated after a delay, stop loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated) setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  const palette = useMemo(
    () => getPaletteById(branding.paletteId),
    [branding.paletteId],
  );

  // Inject CSS custom properties onto :root whenever palette changes
  useEffect(() => {
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
      setBranding((prev) => {
        const next = { ...prev, ...patch };
        // Persist to cache immediately for responsive UI
        setCachedBranding(next);

        // Persist to database in background
        const fn = actionsRef.current.updateTrainerBranding;
        if (fn) {
          fn(patch).catch(() => {
            // Silently fail — cache is the source of truth for this session
          });
        }

        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setBranding(DEFAULT_BRANDING);
    setCachedBranding(DEFAULT_BRANDING);
    clearCachedBranding();

    // Persist reset to database
    const fn = actionsRef.current.updateTrainerBranding;
    if (fn) {
      fn({
        paletteId: DEFAULT_BRANDING.paletteId,
        businessName: DEFAULT_BRANDING.businessName,
        logoFull: null,
        logoMark: null,
      }).catch(() => {});
    }
  }, []);

  const value = useMemo<BrandingContextValue>(
    () => ({ branding, palette, update, reset, isLoading }),
    [branding, palette, update, reset, isLoading],
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
