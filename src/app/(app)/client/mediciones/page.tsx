"use client";

import { useEffect, useState } from "react";
import { Loader2, Scale, TrendingDown, TrendingUp, Minus, Plus } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getMyMetrics } from "@/app/actions/client-portal";
import type { MyBodyMetric } from "@/server/actions/client-portal.actions";
import { MeasurementSheet } from "@/components/forms/measurement-sheet";

export default function ClientMedicionesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MyBodyMetric[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  function loadMetrics() {
    if (!user) { setLoading(false); return; }
    getMyMetrics().then((result) => {
      if (result.ok) {
        // Server returns ordered by recordedAt DESC already; no re-sort needed.
        setMetrics(result.value);
      }
      setLoading(false);
    });
  }

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-50">Mediciones</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Historial de composición corporal
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-[#09090B] transition-colors hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2 min-h-[44px]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva medición
        </button>
      </div>

      <MeasurementSheet
        clientId={user.id}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          // Reload metrics after the sheet closes (new record may have been saved)
          if (!open) loadMetrics();
        }}
      />

      {metrics.length === 0 ? (
        <div className="py-12 text-center">
          <Scale className="h-10 w-10 text-neutral-700 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">
            Aún no tenés mediciones registradas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {metrics.map((m, idx) => {
            const prev = metrics[idx + 1];
            const weightDiff =
              prev && m.weightKg !== null && prev.weightKg !== null
                ? m.weightKg - prev.weightKg
                : null;

            return (
              <div
                key={m.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-neutral-500">
                    {formatDate(m.recordedAt)}
                  </p>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-600">
                    {m.source === "MANUAL"
                      ? "Manual"
                      : m.source === "OCR_SCALE"
                        ? "Báscula OCR"
                        : "Dispositivo"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {m.weightKg !== null && (
                    <MetricCell
                      label="Peso"
                      value={`${m.weightKg} kg`}
                      diff={weightDiff}
                    />
                  )}
                  {m.bodyFatPct !== null && (
                    <MetricCell
                      label="Grasa corporal"
                      value={`${m.bodyFatPct}%`}
                    />
                  )}
                  {m.muscleMassKg !== null && (
                    <MetricCell
                      label="Masa muscular"
                      value={`${m.muscleMassKg} kg`}
                    />
                  )}
                  {m.waistCm !== null && (
                    <MetricCell label="Cintura" value={`${m.waistCm} cm`} />
                  )}
                </div>

                {m.notes && (
                  <p className="mt-2 text-xs text-neutral-600 italic">
                    {m.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetricCell({
  label,
  value,
  diff,
}: {
  label: string;
  value: string;
  diff?: number | null;
}) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <p className="text-lg font-bold tabular-nums text-neutral-100">
          {value}
        </p>
        {diff != null && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
              diff < 0
                ? "text-success"
                : diff > 0
                  ? "text-danger"
                  : "text-neutral-500"
            }`}
          >
            {diff < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : diff > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {diff > 0 ? "+" : ""}
            {diff.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}

function formatDate(value: Date | string): string {
  try {
    return new Date(value).toLocaleDateString("es-CR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}
