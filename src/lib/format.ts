// =============================================================================
// BLACKLINE FITNESS — Server-side formatting helpers
// Owner: backend-api.
//
// NOTE: `src/lib/utils.ts` is owned by frontend-react (cn(), etc.).
// These functions live here to avoid ownership conflicts. They are safe to
// import in both Server Components and Client Components.
//
// Currency format: ₡20,000.00 (CRC, Costa Rica convention — comma thousands, dot decimal)
// Date format: using date-fns-tz for correct America/Costa_Rica conversion.
// =============================================================================

import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { DEFAULT_TZ, DEFAULT_CURRENCY } from "./consts";

// ── CRC currency formatter ─────────────────────────────────────────────────────

const crcFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: DEFAULT_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a CRC amount as "₡20,000.00".
 * Accepts number, string, or Prisma Decimal (converts via toString → parseFloat).
 */
export function formatCRC(amount: number | string | { toString(): string }): string {
  const value = typeof amount === "number" ? amount : parseFloat(amount.toString());
  return crcFormatter.format(value);
}

// ── Date formatter ─────────────────────────────────────────────────────────────

/**
 * Format a Date or ISO string in America/Costa_Rica timezone.
 *
 * @param date    - Date object or ISO string (UTC)
 * @param fmt     - date-fns format string. Default: "d 'de' MMMM 'de' yyyy" → "14 de mayo de 2025"
 */
export function formatDateCR(
  date: Date | string,
  fmt = "d 'de' MMMM 'de' yyyy",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, DEFAULT_TZ, fmt, { locale: es });
}

/**
 * Format a Date with time in Costa Rica timezone.
 * Default: "d/MM/yyyy, HH:mm" → "14/05/2025, 07:30"
 */
export function formatDateTimeCR(
  date: Date | string,
  fmt = "d/MM/yyyy, HH:mm",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, DEFAULT_TZ, fmt, { locale: es });
}
