/**
 * Cálculo de Tasa Metabólica Basal (TMB)
 * Fórmulas: Mifflin-St Jeor (1990) y Katch-McArdle (1975)
 * Unidades: kcal/día
 */

export type BiologicalSex = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_SAY";

export interface MifflinParams {
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}

export interface KatchParams {
  weightKg: number;
  /** Porcentaje de grasa corporal (0-100) */
  bodyFatPct: number;
}

export interface RecommendedTmbParams {
  method: "auto";
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  bodyFatPct?: number;
}

export interface RecommendedTmbResult {
  value: number;
  method: "mifflin" | "katch";
}

/**
 * Valida parámetros comunes de composición corporal.
 * Lanza RangeError si algún valor está fuera de rango clínico.
 */
function validateBase(
  weightKg: number,
  heightCm: number,
  ageYears: number,
): void {
  if (weightKg <= 0) {
    throw new RangeError(`weightKg debe ser > 0. Recibido: ${weightKg}`);
  }
  if (heightCm <= 0) {
    throw new RangeError(`heightCm debe ser > 0. Recibido: ${heightCm}`);
  }
  if (ageYears < 10 || ageYears > 100) {
    throw new RangeError(
      `ageYears debe estar entre 10 y 100. Recibido: ${ageYears}`,
    );
  }
}

/**
 * Mifflin-St Jeor (1990)
 * MALE:   10·peso + 6.25·altura − 5·edad + 5
 * FEMALE: 10·peso + 6.25·altura − 5·edad − 161
 * OTHER/PREFER_NOT_SAY: promedio de ambas fórmulas
 */
export function mifflinStJeor(params: MifflinParams): number {
  const { sex, weightKg, heightCm, ageYears } = params;
  validateBase(weightKg, heightCm, ageYears);

  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;

  let result: number;
  switch (sex) {
    case "MALE":
      result = base + 5;
      break;
    case "FEMALE":
      result = base - 161;
      break;
    case "OTHER":
    case "PREFER_NOT_SAY":
      // Promedio de las dos fórmulas para evitar suposiciones binarias
      result = ((base + 5) + (base - 161)) / 2;
      break;
  }

  return Math.round(result);
}

/**
 * Katch-McArdle (1975)
 * TMB = 370 + 21.6 × LBM
 * LBM (Lean Body Mass) = peso × (1 − grasa/100)
 *
 * Más precisa cuando se conoce la composición corporal.
 * No requiere sexo ni altura — la masa magra ya los implica.
 */
export function katchMcArdle(params: KatchParams): number {
  const { weightKg, bodyFatPct } = params;

  if (weightKg <= 0) {
    throw new RangeError(`weightKg debe ser > 0. Recibido: ${weightKg}`);
  }
  if (bodyFatPct < 0 || bodyFatPct >= 100) {
    throw new RangeError(
      `bodyFatPct debe estar entre 0 y 100. Recibido: ${bodyFatPct}`,
    );
  }

  const lbm = weightKg * (1 - bodyFatPct / 100);
  return Math.round(370 + 21.6 * lbm);
}

/**
 * Auto-selecciona la fórmula más precisa disponible.
 * Si hay bodyFatPct → Katch-McArdle.
 * Si no → Mifflin-St Jeor.
 */
export function recommendedTmb(
  params: RecommendedTmbParams,
): RecommendedTmbResult {
  const { sex, weightKg, heightCm, ageYears, bodyFatPct } = params;

  if (bodyFatPct !== undefined && bodyFatPct !== null) {
    return {
      value: katchMcArdle({ weightKg, bodyFatPct }),
      method: "katch",
    };
  }

  return {
    value: mifflinStJeor({ sex, weightKg, heightCm, ageYears }),
    method: "mifflin",
  };
}
