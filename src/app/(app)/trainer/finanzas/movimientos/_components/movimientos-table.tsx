"use client";

// =============================================================================
// BLACKLINE FITNESS — MovimientosTable
// Client component: renders rows, handles delete (with confirm) + pagination.
// =============================================================================

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2, TrendingDown, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteExpense, deleteOneOffSale } from "@/app/actions/finance";
import type { MovimientoRow } from "../page";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCRC(n: number): string {
  return new Intl.NumberFormat("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  rows: MovimientoRow[];
  total: number;
  page: number;
  totalPages: number;
  month: string;
  tipo: "todos" | "gastos" | "ventas";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MovimientosTable({ rows, total, page, totalPages, month, tipo }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [deleteTarget, setDeleteTarget] = useState<MovimientoRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`?${params.toString()}`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const result =
      deleteTarget.type === "expense"
        ? await deleteExpense(deleteTarget.id)
        : await deleteOneOffSale(deleteTarget.id);

    setDeleting(false);

    if (!result.ok) {
      toast.error(result.error.message ?? "No se pudo eliminar.");
      return;
    }

    toast.success("Movimiento eliminado.");
    setDeleteTarget(null);
    startTransition(() => router.refresh());
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#3F3F46] bg-[#18181B]/50 py-12 text-center">
        <p className="text-sm text-[#52525B]">
          {total === 0
            ? "Sin movimientos para este período."
            : "Sin movimientos en esta página."}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Counter */}
      <p className="text-xs text-[#71717A]">
        {total} {total === 1 ? "movimiento" : "movimientos"} · página {page}/{totalPages}
      </p>

      {/* Table wrapper */}
      <div className="overflow-x-auto rounded-xl border border-[#3F3F46] bg-[#18181B]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#27272A]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#52525B] w-28">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#52525B] w-20">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#52525B]">Categoría</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#52525B] hidden md:table-cell">Descripción</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#52525B] w-28">Monto</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A]">
            {rows.map((row) => (
              <tr
                key={`${row.type}-${row.id}`}
                className="hover:bg-[#27272A]/40 transition-colors group"
              >
                {/* Fecha */}
                <td className="px-4 py-3 text-xs text-[#71717A] whitespace-nowrap">
                  {formatDate(row.occurredAt)}
                </td>

                {/* Tipo badge */}
                <td className="px-4 py-3">
                  {row.type === "expense" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EF4444]/10 px-2 py-0.5 text-[11px] font-semibold text-[#EF4444]">
                      <TrendingDown className="h-2.5 w-2.5" aria-hidden="true" />
                      Gasto
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/10 px-2 py-0.5 text-[11px] font-semibold text-[#22C55E]">
                      <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" />
                      Venta
                    </span>
                  )}
                </td>

                {/* Categoría */}
                <td className="px-4 py-3 text-xs text-[#A1A1AA]">
                  {row.categoryLabel}
                </td>

                {/* Descripción */}
                <td className="px-4 py-3 text-xs text-[#71717A] hidden md:table-cell max-w-xs">
                  <span className="line-clamp-1">{row.description ?? "—"}</span>
                </td>

                {/* Monto */}
                <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                  <span className={row.type === "expense" ? "text-[#EF4444]" : "text-[#22C55E]"}>
                    {row.type === "expense" ? "-" : "+"}₡{formatCRC(row.amountCRC)}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(row)}
                    className="flex h-7 w-7 mx-auto items-center justify-center rounded-md text-[#3F3F46] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Eliminar movimiento"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="gap-1.5 border-[#3F3F46] text-[#A1A1AA] hover:border-[#3B82F6] hover:text-[#FAFAFA] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Anterior
          </Button>
          <span className="text-xs text-[#71717A]">
            Página {page} de {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className="gap-1.5 border-[#3F3F46] text-[#A1A1AA] hover:border-[#3B82F6] hover:text-[#FAFAFA] disabled:opacity-40"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar movimiento</DialogTitle>
            <DialogDescription className="text-[#71717A] text-sm">
              ¿Eliminar este {deleteTarget?.type === "expense" ? "gasto" : "ingreso"} de{" "}
              <span className="font-semibold text-[#FAFAFA]">
                ₡{deleteTarget ? formatCRC(deleteTarget.amountCRC) : ""}
              </span>? Esta acción es irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="border-[#3F3F46] text-[#A1A1AA] hover:border-[#3B82F6]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
