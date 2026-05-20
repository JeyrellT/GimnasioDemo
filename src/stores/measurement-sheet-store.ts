// =============================================================================
// BLACKLINE FITNESS — Measurement sheet store
// Owner: frontend-react.
//
// Coordinates the "+ Nueva medición" sheet between two Client Components that
// don't share a parent: the trigger button (inside ClientHeroCard) and the
// sheet itself (mounted as a sibling in the profile page). Using a store
// avoids passing render-prop children across the RSC → Client boundary, which
// React 19 forbids (functions are not serializable).
// =============================================================================

import { create } from "zustand";

// -----------------------------------------------------------------------------
// Focus types
// -----------------------------------------------------------------------------

export type AnthroSubTab = "tronco" | "brazos" | "piernas";

/**
 * Describes which field/tab to focus when the sheet opens via `openWithFocus`.
 *
 * Zone → SheetFocus mapping for the orchestrator:
 *   neck        → { anthroTab: "tronco",   field: "neckCm" }
 *   shoulderL   → { anthroTab: "tronco",   field: "shoulderLeftCm" }
 *   shoulderR   → { anthroTab: "tronco",   field: "shoulderRightCm" }
 *   chest       → { anthroTab: "tronco",   field: "chestCm" }
 *   abdomen     → { anthroTab: "tronco",   field: "abdomenCm" }
 *   waist       → { anthroTab: "tronco",   field: "waistCm" }
 *   hip         → { anthroTab: "tronco",   field: "hipCm" }
 *   gluteL      → { anthroTab: "tronco",   field: "gluteLeftCm" }
 *   gluteR      → { anthroTab: "tronco",   field: "gluteRightCm" }
 *   bicepL      → { anthroTab: "brazos",   field: "bicepLeftCm" }
 *   bicepR      → { anthroTab: "brazos",   field: "bicepRightCm" }
 *   forearmL    → { anthroTab: "brazos",   field: "forearmLeftCm" }
 *   forearmR    → { anthroTab: "brazos",   field: "forearmRightCm" }
 *   quadL       → { anthroTab: "piernas",  field: "thighLeftCm" }
 *   quadR       → { anthroTab: "piernas",  field: "thighRightCm" }
 *   hamstringL  → { anthroTab: "piernas",  field: "hamstringLeftCm" }
 *   hamstringR  → { anthroTab: "piernas",  field: "hamstringRightCm" }
 *   calfL       → { anthroTab: "piernas",  field: "calfLeftCm" }
 *   calfR       → { anthroTab: "piernas",  field: "calfRightCm" }
 */
export interface SheetFocus {
  /** Pestaña principal — default "antropometria" cuando hay focus de circunferencia. */
  tab?: "bascula" | "antropometria" | "composicion";
  /** Sub-pestaña dentro de antropometría. */
  anthroTab?: AnthroSubTab;
  /** Nombre EXACTO del campo MeasurementFormData (ej: "chestCm"). */
  field?: string;
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

interface MeasurementSheetState {
  isOpen: boolean;
  clientId: string | null;
  focus: SheetFocus | null;
  open: (clientId: string) => void;
  openWithFocus: (clientId: string, focus: SheetFocus) => void;
  clearFocus: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

export const useMeasurementSheetStore = create<MeasurementSheetState>((set, get) => ({
  isOpen: false,
  clientId: null,
  focus: null,

  open: (clientId) => set({ isOpen: true, clientId, focus: null }),

  openWithFocus: (clientId, focus) => set({ isOpen: true, clientId, focus }),

  clearFocus: () => set({ focus: null }),

  close: () => set({ isOpen: false, focus: null }),

  // Used by Radix/Vaul Sheet's onOpenChange to keep the store in sync.
  setOpen: (open) => {
    if (open) {
      // Caller should have already set clientId via `open(id)`. If not, ignore.
      if (!get().clientId) return;
      set({ isOpen: true });
    } else {
      set({ isOpen: false, focus: null });
    }
  },
}));
