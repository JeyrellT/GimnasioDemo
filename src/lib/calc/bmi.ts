/**
 * Cálculo de Índice de Masa Corporal (IMC)
 * Fórmula: peso(kg) / altura(m)²
 *
 * Clasificación según OMS (2000).
 * Labels en español Costa Rica, voseo.
 */

export type BmiCategory =
  | "UNDERWEIGHT_SEVERE"
  | "UNDERWEIGHT"
  | "NORMAL"
  | "OVERWEIGHT"
  | "OBESE_I"
  | "OBESE_II"
  | "OBESE_III";

export interface BmiClassification {
  category: BmiCategory;
  /** Etiqueta en español CR para mostrar en UI */
  label: string;
}

export interface BmiParams {
  weightKg: number;
  heightCm: number;
}

/**
 * Calcula el IMC con 1 decimal de precisión.
 * IMC = peso(kg) / (altura(m))²
 */
export function calculateBmi({ weightKg, heightCm }: BmiParams): number {
  if (weightKg <= 0) {
    throw new RangeError(`weightKg debe ser > 0. Recibido: ${weightKg}`);
  }
  if (heightCm <= 0) {
    throw new RangeError(`heightCm debe ser > 0. Recibido: ${heightCm}`);
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  // 1 decimal según convención clínica estándar
  return Math.round(bmi * 10) / 10;
}

/**
 * Clasifica el IMC según rangos de la OMS (2000).
 *
 * Rangos:
 * < 16.0     → Delgadez severa (grado III)
 * 16.0–18.49 → Delgadez (grado I-II)
 * 18.5–24.99 → Peso normal
 * 25.0–29.99 → Sobrepeso
 * 30.0–34.99 → Obesidad grado I
 * 35.0–39.99 → Obesidad grado II
 * ≥ 40.0     → Obesidad grado III (mórbida)
 */
export function classifyBmi(bmi: number): BmiClassification {
  if (bmi <= 0) {
    throw new RangeError(`bmi debe ser > 0. Recibido: ${bmi}`);
  }

  if (bmi < 16.0) {
    return { category: "UNDERWEIGHT_SEVERE", label: "Delgadez severa" };
  }
  if (bmi < 18.5) {
    return { category: "UNDERWEIGHT", label: "Bajo peso" };
  }
  if (bmi < 25.0) {
    return { category: "NORMAL", label: "Peso normal" };
  }
  if (bmi < 30.0) {
    return { category: "OVERWEIGHT", label: "Sobrepeso" };
  }
  if (bmi < 35.0) {
    return { category: "OBESE_I", label: "Obesidad grado I" };
  }
  if (bmi < 40.0) {
    return { category: "OBESE_II", label: "Obesidad grado II" };
  }
  return { category: "OBESE_III", label: "Obesidad grado III" };
}
