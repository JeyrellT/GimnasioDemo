// =============================================================================
// BLACKLINE FITNESS — FinanceKPIRow
// Owner: frontend-react.
// Renders 4 KpiHeroCards from FinanceKPIs.
// Server Component — no "use client" needed; KpiHeroCard handles its own motion.
// =============================================================================

import { KpiHeroCard } from "@/components/shared/kpi-hero-card";
import type { FinanceKPIs } from "@/types/finance";
import type { DeltaAlignment } from "@/types/profile";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Format CRC without decimals, using dots as thousands separator
 * (Costa Rican convention as shown in the brief: ₡1.240.000).
 * Note: es-CR uses comma as thousands sep by default in Intl — the brief
 * shows dots, which is the European-style. We use the same formatter
 * already present in lib/format.ts but strip decimals.
 */
function formatCRCNoDecimal(amount: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDelta(pct: number | null): string | undefined {
  if (pct === null) return undefined;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function ingresosDeltaAlignment(pct: number | null): DeltaAlignment {
  if (pct === null) return "neutral";
  return pct >= 0 ? "good" : "bad";
}

function gastosDeltaAlignment(pct: number | null): DeltaAlignment {
  if (pct === null) return "neutral";
  // More expenses = bad
  return pct > 0 ? "bad" : "good";
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface FinanceKPIRowProps {
  kpis: FinanceKPIs;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FinanceKPIRow({ kpis }: FinanceKPIRowProps) {
  const margenValue =
    kpis.margenPct !== null ? `${kpis.margenPct.toFixed(1)}%` : "—";

  return (
    <section aria-label="Indicadores financieros" className="space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3B82F6]/15 text-[#3B82F6]"
          aria-hidden="true"
        >
          <span className="text-xs font-bold">₡</span>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#A1A1AA]">
          Indicadores
        </p>
        <div className="h-px flex-1 bg-gradient-to-r from-[#27272A] to-transparent" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiHeroCard
          label="Ingresos"
          value={formatCRCNoDecimal(kpis.ingresosCRC)}
          delta={formatDelta(kpis.ingresosDeltaPct)}
          deltaLabel="vs mes ant."
          goalAlignment={ingresosDeltaAlignment(kpis.ingresosDeltaPct)}
          index={0}
        />
        <KpiHeroCard
          label="Gastos"
          value={formatCRCNoDecimal(kpis.gastosCRC)}
          delta={formatDelta(kpis.gastosDeltaPct)}
          deltaLabel="vs mes ant."
          goalAlignment={gastosDeltaAlignment(kpis.gastosDeltaPct)}
          index={1}
        />
        <KpiHeroCard
          label="Utilidad"
          value={formatCRCNoDecimal(kpis.utilidadCRC)}
          delta={formatDelta(kpis.utilidadDeltaPct)}
          deltaLabel="vs mes ant."
          goalAlignment={ingresosDeltaAlignment(kpis.utilidadDeltaPct)}
          index={2}
        />
        <KpiHeroCard
          label="Margen neto"
          value={margenValue}
          goalAlignment="neutral"
          index={3}
        />
      </div>
    </section>
  );
}
