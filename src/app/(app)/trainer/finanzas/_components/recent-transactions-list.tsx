// =============================================================================
// VIZION — RecentTransactionsList
// Owner: frontend-react.
// Feed of FinanceTransaction items with relative time + type badge + amount.
// Server Component — all formatting is static, no interactivity.
// =============================================================================

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { FinanceTransaction } from "@/types/finance";
import { DashboardSection } from "@/app/(app)/inicio/_components/dashboard-section";
import { Zap, ArrowRight } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCRCAmount(amount: number, type: FinanceTransaction["type"]): string {
  const formatted = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return type === "expense" ? `−${formatted}` : `+${formatted}`;
}

/** Relative label: "Hoy 14:32", "Ayer 10:00", "Hace 3d". */
function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((todayStart.getTime() - dStart.getTime()) / 86_400_000);

  const time = d.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit", hour12: false });

  if (diffDays === 0) return `Hoy ${time}`;
  if (diffDays === 1) return `Ayer ${time}`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return d.toLocaleDateString("es-CR", { day: "numeric", month: "short" });
}

// ── Type badge ────────────────────────────────────────────────────────────────

interface TypeBadgeProps {
  type: FinanceTransaction["type"];
}

function TypeBadge({ type }: TypeBadgeProps) {
  const config = {
    expense: {
      label: "Gasto",
      className: "bg-[#EF4444]/15 text-[#EF4444]",
    },
    sale: {
      label: "Ingreso",
      className: "bg-[#22C55E]/15 text-[#22C55E]",
    },
    client_charge: {
      label: "Cobro",
      className: "bg-[#22C55E]/15 text-[#22C55E]",
    },
    visit: {
      label: "Visita",
      className: "bg-[#FF6A1A]/15 text-[#FF6A1A]",
    },
  } as const satisfies Record<FinanceTransaction["type"], { label: string; className: string }>;

  const { label, className } = config[type];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        className,
      )}
    >
      {label}
    </span>
  );
}

// ── Amount display ────────────────────────────────────────────────────────────

function amountColor(type: FinanceTransaction["type"]): string {
  if (type === "expense" || type === "visit") return "text-[#EF4444]";
  return "text-[#22C55E]";
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface TransactionRowProps {
  tx: FinanceTransaction;
}

function TransactionRow({ tx }: TransactionRowProps) {
  const time = relativeTime(tx.occurredAt);
  const amount = formatCRCAmount(tx.amountCRC, tx.type);

  return (
    <li className="flex flex-wrap items-center gap-2 py-2.5 sm:flex-nowrap">
      {/* Time */}
      <span className="w-28 shrink-0 text-[11px] tabular-nums text-[#52525B]">{time}</span>

      {/* Badge */}
      <TypeBadge type={tx.type} />

      {/* Description / category */}
      <span className="flex-1 truncate text-xs text-[#A1A1AA]">{tx.description}</span>

      {/* Amount */}
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          amountColor(tx.type),
        )}
      >
        {amount}
      </span>
    </li>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface RecentTransactionsListProps {
  transactions: FinanceTransaction[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RecentTransactionsList({ transactions }: RecentTransactionsListProps) {
  return (
    <DashboardSection
      icon={<Zap className="h-3.5 w-3.5" />}
      label="Movimientos recientes"
      index={4}
    >
      <div className="rounded-xl border border-[#3F3F46]/50 bg-[#18181B]">
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#52525B]">
            Sin movimientos en este período.
          </p>
        ) : (
          <ul
            className="divide-y divide-[#27272A]/60 px-4"
            aria-label="Movimientos recientes"
          >
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </ul>
        )}

        {/* Footer */}
        <div className="border-t border-[#27272A]/60 px-4 py-2.5">
          <Link
            href="/trainer/finanzas/movimientos"
            className="flex items-center gap-1.5 text-xs font-medium text-[#FF6A1A] transition-opacity duration-100 hover:opacity-80"
          >
            Ver todos los movimientos
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </DashboardSection>
  );
}
