"use client";

import { create } from "zustand";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardFilterStore {
  /**
   * Whether the filter panel (mobile drawer or desktop popover) is open.
   * Ephemeral UI state — does NOT control data fetching (URL searchParams do that).
   */
  isPanelOpen: boolean;
  togglePanel: () => void;
  closePanel: () => void;

  /**
   * Pending multi-select values before the user commits.
   * These are written to URL searchParams on "Apply" / immediate change.
   */
  pendingGoals: string[];
  pendingParqStatuses: string[];
  setPendingGoals: (goals: string[]) => void;
  setPendingParqStatuses: (statuses: string[]) => void;

  /** Hydrate pending state from committed URL values (call on mount). */
  hydrate: (goals: string[], parqStatuses: string[]) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDashboardFilterStore = create<DashboardFilterStore>((set) => ({
  isPanelOpen: false,

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  closePanel: () => set({ isPanelOpen: false }),

  pendingGoals: [],
  pendingParqStatuses: [],

  setPendingGoals: (goals) => set({ pendingGoals: goals }),
  setPendingParqStatuses: (statuses) => set({ pendingParqStatuses: statuses }),

  hydrate: (goals, parqStatuses) =>
    set({ pendingGoals: goals, pendingParqStatuses: parqStatuses }),
}));
