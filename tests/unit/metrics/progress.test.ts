import { describe, expect, it } from "vitest";
import {
  MEASUREMENT_FIELDS,
  buildFieldProgress,
  buildWindowComparison,
  countMeasuredFields,
  formatDelta,
  formatValue,
  readMetricValue,
  sortAscending,
} from "@/lib/metrics/progress";

const field = (key: string) => {
  const f = MEASUREMENT_FIELDS.find((x) => x.key === key);
  if (!f) throw new Error(`campo ${key} no está en el catálogo`);
  return f;
};

/**
 * Mediodía UTC a propósito: con fechas a medianoche, `getMonth()` en un huso
 * negativo (Costa Rica es UTC-6) devuelve el mes anterior y los tests mienten.
 */
const at = (iso: string) =>
  new Date(iso.includes("T") ? iso : `${iso}T12:00:00Z`);

describe("readMetricValue", () => {
  it("lee el campo directo", () => {
    expect(readMetricValue({ recordedAt: at("2026-01-01"), waistCm: 80 }, field("waistCm"))).toBe(80);
  });

  it("cae al legacy cuando el bilateral viene vacío", () => {
    const point = { recordedAt: at("2026-01-01"), bicepLeftCm: null, armCm: 35 };
    expect(readMetricValue(point, field("bicepLeftCm"))).toBe(35);
  });

  it("prefiere el bilateral sobre el legacy", () => {
    const point = { recordedAt: at("2026-01-01"), bicepLeftCm: 38, armCm: 35 };
    expect(readMetricValue(point, field("bicepLeftCm"))).toBe(38);
  });

  it("devuelve null si no hay ninguno", () => {
    expect(readMetricValue({ recordedAt: at("2026-01-01") }, field("waistCm"))).toBeNull();
  });
});

describe("sortAscending", () => {
  it("ordena de más viejo a más nuevo sin mutar", () => {
    const input = [
      { recordedAt: at("2026-03-01") },
      { recordedAt: at("2026-01-01") },
      { recordedAt: at("2026-02-01") },
    ];
    const out = sortAscending(input);
    expect(out.map((m) => (m.recordedAt as Date).getUTCMonth())).toEqual([0, 1, 2]);
    expect((input[0].recordedAt as Date).getUTCMonth()).toBe(2);
  });
});

describe("buildFieldProgress", () => {
  it("omite los campos que el cliente nunca midió", () => {
    const out = buildFieldProgress([{ recordedAt: at("2026-01-01"), neckCm: 45 }]);
    expect(out).toHaveLength(1);
    expect(out[0].field.key).toBe("neckCm");
  });

  it("con una sola medición no hay delta previo pero sí valor actual", () => {
    const [neck] = buildFieldProgress([{ recordedAt: at("2026-01-01"), neckCm: 45 }]);
    expect(neck.current).toBe(45);
    expect(neck.previous).toBeNull();
    expect(neck.deltaPrevious).toBeNull();
    expect(neck.deltaTotal).toBe(0);
    expect(neck.improving).toBeNull();
  });

  it("compara contra la última medición QUE TENÍA ese campo, no la anterior en el tiempo", () => {
    // El bíceps se midió en enero; en febrero solo hubo peso. El delta de
    // bíceps de marzo debe ser contra enero.
    const [bicep] = buildFieldProgress([
      { recordedAt: at("2026-01-01"), bicepLeftCm: 34 },
      { recordedAt: at("2026-02-01"), weightKg: 80 },
      { recordedAt: at("2026-03-01"), bicepLeftCm: 36 },
    ]).filter((p) => p.field.key === "bicepLeftCm");

    expect(bicep.previous).toBe(34);
    expect(bicep.previousAt?.getUTCMonth()).toBe(0);
    expect(bicep.deltaPrevious).toBe(2);
  });

  it("marca mejora según la dirección deseada de cada campo", () => {
    const metrics = [
      { recordedAt: at("2026-01-01"), waistCm: 90, bicepLeftCm: 34 },
      { recordedAt: at("2026-02-01"), waistCm: 87, bicepLeftCm: 36 },
    ];
    const byKey = Object.fromEntries(buildFieldProgress(metrics).map((p) => [p.field.key, p]));

    // Bajar de cintura es progreso.
    expect(byKey.waistCm.deltaPrevious).toBe(-3);
    expect(byKey.waistCm.improving).toBe(true);
    // Subir de bíceps también.
    expect(byKey.bicepLeftCm.deltaPrevious).toBe(2);
    expect(byKey.bicepLeftCm.improving).toBe(true);
  });

  it("marca retroceso cuando el cambio va al revés", () => {
    const [waist] = buildFieldProgress([
      { recordedAt: at("2026-01-01"), waistCm: 85 },
      { recordedAt: at("2026-02-01"), waistCm: 89 },
    ]);
    expect(waist.improving).toBe(false);
  });

  it("no juzga el peso: subir o bajar depende del objetivo del cliente", () => {
    const [weight] = buildFieldProgress([
      { recordedAt: at("2026-01-01"), weightKg: 80 },
      { recordedAt: at("2026-02-01"), weightKg: 84 },
    ]);
    expect(weight.deltaPrevious).toBe(4);
    expect(weight.improving).toBeNull();
  });

  it("acumula el total contra la primera medición, no la anterior", () => {
    const [waist] = buildFieldProgress([
      { recordedAt: at("2026-01-01"), waistCm: 95 },
      { recordedAt: at("2026-02-01"), waistCm: 92 },
      { recordedAt: at("2026-03-01"), waistCm: 90 },
    ]);
    expect(waist.deltaPrevious).toBe(-2);
    expect(waist.deltaTotal).toBe(-5);
    expect(waist.series).toEqual([95, 92, 90]);
  });

  it("tolera entrada desordenada", () => {
    const [waist] = buildFieldProgress([
      { recordedAt: at("2026-03-01"), waistCm: 90 },
      { recordedAt: at("2026-01-01"), waistCm: 95 },
    ]);
    expect(waist.current).toBe(90);
    expect(waist.first).toBe(95);
  });
});

