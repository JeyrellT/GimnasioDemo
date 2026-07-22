// =============================================================================
// Client rest preferences — pure helpers
// Used by the active session client and the /client/ajustes editor.
//
// Resolution order:
//   1. exerciseOverrides[exerciseId] (absolute, wins if present).
//   2. baseRestSeconds + globalOffsetSec, clamped to >= 0.
// =============================================================================

export type ClientRestPrefs = {
  globalOffsetSec: number;
  exerciseOverrides: Record<string, number>;
};

export const REST_GLOBAL_OFFSET_MIN = -60;
export const REST_GLOBAL_OFFSET_MAX = 180;
export const REST_OVERRIDE_MIN = 0;
export const REST_OVERRIDE_MAX = 900; // 15 min cap, matches the trainer-side selector.

/**
 * Resolves the effective rest period for an exercise given the client's
 * preferences. Returns the base value untouched when prefs is null.
 */
export function applyClientRestPrefs(
  baseRestSeconds: number,
  exerciseId: string,
  prefs: ClientRestPrefs | null | undefined,
): number {
  if (!prefs) return Math.max(0, baseRestSeconds);

  const override = prefs.exerciseOverrides?.[exerciseId];
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return Math.min(REST_OVERRIDE_MAX, Math.max(0, Math.floor(override)));
  }

  const adjusted = baseRestSeconds + (prefs.globalOffsetSec ?? 0);
  return Math.max(0, Math.floor(adjusted));
}

/**
 * Type guard / normalizer for the JSON `exerciseOverrides` blob coming from
 * Prisma. Filters out non-numeric values and out-of-range entries.
 */
export function normalizeExerciseOverrides(
  raw: unknown,
): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    if (v < REST_OVERRIDE_MIN || v > REST_OVERRIDE_MAX) continue;
    out[k] = Math.floor(v);
  }
  return out;
}

/**
 * Clamps an integer global offset into the allowed range.
 */
export function clampGlobalOffset(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(REST_GLOBAL_OFFSET_MIN, Math.min(REST_GLOBAL_OFFSET_MAX, Math.floor(seconds)));
}

/**
 * Same formatter the trainer-side selector uses, exposed so the client editor
 * stays visually consistent.
 */
export function formatRestLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
