/**
 * Recomendación de macronutrientes
 *
 * Basada en literatura de nutrición deportiva:
 * - Proteína: Morton et al. 2018 (meta-análisis, 1.62 g/kg óptimo para hipertrofia)
 *             Helms et al. 2014 (2.0-2.4 g/kg en déficit calórico)
 * - Grasa: Hamalainen et al. 1984 y convención clínica (mínimo 0.6 g/kg)
 * - Carbohidratos: calorías restantes después de proteína + grasa
 *
 * Goal enum espejo del Prisma — sin importar @prisma/client
 */

export type Goal =
  | "FAT_LOSS"
  | "MUSCLE_GAIN"
  | "MAINTENANCE"
  | "PERFORMANCE";

export interface MacrosParams {
  weightKg: number;
  tdee: number;
  /** Porcentaje de déficit calórico ya aplicado (0 = sin déficit, 20 = 20% menos) */
  deficitPct: number;
  goal: Goal;
}

export interface MacrosResult {
  /** Proteína en gramos/día */
  proteinG: number;
  /** Grasa en gramos/día */
  fatG: number;
  /** Carbohidratos en gramos/día */
  carbsG: number;
  /** Calorías objetivo ajustadas con déficit */
  tdeeAdjusted: number;
  /** Avisos clínicos si algún macro queda por debajo de umbrales seguros */
  warnings: string[];
}

/** Kcal por gramo de cada macronutriente */
const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_FAT = 9;
const KCAL_PER_G_CARBS = 4;

/**
 * Calcula la distribución óptima de macronutrientes según el objetivo.
 *
 * Lógica de proteína:
 * - Base: 1.6 g/kg (mínimo efectivo para preservar/construir músculo)
 * - Con déficit calórico (>5%): sube a 2.0 g/kg (mayor catabolismo → más proteína protectora)
 * - Con objetivo MUSCLE_GAIN: sube a 2.2 g/kg (máximo con evidencia sólida)
 * - PERFORMANCE: 2.0 g/kg (recuperación y adaptación)
 *
 * Lógica de grasa:
 * - Default: 1.0 g/kg
 * - FAT_LOSS: se mantiene en 1.0 (no recortamos grasa en déficit — impacto hormonal)
 * - MUSCLE_GAIN: 1.2 g/kg (entorno anabólico hormonal)
 *
 * Carbohidratos: calorías restantes ÷ 4
 */
export function recommendMacros({
  weightKg,
  tdee,
  deficitPct,
  goal,
}: MacrosParams): MacrosResult {
  if (weightKg <= 0) {
    throw new RangeError(`weightKg debe ser > 0. Recibido: ${weightKg}`);
  }
  if (tdee <= 0) {
    throw new RangeError(`tdee debe ser > 0. Recibido: ${tdee}`);
  }
  if (deficitPct < 0 || deficitPct > 70) {
    throw new RangeError(
      `deficitPct debe estar entre 0 y 70. Recibido: ${deficitPct}`,
    );
  }

  const warnings: string[] = [];

  // Calorías objetivo con déficit aplicado
  const tdeeAdjusted = Math.round(tdee * (1 - deficitPct / 100));

  // --- Proteína ---
  let proteinPerKg: number;
  const hasSignificantDeficit = deficitPct > 5;

  switch (goal) {
    case "MUSCLE_GAIN":
      proteinPerKg = 2.2;
      break;
    case "FAT_LOSS":
      // En déficit, la proteína alta protege la masa magra
      proteinPerKg = hasSignificantDeficit ? 2.0 : 1.8;
      break;
    case "PERFORMANCE":
      proteinPerKg = 2.0;
      break;
    case "MAINTENANCE":
    default:
      proteinPerKg = hasSignificantDeficit ? 2.0 : 1.6;
      break;
  }

  const proteinG = Math.round(proteinPerKg * weightKg);

  // --- Grasa ---
  let fatPerKg: number;
  switch (goal) {
    case "MUSCLE_GAIN":
      fatPerKg = 1.2;
      break;
    case "FAT_LOSS":
    case "MAINTENANCE":
    case "PERFORMANCE":
    default:
      fatPerKg = 1.0;
      break;
  }

  const fatG = Math.round(fatPerKg * weightKg);

  // --- Carbohidratos (calorías restantes) ---
  const proteinKcal = proteinG * KCAL_PER_G_PROTEIN;
  const fatKcal = fatG * KCAL_PER_G_FAT;
  const remainingKcal = tdeeAdjusted - proteinKcal - fatKcal;
  const carbsG = Math.max(0, Math.round(remainingKcal / KCAL_PER_G_CARBS));

  // --- Validaciones clínicas ---
  if (proteinPerKg < 1.4 || proteinG / weightKg < 1.4) {
    warnings.push(
      "La ingesta de proteína está por debajo de 1.4 g/kg. Existe riesgo de pérdida de masa muscular.",
    );
  }

  if (fatG / weightKg < 0.6) {
    warnings.push(
      "La ingesta de grasa está por debajo de 0.6 g/kg. Puede afectar la producción hormonal y la absorción de vitaminas liposolubles.",
    );
  }

  if (carbsG < 50) {
    warnings.push(
      "Los carbohidratos quedan por debajo de 50 g/día. El rendimiento en el entrenamiento puede verse afectado. Consultá a un profesional antes de aplicar este plan.",
    );
  }

  return {
    proteinG,
    fatG,
    carbsG,
    tdeeAdjusted,
    warnings,
  };
}
