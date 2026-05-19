"use client";

// =============================================================================
// BLACKLINE FITNESS — FinanceShell
// Owner: frontend-react.
// Layout wrapper: page header + period selector + "Nueva entrada" CTA.
// Accepts children (server-rendered sections) plus currentMonth/trainerName
// passed as serializable props from the Server Component.
// =============================================================================

import * as React from "react";
import Link from "next/link";
import { Plus, TrendingUp } from "lucide-react";
import { FinancePeriodSelector } from "./finance-period-selector";

// ── Props ─────────────────────────────────────────────────────────────────────

interface FinanceShellProps {
  trainerName: string | null;
  currentMonth: string; // "YYYY-MM"
  children: React.ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthHeading(monthStr: string): string {
  const parts = monthStr.split("-");
  const y = parts[0] ?? "2026";
  const m = parts[1] ?? "01";
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("es-CR", {
    month: "long",
    year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FinanceShell({ trainerName, currentMonth, children }: FinanceShellProps) {
  const heading = monthHeading(currentMonth);

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3B82F6]/15">
              <TrendingUp className="h-4 w-4 text-[#3B82F6]" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold capitalize text-[#FAFAFA]">
              Finanzas — <span className="text-[#3B82F6]">{heading}</span>
            </h1>
          </div>
          {trainerName && (
            <p className="pl-9 text-xs text-[#71717A]">Hola, {trainerName}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <FinancePeriodSelector currentMonth={currentMonth} />
          <Link
            href="/trainer/finanzas/nuevo"
            className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-2 text-sm font-semibold text-white shadow-md shadow-[#3B82F6]/20 transition-colors duration-150 hover:bg-[#E55D0F]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nueva entrada</span>
          </Link>
        </div>
      </div>

      {/* ── Content sections ────────────────────────────────────────────── */}
      {children}
    </div>
  );
}
