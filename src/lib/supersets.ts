/**
 * Helpers compartidos por el editor de rutinas (coach) y el player (cliente)
 * para renderizar superseries / circuitos.
 *
 * El modelo de datos vive en `RoutineExercise.supersetGroup: number | null`
 * (1..10, schema lo limita). Estos helpers convierten ese número a:
 *   - una **letra** ("A", "B"...) para mostrarle al usuario,
 *   - un **color** cíclico para distinguir visualmente cada grupo,
 *   - utilidades para resumir miembros de un grupo.
 */

import type { RoutineSnapshotExercise } from "@/types/domain";

// ── Paleta cíclica por grupo (1..10) ─────────────────────────────────────────

const SUPERSET_COLORS = [
  "var(--brand-primary)", // SS-A
  "#22C55E",              // SS-B — green
  "#F59E0B",              // SS-C — amber
  "#A855F7",              // SS-D — purple
  "#EC4899",              // SS-E — pink
  "#06B6D4",              // SS-F — cyan
  "#84CC16",              // SS-G — lime
  "#F97316",              // SS-H — orange
  "#14B8A6",              // SS-I — teal
  "#6366F1",              // SS-J — indigo
] as const;

export function getSupersetColor(group: number): string {
  return SUPERSET_COLORS[(group - 1) % SUPERSET_COLORS.length] ?? "var(--brand-primary)";
}

/** 1 → "A", 2 → "B", 10 → "J". Schema cap = 10, asumido. */
export function getSupersetLetter(group: number): string {
  return String.fromCharCode(64 + group);
}

// ── Resumen del grupo para un ejercicio del snapshot ─────────────────────────

export interface SupersetGroupInfo {
  /** Letra visible (A, B...). */
  letter: string;
  /** Color cíclico. */
  color: string;
  /** Miembros del grupo (en el orden en que aparecen en la lista). */
  members: RoutineSnapshotExercise[];
  /** Posición 1-based del ejercicio dentro del grupo (1..members.length). */
  positionInGroup: number;
  /** Total de ejercicios del grupo. */
  totalInGroup: number;
}

/**
 * Devuelve la info del grupo en el que vive `exercises[index]`, o `null` si ese
 * ejercicio no está agrupado.
 *
 * Cuenta como "mismo grupo" cualquier ejercicio de la lista con el mismo
 * `supersetGroup`, aunque no sean adyacentes (la UI del editor los pone
 * adyacentes por defecto, pero somos defensivos por si alguien hace una
 * edición que rompe la adyacencia).
 */
export function getSupersetGroupAt(
  exercises: RoutineSnapshotExercise[],
  index: number,
): SupersetGroupInfo | null {
  const ex = exercises[index];
  if (!ex || ex.supersetGroup === null || ex.supersetGroup === undefined) {
    return null;
  }
  const group = ex.supersetGroup;
  const members = exercises.filter((e) => e.supersetGroup === group);
  if (members.length < 2) return null; // grupos huérfanos de 1 no cuentan
  const positionInGroup = Math.max(
    1,
    members.findIndex((e) => e === ex) + 1,
  );
  return {
    letter: getSupersetLetter(group),
    color: getSupersetColor(group),
    members,
    positionInGroup,
    totalInGroup: members.length,
  };
}

/**
 * `true` si `exercises[a]` y `exercises[b]` están en el mismo grupo (≠ null).
 * Devuelve `false` si alguno de los dos está fuera de rango o sin grupo.
 */
export function areInSameSuperset(
  exercises: RoutineSnapshotExercise[],
  a: number,
  b: number,
): boolean {
  const exA = exercises[a];
  const exB = exercises[b];
  if (!exA || !exB) return false;
  if (exA.supersetGroup === null || exA.supersetGroup === undefined) return false;
  return exA.supersetGroup === exB.supersetGroup;
}
