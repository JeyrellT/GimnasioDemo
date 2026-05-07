/**
 * Cálculo de volumen de entrenamiento por grupo muscular.
 *
 * MuscleGroup es un espejo del enum de Prisma definido localmente
 * para que este módulo sea usable en Web Workers y en cliente
 * sin importar @prisma/client.
 *
 * Valores sincronizados con prisma/schema.prisma → enum MuscleGroup.
 * Si el schema cambia, actualizar ambos sitios.
 */

export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "BICEPS"
  | "TRICEPS"
  | "FOREARMS"
  | "ABS"
  | "OBLIQUES"
  | "GLUTES"
  | "QUADS"
  | "HAMSTRINGS"
  | "CALVES"
  | "NECK"
  | "FULL_BODY";

export interface SetEntry {
  muscle: MuscleGroup;
  weight: number;
  reps: number;
}

export interface SessionEntry {
  date: Date;
  sets: SetEntry[];
}

/**
 * Volumen de un set individual.
 * Fórmula simple: peso × reps
 * Unidad: kg·rep (sin nombre formal, es una métrica de volumen relativo)
 */
export function setVolume({ weight, reps }: { weight: number; reps: number }): number {
  if (weight < 0) {
    throw new RangeError(`weight no puede ser negativo. Recibido: ${weight}`);
  }
  if (reps < 0) {
    throw new RangeError(`reps no puede ser negativo. Recibido: ${reps}`);
  }
  return weight * reps;
}

/**
 * Agrega el volumen total por grupo muscular dentro de una sesión.
 *
 * Un ejercicio puede contribuir al volumen de su músculo primario.
 * Los grupos musculares sin sets no aparecen en el resultado (no es
 * necesario inicializar todos a 0 — el consumidor debe usar ?? 0).
 */
export function sessionVolumeByMuscle(
  sets: SetEntry[],
): Partial<Record<MuscleGroup, number>> {
  const result: Partial<Record<MuscleGroup, number>> = {};

  for (const s of sets) {
    const vol = setVolume({ weight: s.weight, reps: s.reps });
    result[s.muscle] = (result[s.muscle] ?? 0) + vol;
  }

  return result;
}

/**
 * Agrega el volumen total por grupo muscular en la semana que
 * comienza en weekStart.
 *
 * Una "semana" se define como los 7 días desde weekStart (inclusive)
 * hasta weekStart + 6 días (inclusive), en UTC.
 * Se filtra por date >= weekStart && date < weekStart + 7 días.
 */
export function weeklyVolumeByMuscle(
  sessions: SessionEntry[],
  weekStart: Date,
): Partial<Record<MuscleGroup, number>> {
  const weekStartMs = weekStart.getTime();
  const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;

  const result: Partial<Record<MuscleGroup, number>> = {};

  for (const session of sessions) {
    const sessionMs = session.date.getTime();
    if (sessionMs < weekStartMs || sessionMs >= weekEndMs) {
      continue;
    }

    const sessionVolumes = sessionVolumeByMuscle(session.sets);

    for (const [muscle, vol] of Object.entries(sessionVolumes) as [
      MuscleGroup,
      number,
    ][]) {
      result[muscle] = (result[muscle] ?? 0) + vol;
    }
  }

  return result;
}
