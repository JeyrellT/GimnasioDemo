"use client";

// =============================================================================
// VIZION — /trainer/finanzas/movimientos
// Merged paginated list of expenses + one-off sales, sorted desc by date.
// URL: /trainer/finanzas/movimientos?month=2026-05&tipo=todos&page=1
// =============================================================================

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { listExpenses, listOneOffSales } from "@/app/actions/finance";
import type { ExpenseDTO, OneOffSaleDTO } from "@/types/finance";
import { FinancePeriodSelector } from "../_components/finance-period-selector";
import { MovimientosTable } from "./_components/movimientos-table";
import { MovimientosTipoFilter } from "./_components/movimientos-tipo-filter";

// ── Row type (exported for child components) ──────────────────────────────────

export type MovimientoRow = {
  id: string;
  type: "expense" | "sale";
  occurredAt: string;
  amountCRC: number;
  category: string;
  description: string | null;
  /** Category label in Spanish */
  categoryLabel: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(raw: string | null): string {
  if (!raw) return currentMonthStr();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : currentMonthStr();
}

function parseTipo(raw: string | null): "todos" | "gastos" | "ventas" {
  if (raw === "gastos" || raw === "ventas") return raw;
  return "todos";
}

function parsePage(raw: string | null): number {
  if (!raw) return 1;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 1 ? 1 : n;
}

function monthToRange(month: string): { fromDate: Date; toDate: Date } {
  const parts = month.split("-").map(Number);
  const y = parts[0] ?? new Date().getFullYear();
  const m = parts[1] ?? new Date().getMonth() + 1;
  return {
    fromDate: new Date(y, m - 1, 1, 0, 0, 0),
    toDate: new Date(y, m, 0, 23, 59, 59),
  };
}

// ── Category label maps ────────────────────────────────────────────────────────

const EXPENSE_CAT_LABELS: Record<string, string> = {
  TRANSPORTE:              "Transporte",
  ALQUILER_ESPACIO:        "Alquiler espacio",
  EQUIPO:                  "Equipo",
  MARKETING:               "Marketing",
  EDUCACION:               "Educación",
  SOFTWARE:                "Software",
  COMIDAS:                 "Comidas",
  IMPUESTOS:               "Impuestos",
  SERVICIOS_PROFESIONALES: "Servicios profesionales",
  OTROS:                   "Otros",
};

const INCOME_CAT_LABELS: Record<string, string> = {
  SESION_PT:          "Sesión PT",
  EVALUACION_INICIAL: "Evaluación inicial",
  PLAN_NUTRICIONAL:   "Plan nutricional",
  CLASE_GRUPAL:       "Clase grupal",
  ASESORIA_ONLINE:    "Asesoría online",
  PRODUCTO:           "Producto",
  OTROS:              "Otros",
};

function expenseToRow(e: ExpenseDTO): MovimientoRow {
  return {
    id: e.id,
    type: "expense",
    occurredAt: e.occurredAt,
    amountCRC: e.amountCRC,
    category: e.category,
    categoryLabel: EXPENSE_CAT_LABELS[e.category] ?? e.category,
    description: e.description,
  };
}

function saleToRow(s: OneOffSaleDTO): MovimientoRow {
  return {
    id: s.id,
    type: "sale",
    occurredAt: s.occurredAt,
    amountCRC: s.amountCRC,
    category: s.category,
    categoryLabel: INCOME_CAT_LABELS[s.category] ?? s.category,
    description: s.description,
  };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-[#18181B]" />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageState {
  rows: MovimientoRow[];
  total: number;
  totalPages: number;
  safePage: number;
  loading: boolean;
}

export default function MovimientosPage() {
  const searchParams = useSearchParams();

  const month = parseMonth(searchParams.get("month"));
  const tipo = parseTipo(searchParams.get("tipo"));
  const page = parsePage(searchParams.get("page"));

  const [state, setState] = React.useState<PageState>({
    rows: [],
    total: 0,
    totalPages: 1,
    safePage: 1,
    loading: true,
  });

  React.useEffect(() => {
    setState((s) => ({ ...s, loading: true }));

    const range = monthToRange(month);

    const emptyExpenses: ExpenseDTO[] = [];
    const emptySales: OneOffSaleDTO[] = [];
    const { fromDate, toDate } = range;

    Promise.all([
      tipo === "ventas"
        ? Promise.resolve({ ok: true as const, value: { expenses: emptyExpenses, total: 0 } })
        : listExpenses({ fromDate, toDate }),
      tipo === "gastos"
        ? Promise.resolve({ ok: true as const, value: { sales: emptySales, total: 0 } })
        : listOneOffSales({ fromDate, toDate }),
    ]).then(([expensesResult, salesResult]) => {
      const rawExpenses = expensesResult.ok && 'expenses' in expensesResult.value ? expensesResult.value.expenses : [];
      const rawSales = salesResult.ok && 'sales' in salesResult.value ? salesResult.value.sales : [];
      // Map server types to DTO shapes (occurredAt → ISO string)
      const expenses = rawExpenses.map((e) => expenseToRow({ ...e, occurredAt: e.occurredAt instanceof Date ? e.occurredAt.toISOString() : String(e.occurredAt) } as import("@/types/finance").ExpenseDTO));
      const sales = rawSales.map((s) => saleToRow({ ...s, occurredAt: s.occurredAt instanceof Date ? s.occurredAt.toISOString() : String(s.occurredAt) } as import("@/types/finance").OneOffSaleDTO));

      const all = [...expenses, ...sales].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      );

      const t = all.length;
      const tPages = Math.max(1, Math.ceil(t / PAGE_SIZE));
      const sPage = Math.min(page, tPages);
      const pageRows = all.slice((sPage - 1) * PAGE_SIZE, sPage * PAGE_SIZE);

      setState({ rows: pageRows, total: t, totalPages: tPages, safePage: sPage, loading: false });
    });
  }, [month, tipo, page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#FAFAFA] leading-tight">Movimientos</h1>
        <p className="text-xs text-[#71717A] mt-0.5">Historial completo de gastos y ventas</p>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <FinancePeriodSelector currentMonth={month} />
        <MovimientosTipoFilter current={tipo} />
      </div>

      {/* Table */}
      {state.loading ? (
        <TableSkeleton />
      ) : (
        <MovimientosTable
          rows={state.rows}
          total={state.total}
          page={state.safePage}
          totalPages={state.totalPages}
          month={month}
          tipo={tipo}
        />
      )}
    </div>
  );
}
