// =============================================================================
// BLACKLINE FITNESS — Progreso de medidas corporales
//
// El coach es entrenador personal de cada cliente: la medición sola no sirve,
// lo que importa es el cambio semana a semana y mes a mes. Este módulo es puro
// (sin React, sin Prisma) para poder testearlo y usarlo desde cualquier vista.
// =============================================================================

/**
 * Cualquier registro de medición con los campos numéricos ya casteados.
 *
 * Solo exigimos `recordedAt`: pedir un index signature obligaría a cada caller
 * a declararlo, y los tipos concretos (MyBodyMetric, BodyMetric de Prisma) no
 * lo tienen. Las columnas se leen por nombre en `readMetricValue`.
 */
export interface MetricPoint {
  recordedAt: Date | string;
}

/**
 * Hacia dónde es "mejorar". La flecha verde/roja depende de esto: bajar de
 * cintura es progreso, bajar de bíceps no. `neutral` nunca pinta juicio —
 * lo usamos donde el objetivo depende del cliente (peso, muslo, cadera).
 */
export type BetterDirection = "up" | "down" | "neutral";

export interface MeasurementField {
  key: string;
  label: string;
  unit: string;
  better: BetterDirection;
  group: "composicion" | "tronco" | "brazos" | "piernas";
  /** Columna legacy a usar cuando la principal viene vacía. */
  fallbackKey?: string;
  /** Decimales al mostrar el valor. */
  decimals?: number;
}

export const MEASUREMENT_FIELDS: MeasurementField[] = [
  // Composición
  { key: "weightKg", label: "Peso", unit: "kg", better: "neutral", group: "composicion", decimals: 1 },
  { key: "bodyFatPct", label: "Grasa corporal", unit: "%", better: "down", group: "composicion", decimals: 1 },
  { key: "muscleMassKg", label: "Masa muscular", unit: "kg", better: "up", group: "composicion", decimals: 1 },
  { key: "visceralFat", label: "Grasa visceral", unit: "", better: "down", group: "composicion", decimals: 0 },
  { key: "basalMetabolicRate", label: "Metabolismo basal", unit: "kcal", better: "up", group: "composicion", decimals: 0 },

  // Tronco
  { key: "neckCm", label: "Cuello", unit: "cm", better: "neutral", group: "tronco" },
  { key: "shoulderLeftCm", label: "Hombro izq.", unit: "cm", better: "up", group: "tronco" },
  { key: "shoulderRightCm", label: "Hombro der.", unit: "cm", better: "up", group: "tronco" },
  { key: "chestCm", label: "Pecho", unit: "cm", better: "up", group: "tronco" },
  { key: "abdomenCm", label: "Abdomen", unit: "cm", better: "down", group: "tronco" },
  { key: "waistCm", label: "Cintura", unit: "cm", better: "down", group: "tronco" },
  { key: "hipCm", label: "Cadera", unit: "cm", better: "neutral", group: "tronco" },
  { key: "gluteLeftCm", label: "Glúteo izq.", unit: "cm", better: "up", group: "tronco" },
  { key: "gluteRightCm", label: "Glúteo der.", unit: "cm", better: "up", group: "tronco" },

  // Brazos
  { key: "bicepLeftCm", label: "Bíceps izq.", unit: "cm", better: "up", group: "brazos", fallbackKey: "armCm" },
  { key: "bicepRightCm", label: "Bíceps der.", unit: "cm", better: "up", group: "brazos", fallbackKey: "armCm" },
  { key: "forearmLeftCm", label: "Antebrazo izq.", unit: "cm", better: "up", group: "brazos" },
  { key: "forearmRightCm", label: "Antebrazo der.", unit: "cm", better: "up", group: "brazos" },

  // Piernas
  { key: "thighLeftCm", label: "Muslo izq.", unit: "cm", better: "up", group: "piernas", fallbackKey: "thighCm" },
  { key: "thighRightCm", label: "Muslo der.", unit: "cm", better: "up", group: "piernas", fallbackKey: "thighCm" },
  { key: "hamstringLeftCm", label: "Femoral izq.", unit: "cm", better: "up", group: "piernas" },
  { key: "hamstringRightCm", label: "Femoral der.", unit: "cm", better: "up", group: "piernas" },
  { key: "calfLeftCm", label: "Pantorrilla izq.", unit: "cm", better: "up", group: "piernas" },
  { key: "calfRightCm", label: "Pantorrilla der.", unit: "cm", better: "up", group: "piernas" },
];

export const GROUP_LABELS: Record<MeasurementField["group"], string> = {
  composicion: "Composición",
  tronco: "Tronco",
  brazos: "Brazos",
  piernas: "Piernas",
};

// -----------------------------------------------------------------------------
// Lectura de valores
// -----------------------------------------------------------------------------

export function readMetricValue(
  point: MetricPoint | null | undefined,
  field: MeasurementField,
): number | null {
  if (!point) return null;
  const bag = point as unknown as Record<string, unknown>;
  const direct = bag[field.key];
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  if (field.fallbackKey) {
    const fallback = bag[field.fallbackKey];
    if (typeof fallback === "number" && Number.isFinite(fallback)) return fallback;
  }
  return null;
}

