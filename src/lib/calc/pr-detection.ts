/**
 * Detección de Marca Personal (PR — Personal Record)
 *
 * Un PR se dispara cuando se cumple AL MENOS UNO de estos criterios:
 * (a) El peso nuevo supera el máximo peso previo en cualquier rango de reps.
 * (b) Con el mismo peso, se logra más reps que antes.
 * (c) El volumen total (peso × reps) supera el máximo volumen previo.
 *
 * Retorna el tipo de PR para que el frontend muestre microcopy específico.
 */

export type PrType = "weight" | "volume" | "reps_at_weight";

export interface HistoricalSet {
  weight: number;
  reps: number;
  date: Date;
}

export interface PrCheckParams {
  exerciseId: string;
  weight: number;
  reps: number;
  /** Historial de sets previos para ESTE ejercicio, ordenado por fecha */
  history: HistoricalSet[];
}

export interface PrResult {
  isPr: boolean;
  type?: PrType;
  /** El set previo que era el récord antes de este */
  previous?: {
    weight: number;
    reps: number;
    date: Date;
  };
}

/**
 * Detecta si un set nuevo constituye una marca personal.
 *
 * Orden de prioridad cuando se cumplen múltiples criterios:
 * 1. weight (PR de peso es el más significativo clínicamente)
 * 2. volume (PR de volumen total)
 * 3. reps_at_weight (mismo peso, más reps — PR de resistencia)
 */
export function isPersonalRecord({
  weight,
  reps,
  history,
}: PrCheckParams): PrResult {
  if (weight < 0) {
    throw new RangeError(`weight no puede ser negativo. Recibido: ${weight}`);
  }
  if (reps < 1) {
    throw new RangeError(`reps debe ser >= 1. Recibido: ${reps}`);
  }

  // Sin historial previo → cualquier set es el primer registro (no se celebra como PR)
  if (history.length === 0) {
    return { isPr: false };
  }

  const newVolume = weight * reps;

  // Calculamos los máximos históricos en una sola pasada
  let maxWeight = 0;
  let maxVolume = 0;
  let maxRepsAtSameWeight = 0;
  let prevMaxWeightSet: HistoricalSet | undefined;
  let prevMaxVolumeSet: HistoricalSet | undefined;
  let prevMaxRepsAtWeightSet: HistoricalSet | undefined;

  for (const h of history) {
    // Máximo de peso absoluto
    if (h.weight > maxWeight) {
      maxWeight = h.weight;
      prevMaxWeightSet = h;
    }

    // Máximo de volumen
    const hVolume = h.weight * h.reps;
    if (hVolume > maxVolume) {
      maxVolume = hVolume;
      prevMaxVolumeSet = h;
    }

    // Máximo de reps con exactamente el mismo peso (±0.001 tolerancia float)
    if (Math.abs(h.weight - weight) < 0.001) {
      if (h.reps > maxRepsAtSameWeight) {
        maxRepsAtSameWeight = h.reps;
        prevMaxRepsAtWeightSet = h;
      }
    }
  }

  // Criterio (a): nuevo peso supera el máximo histórico
  if (weight > maxWeight) {
    return {
      isPr: true,
      type: "weight",
      previous: prevMaxWeightSet,
    };
  }

  // Criterio (c): nuevo volumen supera el máximo histórico
  if (newVolume > maxVolume) {
    return {
      isPr: true,
      type: "volume",
      previous: prevMaxVolumeSet,
    };
  }

  // Criterio (b): mismo peso, más reps que el máximo para ese peso
  if (maxRepsAtSameWeight > 0 && reps > maxRepsAtSameWeight) {
    return {
      isPr: true,
      type: "reps_at_weight",
      previous: prevMaxRepsAtWeightSet,
    };
  }

  return { isPr: false };
}
