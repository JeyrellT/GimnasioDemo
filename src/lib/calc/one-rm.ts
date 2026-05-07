/**
 * Predicción de 1 Repetición Máxima (1RM)
 *
 * Fórmulas implementadas:
 * - Brzycki (1993): peso × (36 / (37 − reps)) — más precisa en rangos bajos (1-10 reps)
 * - Epley (1985): peso × (1 + reps/30) — funciona en rangos más amplios
 *
 * Decisión de producto (PRODUCT_DECISIONS.md §4):
 * "Mayor entre Brzycki y Epley" para evitar subestimar PRs detectados.
 */

export interface OneRmParams {
  weight: number;
  reps: number;
}

export interface OneRmResult {
  value: number;
  method: "brzycki" | "epley" | "avg";
  /** Confianza basada en el rango de reps: alta 1-6, media 7-10, baja 11+ */
  confidence: "high" | "medium" | "low";
}

export interface RepRangeResult {
  repsLow: number;
  repsHigh: number;
}

/**
 * Brzycki (1993)
 * 1RM = peso × (36 / (37 − reps))
 *
 * Solo válida para reps 1-10.
 * Para reps > 10 devuelve null — la fórmula se vuelve inestable
 * (denominador tiende a cero cerca de reps=37).
 */
export function brzycki({ weight, reps }: OneRmParams): number | null {
  if (weight <= 0) {
    throw new RangeError(`weight debe ser > 0. Recibido: ${weight}`);
  }
  if (reps < 1) {
    throw new RangeError(`reps debe ser >= 1. Recibido: ${reps}`);
  }

  if (reps > 10) {
    return null;
  }

  const result = weight * (36 / (37 - reps));
  return Math.round(result * 100) / 100;
}

/**
 * Epley (1985)
 * 1RM = peso × (1 + reps/30)
 *
 * Válida para cualquier número de reps, aunque pierde precisión
 * con reps muy altas (>12).
 */
export function epley({ weight, reps }: OneRmParams): number {
  if (weight <= 0) {
    throw new RangeError(`weight debe ser > 0. Recibido: ${weight}`);
  }
  if (reps < 1) {
    throw new RangeError(`reps debe ser >= 1. Recibido: ${reps}`);
  }

  const result = weight * (1 + reps / 30);
  return Math.round(result * 100) / 100;
}

/**
 * Predicción de 1RM con selección automática de fórmula.
 *
 * Estrategia según PRODUCT_DECISIONS:
 * - reps 1-10: computa ambas, toma el MÁXIMO (evita subestimar PR)
 * - reps 11+: solo Epley (Brzycki no es válida en ese rango)
 *
 * Confianza clínica:
 * - 1-6 reps: alta (el peso relativo al 1RM es predecible)
 * - 7-10 reps: media (fatiga acumulada introduce variabilidad)
 * - 11+: baja (la estimación es una extrapolación gruesa)
 */
export function predictOneRM({ weight, reps }: OneRmParams): OneRmResult {
  if (weight <= 0) {
    throw new RangeError(`weight debe ser > 0. Recibido: ${weight}`);
  }
  if (reps < 1) {
    throw new RangeError(`reps debe ser >= 1. Recibido: ${reps}`);
  }

  const epleyVal = epley({ weight, reps });
  const brzyckiVal = brzycki({ weight, reps });

  let value: number;
  let method: OneRmResult["method"];
  let confidence: OneRmResult["confidence"];

  if (reps >= 11) {
    // Solo Epley disponible — Brzycki no es confiable aquí
    value = epleyVal;
    method = "epley";
    confidence = "low";
  } else if (brzyckiVal === null) {
    // Guard redundante para satisfacer el type checker
    value = epleyVal;
    method = "epley";
    confidence = reps <= 6 ? "high" : "medium";
  } else {
    // Tomamos el máximo de ambas para evitar subestimar el PR
    if (brzyckiVal >= epleyVal) {
      value = brzyckiVal;
      method = "brzycki";
    } else {
      value = epleyVal;
      method = "epley";
    }
    confidence = reps <= 6 ? "high" : "medium";
  }

  return {
    value: Math.round(value * 100) / 100,
    method,
    confidence,
  };
}

/**
 * Tabla inversa de %1RM → rango de reps estimado.
 *
 * Basada en la tabla de Prilepin (adaptada para hipertrofia y fuerza):
 * 95%+ → 1-2 reps
 * 90%  → 2-3 reps
 * 85%  → 4-6 reps
 * 80%  → 6-8 reps
 * 75%  → 8-10 reps
 * 70%  → 10-12 reps
 * 65%  → 12-15 reps
 * <65% → 15+ reps
 */
export function repPercentageOf1RM(percentage: number): RepRangeResult {
  if (percentage <= 0 || percentage > 100) {
    throw new RangeError(
      `percentage debe estar entre 1 y 100. Recibido: ${percentage}`,
    );
  }

  if (percentage >= 95) {
    return { repsLow: 1, repsHigh: 2 };
  }
  if (percentage >= 90) {
    return { repsLow: 2, repsHigh: 3 };
  }
  if (percentage >= 85) {
    return { repsLow: 4, repsHigh: 6 };
  }
  if (percentage >= 80) {
    return { repsLow: 6, repsHigh: 8 };
  }
  if (percentage >= 75) {
    return { repsLow: 8, repsHigh: 10 };
  }
  if (percentage >= 70) {
    return { repsLow: 10, repsHigh: 12 };
  }
  if (percentage >= 65) {
    return { repsLow: 12, repsHigh: 15 };
  }
  return { repsLow: 15, repsHigh: 20 };
}
