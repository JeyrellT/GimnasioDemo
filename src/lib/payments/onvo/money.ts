// =============================================================================
// BLACKLINE FITNESS — ONVO money helpers
// Ported from BarberXCR. ONVO represents amounts as INTEGER cents (smallest
// currency unit). For CRC: ₡15.000 -> 1_500_000. round() before the cast kills
// IEEE-754 drift (e.g. 0.1 + 0.2).
// =============================================================================

/** Convert a CRC (or USD) amount to integer cents for the ONVO `amount` field. */
export function toCents(amount: number): number {
	return Math.round(amount * 100);
}

/** Inverse of toCents — for display of ONVO-returned amounts. */
export function fromCents(amountCents: number): number {
	return amountCents / 100;
}
