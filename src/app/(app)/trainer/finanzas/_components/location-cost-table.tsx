"use client";

// =============================================================================
// VIZION — LocationCostTable
// Owner: frontend-react.
// Sortable table: Ubicación, Visitas, Costo/visita, Total, Clientes.
// =============================================================================

import * as React from "react";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown, MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinanceLocationCost } from "@/types/finance";
import { DashboardSection } from "@/app/(app)/inicio/_components/dashboard-section";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCRC(amount: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Sort state ────────────────────────────────────────────────────────────────

type SortKey = "locationName" | "visitCount" | "costPerVisitAvg" | "totalCostCRC" | "clientCount";
type SortDir = "asc" | "desc";

function sortRows(
  rows: FinanceLocationCost[],
  key: SortKey,
  dir: SortDir,
): FinanceLocationCost[] {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    if (typeof av === "string" && typeof bv === "string") {
      return dir === "asc" ? av.localeCompare(bv, "es") : bv.localeCompare(av, "es");
    }
    const an = Number(av);
    const bn = Number(bv);
    return dir === "asc" ? an - bn : bn - an;
  });
}

// ── Column header ─────────────────────────────────────────────────────────────

interface ThProps {
  children: React.ReactNode;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}

function Th({ children, sortKey, currentKey, dir, onSort, className }: ThProps) {
  const active = sortKey === currentKey;
  return (
    <th
      scope="col"
      className={cn("px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A]", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "flex items-center gap-1 transition-colors duration-100 hover:text-[#FAFAFA]",
          active && "text-[#FF6A1A]",
        )}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {children}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
        )}
      </button>
    </th>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LocationCostTableProps {
  rows: FinanceLocationCost[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LocationCostTable({ rows }: LocationCostTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>("totalCostCRC");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  const hasClientCount = rows.some((r) => r.clientCount > 0);

  const sorted = React.useMemo(
    () => sortRows(rows, sortKey, sortDir),
    [rows, sortKey, sortDir],
  );

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <DashboardSection
      icon={<MapPin className="h-3.5 w-3.5" />}
      label="Costo por ubicación"
      index={3}
    >
      <div className="rounded-xl border border-[#3F3F46]/50 bg-[#18181B] overflow-hidden">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#52525B]">
            Sin visitas a ubicaciones en este período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#27272A]">
                  <Th sortKey="locationName" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="pl-4">
                    Ubicación
                  </Th>
                  <Th sortKey="visitCount" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="text-right">
                    Visitas
                  </Th>
                  <Th sortKey="costPerVisitAvg" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="text-right">
                    Costo/visita
                  </Th>
                  <Th sortKey="totalCostCRC" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="text-right">
                    Total
                  </Th>
                  {hasClientCount && (
                    <Th sortKey="clientCount" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="text-right pr-4">
                      Clientes
                    </Th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr
                    key={row.locationId}
                    className={cn(
                      "transition-colors duration-100 hover:bg-[#27272A]/50",
                      i !== sorted.length - 1 && "border-b border-[#27272A]/60",
                    )}
                  >
                    <td className="py-3 pl-4 pr-3">
                      <span className="font-medium text-[#FAFAFA]">{row.locationName}</span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#A1A1AA]">
                      {row.visitCount}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#A1A1AA]">
                      {formatCRC(row.costPerVisitAvg)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-[#FAFAFA]">
                      {formatCRC(row.totalCostCRC)}
                    </td>
                    {hasClientCount && (
                      <td className="py-3 pl-3 pr-4 text-right tabular-nums text-[#A1A1AA]">
                        {row.clientCount}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer link */}
        <div className="border-t border-[#27272A]/60 px-4 py-2.5">
          <Link
            href="/trainer/finanzas/ubicaciones"
            className="flex items-center gap-1.5 text-xs font-medium text-[#FF6A1A] transition-opacity duration-100 hover:opacity-80"
          >
            Gestionar ubicaciones
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </DashboardSection>
  );
}
