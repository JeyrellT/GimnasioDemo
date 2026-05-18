"use client";

// =============================================================================
// VIZION — /trainer/finanzas — Finance Dashboard
// Owner: frontend-react.
// =============================================================================

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { getFinanceDashboard } from "@/app/actions/finance";
import { FinanceShell } from "./_components/finance-shell";
import { FinanceKPIRow } from "./_components/finance-kpi-row";
import { IncomeBreakdownCard } from "./_components/income-breakdown-card";
import { ExpenseBreakdownChart } from "./_components/expense-breakdown-chart";
import { LocationCostTable } from "./_components/location-cost-table";
import { RecentTransactionsList } from "./_components/recent-transactions-list";
import type { FinanceSummary } from "@/server/actions/finance.actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentMonthStr(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthToRange(monthStr: string): { fromDate: Date; toDate: Date } {
  const parts = monthStr.split("-");
  const year = parseInt(parts[0] ?? "2026", 10);
  const month = parseInt(parts[1] ?? "01", 10);
  return {
    fromDate: new Date(year, month - 1, 1),
    toDate: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[#18181B]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-48 rounded-xl bg-[#18181B]" />
        <div className="h-48 rounded-xl bg-[#18181B]" />
      </div>
      <div className="h-36 rounded-xl bg-[#18181B]" />
      <div className="h-64 rounded-xl bg-[#18181B]" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinanzasPage() {
  const searchParams = useSearchParams();
  const monthStr = searchParams.get("month") ?? currentMonthStr();

  const [payload, setPayload] = React.useState<FinanceSummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    setError(null);

    getFinanceDashboard(monthStr).then((result) => {
      if (!result.ok) {
        setError("Error al cargar el dashboard");
      } else {
        setPayload(result.value as unknown as FinanceSummary);
      }
      setLoading(false);
    });
  }, [monthStr]);

  if (loading) {
    return (
      <FinanceShell trainerName="Coach Demo" currentMonth={monthStr}>
        <DashboardSkeleton />
      </FinanceShell>
    );
  }

  if (error || !payload) {
    return (
      <FinanceShell trainerName="Coach Demo" currentMonth={monthStr}>
        <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-8 text-center">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#EF4444]">Error al cargar el dashboard</p>
            <p className="text-xs text-[#71717A]">Intentá recargar la página.</p>
          </div>
        </div>
      </FinanceShell>
    );
  }

  // Cast to access optional dashboard fields — these may be undefined until a
  // dedicated aggregation action is implemented.
  const dash = payload as unknown as {
    kpis?: Parameters<typeof FinanceKPIRow>[0]["kpis"];
    incomeBreakdown?: Parameters<typeof IncomeBreakdownCard>[0]["breakdown"];
    expenseBreakdown?: Parameters<typeof ExpenseBreakdownChart>[0]["data"];
    locationCosts?: Parameters<typeof LocationCostTable>[0]["rows"];
    recentTransactions?: Parameters<typeof RecentTransactionsList>[0]["transactions"];
  };

  return (
    <FinanceShell trainerName="Coach Demo" currentMonth={monthStr}>
      {dash.kpis && <FinanceKPIRow kpis={dash.kpis} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {dash.incomeBreakdown && <IncomeBreakdownCard breakdown={dash.incomeBreakdown} />}
        {dash.expenseBreakdown && <ExpenseBreakdownChart data={dash.expenseBreakdown} />}
      </div>

      {dash.locationCosts && <LocationCostTable rows={dash.locationCosts} />}

      {dash.recentTransactions && <RecentTransactionsList transactions={dash.recentTransactions} />}
    </FinanceShell>
  );
}
