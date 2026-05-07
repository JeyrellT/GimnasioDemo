"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { listMetrics } from "@/app/actions/metrics";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateCR } from "@/lib/utils";
import type { DemoMetricRow } from "@/lib/offline/db";

export default function MetricasPageContent({ clientId }: { clientId: string }) {
  const [metrics, setMetrics] = useState<DemoMetricRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMetrics(clientId).then((result) => {
      setMetrics(result.ok ? result.value : []);
      setLoading(false);
    });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#FF6A1A]" />
      </div>
    );
  }

  const list = metrics ?? [];
  // listMetrics returns ascending; display descending (most recent first)
  const sorted = [...list].sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Métricas" description="Historial de mediciones corporales" />

      {/* Charts placeholder — owned by data-viz agent */}
      <div className="rounded-xl border border-dashed border-[#3F3F46] bg-[#18181B] p-8 text-center">
        <p className="text-sm text-[#71717A]">
          Gráfico de tendencia de peso — data-viz agent
        </p>
      </div>

      {/* Table */}
      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#3F3F46]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#3F3F46] bg-[#18181B]">
                {["Fecha", "Peso", "Grasa %", "Cintura", "Cadera"].map((h) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
