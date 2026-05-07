// =============================================================================
// FORJA — Dashboard pure transformation utilities
// Owner: backend-api.
//
// All functions here are pure (no side effects, no I/O, no Prisma).
// Called from queries.ts and the server actions file.
// =============================================================================

import type { Prisma } from "@prisma/client";

// ── Decimal conversion ────────────────────────────────────────────────────────

/**
 * Convert a Prisma Decimal (or null) to a plain JS number (or null).
 * Prevents Decimal objects from leaking across the RSC boundary.
 */
export function decimalToNumber(d: Prisma.Decimal | null | undefined): number | null {
  if (d == null) return null;
  return Number(d);
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Number of whole days between two dates (|a - b| in 24h increments).
 * Always returns a non-negative value.
 */
export function daysBetween(a: Date, b: Date): number {
  return Math.abs(Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Return a new Date set to 23:59:59.999 on the same UTC calendar day.
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Return a new Date set to 00:00:00.000 on the ISO Monday of the week
 * containing `date` (UTC-based).
 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  // ISO week starts on Monday (day 1). getUTCDay() returns 0=Sunday.
  const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // distance to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Format `YYYY-MM-DD` string from a Date using UTC fields.
 */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ── Relative time formatting (es-CR) ──────────────────────────────────────────

/**
 * Return a human-readable Spanish relative time string.
 *   - null / undefined → "Nunca"
 *   - today (UTC) → "Hoy"
 *   - 1 day ago → "Hace 1 día"
 *   - N days ago → "Hace N días"
 *   - future or same minute → "Hoy"
 */
export function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return "Nunca";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Hace 1 día";
  return `Hace ${diffDays} días`;
}

// ── Percentile helpers ────────────────────────────────────────────────────────

/**
 * Compute a percentile value from a sorted (ascending) numeric array.
 * Returns 0 if the array is empty.
 * Uses nearest-rank method.
 */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedAsc.length) - 1;
  return sortedAsc[Math.max(0, Math.min(idx, sortedAsc.length - 1))] ?? 0;
}

// ── Heatmap intensity ─────────────────────────────────────────────────────────

/**
 * Map a raw event count to a heatmap intensity bucket.
 */
export function heatmapIntensity(
  count: number,
): "none" | "low" | "medium" | "high" {
  if (count === 0) return "none";
  if (count === 1) return "low";
  if (count <= 3) return "medium";
  return "high";
}

// ── Alert ID derivation ───────────────────────────────────────────────────────

/**
 * Produce a deterministic string id for a derived alert.
 * Not cryptographically secure — used only as a stable React key / dedup id.
 * Format: "clientId:trigger"
 */
export function alertId(clientId: string, trigger: string): string {
  return `${clientId}:${trigger}`;
}
