// =============================================================================
// VIZION — Measurement sheet store
// Owner: frontend-react.
//
// Coordinates the "+ Nueva medición" sheet between two Client Components that
// don't share a parent: the trigger button (inside ClientHeroCard) and the
// sheet itself (mounted as a sibling in the profile page). Using a store
// avoids passing render-prop children across the RSC → Client boundary, which
// React 19 forbids (functions are not serializable).
// =============================================================================

import { create } from "zustand";

interface MeasurementSheetState {
  isOpen: boolean;
  clientId: string | null;
  open: (clientId: string) => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

export const useMeasurementSheetStore = create<MeasurementSheetState>((set, get) => ({
  isOpen: false,
  clientId: null,

  open: (clientId) => set({ isOpen: true, clientId }),

  close: () => set({ isOpen: false }),

  // Used by Radix/Vaul Sheet's onOpenChange to keep the store in sync.
  setOpen: (open) => {
    if (open) {
      // Caller should have already set clientId via `open(id)`. If not, ignore.
      if (!get().clientId) return;
      set({ isOpen: true });
    } else {
      set({ isOpen: false });
    }
  },
}));