function toTime(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/** Ordena de más viejo a más nuevo sin mutar la entrada. */
export function sortAscending<T extends MetricPoint>(metrics: T[]): T[] {
  return [...metrics].sort((a, b) => toTime(a.recordedAt) - toTime(b.recordedAt));
}

// -----------------------------------------------------------------------------
// Progreso por campo
// -----------------------------------------------------------------------------

export interface FieldProgress {
  field: MeasurementField;
  /** Último valor registrado para este campo. */
  current: number;
  currentAt: Date;
  /** Valor de la medición anterior que tenía este campo (no la anterior a secas). */
  previous: number | null;
  previousAt: Date | null;
  /** Primer valor histórico, para el acumulado desde que arrancó. */
  first: number;
  firstAt: Date;
  deltaPrevious: number | null;
  deltaTotal: number;
  /** Serie cronológica completa, para sparklines. */
  series: number[];
  /** true cuando el cambio va en la dirección deseada del campo. */
  improving: boolean | null;
}

/**
 * Calcula el avance de cada campo que el cliente haya medido alguna vez.
 *
 * Clave: comparamos contra la última medición **que tenía ese campo**, no
 * contra la anterior en el tiempo. Si el cliente se pesó la semana pasada pero
 * solo se midió el bíceps hace un mes, el delta de bíceps tiene que ser contra
 * ese mes — no "sin dato".
 */
export function buildFieldProgress(metrics: MetricPoint[]): FieldProgress[] {
  const ascending = sortAscending(metrics);
  const out: FieldProgress[] = [];

  for (const field of MEASUREMENT_FIELDS) {
    const points: { value: number; at: Date }[] = [];
    for (const m of ascending) {
      const value = readMetricValue(m, field);
      if (value !== null) {
        points.push({ value, at: new Date(m.recordedAt) });
      }
    }
    if (points.length === 0) continue;

    const last = points[points.length - 1];
    const prev = points.length > 1 ? points[points.length - 2] : null;
    const first = points[0];
    const deltaPrevious = prev ? round1(last.value - prev.value) : null;
    const deltaTotal = round1(last.value - first.value);

    out.push({
      field,
      current: last.value,
      currentAt: last.at,
      previous: prev?.value ?? null,
      previousAt: prev?.at ?? null,
      first: first.value,
      firstAt: first.at,
      deltaPrevious,
      deltaTotal,
      series: points.map((p) => p.value),
      improving: judge(field.better, deltaPrevious),
    });
  }

  return out;
}

function judge(better: BetterDirection, delta: number | null): boolean | null {
  if (delta === null || delta === 0 || better === "neutral") return null;
  return better === "up" ? delta > 0 : delta < 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// -----------------------------------------------------------------------------
// Comparación por ventana temporal (semana / mes)
// -----------------------------------------------------------------------------

export type ProgressWindow = "week" | "month" | "all";

export const WINDOW_DAYS: Record<Exclude<ProgressWindow, "all">, number> = {
  week: 7,
  month: 30,
};

export interface WindowComparison {
  field: MeasurementField;
  current: number;
  /** Valor más cercano al inicio de la ventana (el ancla contra el que comparamos). */
  baseline: number | null;
  baselineAt: Date | null;
  delta: number | null;
  improving: boolean | null;
}

/**
 * Compara el último valor contra el registro más reciente que sea **anterior o
 * igual** al borde de la ventana. Para "esta semana" el ancla es la medición
 * de hace 7 días o la más cercana antes de eso; si no hay ninguna previa,
 * devuelve baseline null en vez de inventar un cero.
 */
export function buildWindowComparison(
  metrics: MetricPoint[],
  window: ProgressWindow,
  now: Date,
): WindowComparison[] {
  const ascending = sortAscending(metrics);
  if (ascending.length === 0) return [];

  const cutoff =
    window === "all"
      ? null
      : new Date(now.getTime() - WINDOW_DAYS[window] * 24 * 60 * 60 * 1000);

  const out: WindowComparison[] = [];

  for (const field of MEASUREMENT_FIELDS) {
    const points: { value: number; at: Date }[] = [];
    for (const m of ascending) {
      const value = readMetricValue(m, field);
      if (value !== null) points.push({ value, at: new Date(m.recordedAt) });
    }
    if (points.length === 0) continue;

    const last = points[points.length - 1];

    let baseline: { value: number; at: Date } | null = null;
    if (cutoff === null) {
      baseline = points.length > 1 ? points[0] : null;
    } else {
      // El más reciente que quede fuera (o justo en el borde) de la ventana.
      for (const p of points) {
        if (p.at.getTime() <= cutoff.getTime()) baseline = p;
      }
      // Sin ancla previa: caemos al primer punto dentro de la ventana, siempre
      // que no sea el mismo que estamos comparando.
      if (!baseline && points.length > 1) baseline = points[0];
    }

    if (baseline && baseline.at.getTime() === last.at.getTime()) baseline = null;

    const delta = baseline ? round1(last.value - baseline.value) : null;

    out.push({
      field,
      current: last.value,
      baseline: baseline?.value ?? null,
      baselineAt: baseline?.at ?? null,
      delta,
      improving: judge(field.better, delta),
    });
  }

  return out;
}

// -----------------------------------------------------------------------------
// Formato
// -----------------------------------------------------------------------------

export function formatValue(value: number, field: MeasurementField): string {
  const decimals = field.decimals ?? 1;
  const n = value.toFixed(decimals);
  return field.unit ? `${n} ${field.unit}` : n;
}

export function formatDelta(delta: number, field: MeasurementField): string {
  const decimals = field.decimals ?? 1;
  const sign = delta > 0 ? "+" : "";
  const n = Math.abs(delta) < Number.EPSILON ? (0).toFixed(decimals) : delta.toFixed(decimals);
  return field.unit ? `${sign}${n} ${field.unit}` : `${sign}${n}`;
}

/** Cuántas mediciones distintas hay registradas (para saber si ya hay tendencia). */
export function countMeasuredFields(metric: MetricPoint): number {
  let n = 0;
  for (const field of MEASUREMENT_FIELDS) {
    if (readMetricValue(metric, field) !== null) n++;
  }
  return n;
}
