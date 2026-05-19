"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowRight } from "lucide-react";

interface CalcResult {
  tmb: number;
  tdee: number;
  bmi: number | null;
  bmiCategory: string | null;
}

// Metrics run in a Web Worker (data-app-builder owns the worker).
// We POST the raw values here and get back calculated results.
async function fetchCalcSummary(): Promise<CalcResult | null> {
  const res = await fetch("/api/onboarding/summary");
  if (!res.ok) return null;
  return (await res.json()) as CalcResult;
}

export default function ResumenPage() {
  const router = useRouter();
  const [calc, setCalc] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalcSummary()
      .then(setCalc)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#052E16]">
          <CheckCircle className="h-6 w-6 text-[#22C55E]" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#FAFAFA]">
            Listo. Ya tenemos todo.
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            Tu entrenador armará tu rutina con esta información.
          </p>
        </div>
      </div>

      {/* Metrics summary */}
      {loading ? (
        <div className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-[#27272A] animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : calc ? (
        <div className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wide">
            Tus métricas base
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="TMB"
              value={`${Math.round(calc.tmb)}`}
              unit="kcal/día"
              description="Metabolismo basal (en reposo total)"
            />
            <MetricCard
              label="TDEE"
              value={`${Math.round(calc.tdee)}`}
              unit="kcal/día"
              description="Gasto total diario estimado"
            />
            {calc.bmi && (
              <MetricCard
                label="IMC"
                value={calc.bmi.toFixed(1)}
                unit="kg/m²"
                description={calc.bmiCategory ?? ""}
              />
            )}
          </div>
          <p className="text-xs text-[#71717A] mt-2">
            Calculado con Mifflin-St Jeor. Son estimaciones para orientación,
            no diagnóstico médico.
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#1E2A38] bg-[#1E2A38]/50 p-5">
        <p className="text-sm text-[#A1A1AA] leading-relaxed">
          Tu entrenador ya tiene esta información y armará tu rutina. Mientras
          tanto, podés explorar la biblioteca de ejercicios o registrar tu
          primera medición.
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push("/inicio")}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 text-sm font-semibold text-white min-h-[48px] hover:bg-brand-primary-hover transition-colors"
      >
        Ir al inicio
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  description,
}: {
  label: string;
  value: string;
  unit: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-[#27272A] p-4">
      <p className="text-xs text-[#71717A]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular text-[#FAFAFA]">
        {value}
        <span className="ml-1 text-xs font-normal text-[#71717A]">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-[#A1A1AA]">{description}</p>
    </div>
  );
}
