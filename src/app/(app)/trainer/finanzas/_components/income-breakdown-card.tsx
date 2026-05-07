// =============================================================================
// FORJA — IncomeBreakdownCard
// Owner: frontend-react.
// Two horizontal progress bars: mensualidades (recurring) + ventas especiales (one-off).
// =============================================================================

import { cn } from "@/lib/utils";
import type { FinanceIncomeBreakdown } from "@/types/finance";
import { DashboardSection } from "@/app/(app)/inicio/_components/dashboard-section";
import { BarChart2 } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCRCCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `₡${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `₡${(amount / 1_000).toFixed(0)}k`;
  }
  return `₡${amount}`;
}

function formatCRCFull(amount: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface IncomeBarProps {
  label: string;
  amount: number;
  pct: number;
  color: string;
  bgColor: string;
}

function IncomeBar({ label, amount, pct, color, bgColor }: IncomeBarProps) {
  const displayPct = isFinite(pct) ? pct : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[#FAFAFA]">{label}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold tabular-nums text-[#FAFAFA]">
            {formatCRCFull(amount)}
          </span>
          <span className="text-xs font-medium text-[#71717A]">
            {displayPct.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Progress track */}
      <div className={cn("h-2 w-full rounded-full", bgColor)}>
        <div
          className={cn("h-2 rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(displayPct, 100)}%` }}
          role="progressbar"
          aria-valuenow={displayPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${displayPct.toFixed(0)}%`}
        />
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface IncomeBreakdownCardProps {
  breakdown: FinanceIncomeBreakdown;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IncomeBreakdownCard({ breakdown }: IncomeBreakdownCardProps) {
  const total = breakdown.recurringCRC + breakdown.oneOffCRC;
  const recurringPct = total > 0 ? (breakdown.recurringCRC / total) * 100 : 0;
  const oneOffPct = total > 0 ? (breakdown.oneOffCRC / total) * 100 : 0;

  return (
    <DashboardSection
      icon={<BarChart2 className="h-3.5 w-3.5" />}
      label="Ingresos"
      index={1}
    >
      <div className="rounded-xl border border-[#3F3F46]/50 bg-[#18181B] p-5">
        {/* Header */}
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-[#FAFAFA]">Desglose de ingresos</h3>
          <span className="text-xs text-[#71717A]">
            Total: <span className="font-semibold text-[#A1A1AA]">{formatCRCCompact(total)}</span>
          </span>
        </div>

        {total === 0 ? (
          <p className="py-4 text-center text-sm text-[#52525B]">
            Sin ingresos registrados en este período.
          </p>
        ) : (
          <div className="space-y-4">
            <IncomeBar
              label="Mensualidades"
              amount={breakdown.recurringCRC}
              pct={recurringPct}
              color="bg-[#FF6A1A]"
              bgColor="bg-[#FF6A1A]/15"
            />
            <IncomeBar
              label="Ventas especiales"
              amount={breakdown.oneOffCRC}
              pct={oneOffPct}
              color="bg-[#22C55E]"
              bgColor="bg-[#22C55E]/15"
            />
          </div>
        )}
      </div>
    </DashboardSection>
  );
}
