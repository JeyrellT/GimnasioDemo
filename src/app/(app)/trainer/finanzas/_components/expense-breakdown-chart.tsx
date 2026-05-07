"use client";

// =============================================================================
// FORJA — ExpenseBreakdownChart
// Owner: frontend-react.
// Recharts donut PieChart showing expense categories.
// =============================================================================

import * as React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { FinanceExpenseBreakdown, ExpenseCategory } from "@/types/finance";
import { DashboardSection } from "@/app/(app)/inicio/_components/dashboard-section";
import { PieChart as PieChartIcon } from "lucide-react";

// ── Category labels & colors ──────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TRANSPORTE: "Transporte",
  ALQUILER_ESPACIO: "Alquiler de espacio",
  EQUIPO: "Equipo",
  MARKETING: "Marketing",
  EDUCACION: "Educación",
  SOFTWARE: "Software",
  COMIDAS: "Comidas",
  IMPUESTOS: "Impuestos",
  SERVICIOS_PROFESIONALES: "Servicios profesionales",
  OTROS: "Otros",
};

// Design-system-aligned palette — using distinct tokens, not random
const CATEGORY_COLORS: Partial<Record<ExpenseCategory, string>> = {
  TRANSPORTE: "#FF6A1A",
  ALQUILER_ESPACIO: "#F59E0B",
  EQUIPO: "#22C55E",
  MARKETING: "#3B82F6",
  EDUCACION: "#8B5CF6",
  SOFTWARE: "#06B6D4",
  COMIDAS: "#EC4899",
  IMPUESTOS: "#EF4444",
  SERVICIOS_PROFESIONALES: "#A78BFA",
  OTROS: "#71717A",
};

function colorFor(cat: ExpenseCategory): string {
  return CATEGORY_COLORS[cat] ?? "#71717A";
}

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

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name: ExpenseCategory;
  value: number;
  payload: { pct: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;

  return (
    <div className="rounded-lg border border-[#3F3F46] bg-[#18181B] px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-[#FAFAFA]">
        {CATEGORY_LABELS[item.name] ?? item.name}
      </p>
      <p className="mt-0.5 text-xs text-[#A1A1AA]">
        {formatCRCFull(item.value)}{" "}
        <span className="text-[#71717A]">({item.payload.pct.toFixed(1)}%)</span>
      </p>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ExpenseBreakdownChartProps {
  data: FinanceExpenseBreakdown[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  // Sort descending by amount for legend readability
  const sorted = [...data].sort((a, b) => b.amountCRC - a.amountCRC);

  return (
    <DashboardSection
      icon={<PieChartIcon className="h-3.5 w-3.5" />}
      label="Gastos por categoría"
      index={2}
    >
      <div className="rounded-xl border border-[#3F3F46]/50 bg-[#18181B] p-5">
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#52525B]">
            Sin gastos registrados en este período.
          </p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Donut chart */}
            <div className="mx-auto h-44 w-44 shrink-0 sm:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sorted}
                    dataKey="amountCRC"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {sorted.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={colorFor(entry.category)}
                        opacity={0.9}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <ul className="flex-1 space-y-1.5 min-w-0">
              {sorted.map((entry) => (
                <li key={entry.category} className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: colorFor(entry.category) }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate text-xs text-[#A1A1AA]">
                    {CATEGORY_LABELS[entry.category] ?? entry.category}
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-[#FAFAFA]">
                    {formatCRCCompact(entry.amountCRC)}
                  </span>
                  <span className="shrink-0 text-[11px] text-[#52525B]">
                    {entry.pct.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DashboardSection>
  );
}
