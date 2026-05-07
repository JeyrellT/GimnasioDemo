// =============================================================================
// FORJA — UI utilities
// Owner: frontend-react.
// =============================================================================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names safely.
 * Combines clsx (conditional classes) + tailwind-merge (deduplication).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Re-export formatting helpers from backend-api's format.ts
// so client components have a single import point.
export { formatCRC, formatDateCR, formatDateTimeCR } from "@/lib/format";