describe("buildWindowComparison", () => {
  const now = at("2026-03-01T12:00:00Z");

  it("ancla la semana en la medición previa al corte de 7 días", () => {
    const [waist] = buildWindowComparison(
      [
        { recordedAt: at("2026-02-01T12:00:00Z"), waistCm: 95 },
        { recordedAt: at("2026-02-20T12:00:00Z"), waistCm: 92 },
        { recordedAt: at("2026-03-01T10:00:00Z"), waistCm: 90 },
      ],
      "week",
      now,
    );
    // 7 días atrás = 22 feb; la más reciente fuera de la ventana es la del 20.
    expect(waist.baseline).toBe(92);
    expect(waist.delta).toBe(-2);
    expect(waist.improving).toBe(true);
  });

  it("ancla el mes 30 días atrás", () => {
    const [waist] = buildWindowComparison(
      [
        { recordedAt: at("2026-01-15T12:00:00Z"), waistCm: 98 },
        { recordedAt: at("2026-02-20T12:00:00Z"), waistCm: 92 },
        { recordedAt: at("2026-03-01T10:00:00Z"), waistCm: 90 },
      ],
      "month",
      now,
    );
    // 30 días atrás = 30 ene; la última fuera de la ventana es la del 15 ene.
    expect(waist.baseline).toBe(98);
    expect(waist.delta).toBe(-8);
  });

  it("sin ancla previa usa la primera medición disponible", () => {
    const [waist] = buildWindowComparison(
      [
        { recordedAt: at("2026-02-25T12:00:00Z"), waistCm: 92 },
        { recordedAt: at("2026-03-01T10:00:00Z"), waistCm: 90 },
      ],
      "week",
      now,
    );
    expect(waist.baseline).toBe(92);
    expect(waist.delta).toBe(-2);
  });

  it("con una sola medición no inventa baseline", () => {
    const [waist] = buildWindowComparison(
      [{ recordedAt: at("2026-03-01T10:00:00Z"), waistCm: 90 }],
      "week",
      now,
    );
    expect(waist.baseline).toBeNull();
    expect(waist.delta).toBeNull();
    expect(waist.improving).toBeNull();
  });

  it("la ventana 'all' compara contra la primera medición histórica", () => {
    const [waist] = buildWindowComparison(
      [
        { recordedAt: at("2025-06-01T12:00:00Z"), waistCm: 100 },
        { recordedAt: at("2026-03-01T10:00:00Z"), waistCm: 90 },
      ],
      "all",
      now,
    );
    expect(waist.baseline).toBe(100);
    expect(waist.delta).toBe(-10);
  });

  it("devuelve vacío sin mediciones", () => {
    expect(buildWindowComparison([], "week", now)).toEqual([]);
  });
});

describe("formato", () => {
  it("respeta unidad y decimales por campo", () => {
    expect(formatValue(80.25, field("weightKg"))).toBe("80.3 kg");
    expect(formatValue(12, field("visceralFat"))).toBe("12");
    expect(formatValue(85, field("waistCm"))).toBe("85.0 cm");
  });

  it("antepone el signo solo cuando el delta sube", () => {
    expect(formatDelta(2, field("waistCm"))).toBe("+2.0 cm");
    expect(formatDelta(-2, field("waistCm"))).toBe("-2.0 cm");
    expect(formatDelta(0, field("waistCm"))).toBe("0.0 cm");
  });
});

describe("countMeasuredFields", () => {
  it("cuenta solo lo que realmente se midió", () => {
    expect(countMeasuredFields({ recordedAt: at("2026-01-01"), neckCm: 45 })).toBe(1);
    expect(countMeasuredFields({ recordedAt: at("2026-01-01") })).toBe(0);
    expect(
      countMeasuredFields({ recordedAt: at("2026-01-01"), weightKg: 80, waistCm: 85, bodyFatPct: 18 }),
    ).toBe(3);
  });
});
