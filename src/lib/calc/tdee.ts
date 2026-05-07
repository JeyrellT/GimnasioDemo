/**
 * Cálculo de Gasto Energético Total Diario (TDEE)
 * TDEE = TMB × Factor de Actividad
 *
 * Factores de actividad de Mifflin-St Jeor (1990) / Harris-Benedict revisado
 */

export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHT"
  | "MODERATE"
  | "ACTIVE"
  | "ATHLETE";

/** Factores multiplicadores por nivel de actividad */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  /** Sedentario: trabajo de escritorio, sin ejercicio */
  SEDENTARY: 1.2,
  /** Ligero: ejercicio 1-3 días/semana */
  LIGHT: 1.375,
  /** Moderado: ejercicio 3-5 días/semana */
  MODERATE: 1.55,
  /** Activo: ejercicio intenso 6-7 días/semana */
  ACTIVE: 1.725,
  /** Atleta: entrenamiento doble o trabajo físico muy intenso */
  ATHLETE: 1.9,
} as const;

export interface TdeeParams {
  tmb: number;
  level: ActivityLevel;
}

export interface TdeeWithDeficitResult {
  /** TDEE ajustado con déficit aplicado, en kcal/día */
  value: number;
  warning?: string;
}

/**
 * Calcula TDEE multiplicando TMB por el factor de actividad.
 * Retorna entero redondeado.
 */
export function calculateTdee({ tmb, level }: TdeeParams): number {
  if (tmb <= 0) {
    throw new RangeError(`tmb debe ser > 0. Recibido: ${tmb}`);
  }
  return Math.round(tmb * ACTIVITY_FACTORS[level]);
}

/**
 * Aplica un déficit calórico porcentual sobre el TDEE.
 *
 * Umbrales de seguridad clínica:
 * - déficit > 25%: advertencia de riesgo de pérdida de masa muscular.
 * - déficit > 35%: advertencia crítica, posible impacto metabólico serio.
 *
 * La literatura de nutrición deportiva recomienda déficits ≤ 20-25% para
 * preservar masa magra durante pérdida de grasa.
 */
export function tdeeWithDeficit({
  tdee,
  deficitPct,
}: {
  tdee: number;
  deficitPct: number;
}): TdeeWithDeficitResult {
  if (tdee <= 0) {
    throw new RangeError(`tdee debe ser > 0. Recibido: ${tdee}`);
  }
  if (deficitPct < 0 || deficitPct > 70) {
    throw new RangeError(
      `deficitPct debe estar entre 0 y 70. Recibido: ${deficitPct}`,
    );
  }

  const value = Math.round(tdee * (1 - deficitPct / 100));

  if (deficitPct > 35) {
    return {
      value,
      warning:
        "Déficit crítico (>35%). Riesgo real de pérdida muscular, fatiga severa y adaptación metabólica negativa. Consultá a un profesional de la salud antes de continuar.",
    };
  }

  if (deficitPct > 25) {
    return {
      value,
      warning:
        "Déficit agresivo (>25%). Aumenta el riesgo de perder masa muscular. Asegurate de consumir suficiente proteína y monitoreá tu rendimiento.",
    };
  }

  return { value };
}
