"use client";

import { useEffect, useState } from "react";
import { Loader2, Scale } from "lucide-react";
import { listMetrics } from "@/app/actions/metrics";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateCR } from "@/lib/utils";
import type { BodyMetric } from "@prisma/client";
import { WeightTrendChart } from "../_components/weight-trend-chart";
import { BodyFatTrendChart } from "../_components/body-fat-trend-chart";
import { MuscleMassTrendChart } from "../_components/muscle-mass-trend-chart";

/**
 * Serie cronológica (más antiguo primero) de una columna, salteando los
 * registros donde esa medición no se tomó. Misma convención que usa el perfil
 * del cliente para alimentar estos mismos charts.
 */
function buildSeries(
  metricsAsc: BodyMetric[],
  pick: (m: BodyMetric) => unknown,
): number[] {
  return metricsAsc
    .map((m) => {
      const raw = pick(m);
      return raw != null ? Number(raw) : null;
    })
    .filter((n): n is number => n !== null && Number.isFinite(n));
}

/**
 * Las columnas fijas de la tabla cubren peso/grasa/cintura/cadera. Sin esto,
 * un registro donde solo se midió (por ejemplo) el cuello salía como una fila
 * de guiones y parecía un error de carga.
 */
function describeOtherMeasurements(m: BodyMetric): string {
  const cm: [string, unknown][] = [
    ["Cuello", m.neckCm],
    ["Hombro izq.", m.shoulderLeftCm],
    ["Hombro der.", m.shoulderRightCm],
    ["Pecho", m.chestCm],
    ["Abdomen", m.abdomenCm],
    ["Glúteo izq.", m.gluteLeftCm],
    ["Glúteo der.", m.gluteRightCm],
    ["Bíceps izq.", m.bicepLeftCm],
    ["Bíceps der.", m.bicepRightCm],
    ["Antebrazo izq.", m.forearmLeftCm],
    ["Antebrazo der.", m.forearmRightCm],
    ["Muslo izq.", m.thighLeftCm],
    ["Muslo der.", m.thighRightCm],
    ["Femoral izq.", m.hamstringLeftCm],
    ["Femoral der.", m.hamstringRightCm],
    ["Pantorrilla izq.", m.calfLeftCm],
    ["Pantorrilla der.", m.calfRightCm],
  ];

  const parts = cm
    .filter(([, v]) => v != null)
    .map(([label, v]) => `${label} ${Number(v).toFixed(0)} cm`);

  if (m.muscleMassKg != null) {
    parts.unshift(`Músculo ${Number(m.muscleMassKg).toFixed(1)} kg`);
  }
  if (m.visceralFat != null) parts.push(`Visceral ${m.visceralFat}`);
  if (m.basalMetabolicRate != null) parts.push(`TMB ${m.basalMetabolicRate}`);

  return parts.join(" · ");
}

export default function MetricasPageContent({ clientId }: { clientId: string }) {
  const [metrics, setMetrics] = useState<BodyMetric[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMetrics(clientId).then((result) => {
      setMetrics(result.ok ? result.value.metrics : []);
      setLoading(false);
    });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    );
  }

  const list = metrics ?? [];
  const sorted = [...list].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
  const ascending = [...sorted].reverse();

  const weightSeries = buildSeries(ascending, (m) => m.weightKg);
  const bodyFatSeries = buildSeries(ascending, (m) => m.bodyFatPct);
  const muscleSeries = buildSeries(ascending, (m) => m.muscleMassKg);

  return (
    <div className="space-y-6">
      <PageHeader title="Métricas" description="Historial de mediciones corporales" />

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#3F3F46] px-6 py-16 text-center">
          <Scale className="h-8 w-8 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[#FAFAFA]">Sin mediciones</p>
            <p className="mt-1 text-xs text-[#71717A]">
              Este cliente todavía no registró mediciones corporales.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {weightSeries.length > 1 && <WeightTrendChart data={weightSeries} />}
          {bodyFatSeries.length > 1 && <BodyFatTrendChart data={bodyFatSeries} />}
          {muscleSeries.length > 1 && <MuscleMassTrendChart data={muscleSeries} />}
          {weightSeries.length <= 1 &&
            bodyFatSeries.length <= 1 &&
            muscleSeries.length <= 1 && (
              <div className="rounded-xl border border-[#3F3F46] bg-[#18181B] px-4 py-3 text-xs text-[#A1A1AA]">
                Hacen falta al menos dos mediciones con peso, grasa o masa
                muscular para dibujar una tendencia.
              </div>
            )}
        </div>
      )}

      {/* Table */}
      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#3F3F46]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#3F3F46] bg-[#18181B]">
                {["Fecha", "Peso", "Grasa %", "Cintura", "Cadera", "Otras medidas"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-[#71717A] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3F3F46]">
              {sorted.map((m) => (
                <tr key={m.id} className="bg-[#18181B] hover:bg-[#27272A] transition-colors">
                  <td className="px-4 py-3 text-[#A1A1AA] whitespace-nowrap">
                    {formatDateCR(new Date(m.recordedAt), "d/MM/yy")}
                  </td>
                  <td className="px-4 py-3 tabular text-[#FAFAFA] font-medium">
                    {m.weightKg != null ? `${Number(m.weightKg).toFixed(1)} kg` : "—"}
                  </td>
                  <td className="px-4 py-3 tabular text-[#FAFAFA]">
                    {m.bodyFatPct != null ? `${Number(m.bodyFatPct).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 tabular text-[#FAFAFA]">
                    {m.waistCm != null ? `${Number(m.waistCm).toFixed(0)} cm` : "—"}
                  </td>
                  <td className="px-4 py-3 tabular text-[#FAFAFA]">
                    {m.hipCm != null ? `${Number(m.hipCm).toFixed(0)} cm` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#A1A1AA]">
                    {describeOtherMeasurements(m) || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
