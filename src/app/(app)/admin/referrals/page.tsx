// =============================================================================
// BLACKLINE FITNESS — /admin/referrals
// Server component. Lists all trainer referrals with stats, filters, table
// and per-row approve/reject actions.
// Owner: frontend-react.
// =============================================================================

import { PageHeader } from "@/components/shared/page-header";
import { formatDateCR } from "@/lib/utils";
import {
  listAllReferrals,
  getReferralStats,
} from "@/server/actions/referral.actions";
import { ReferralActions } from "./_components/referral-actions";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  Clock,
  CheckCircle2,
  UserCheck,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ReferralStatus = "PENDING" | "APPROVED" | "REGISTERED" | "REJECTED";

interface ReferralListItem {
  id: string;
  referredName: string;
  referredEmail: string;
  referredPhone: string | null;
  status: ReferralStatus;
  note: string | null;
  adminNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  referrer: {
    id: string;
    name: string;
    email: string;
  };
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "neutral",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: "blue" | "green" | "red" | "yellow" | "neutral";
}) {
  const colors: Record<string, { bg: string; icon: string; border: string }> = {
    blue: {
      bg: "bg-brand-primary/10",
      icon: "text-brand-primary",
      border: "border-brand-primary/20",
    },
    green: {
      bg: "bg-[#22C55E]/10",
      icon: "text-[#22C55E]",
      border: "border-[#22C55E]/20",
    },
    red: {
      bg: "bg-[#EF4444]/10",
      icon: "text-[#EF4444]",
      border: "border-[#EF4444]/20",
    },
    yellow: {
      bg: "bg-[#F59E0B]/10",
      icon: "text-[#F59E0B]",
      border: "border-[#F59E0B]/20",
    },
    neutral: {
      bg: "bg-[#3F3F46]/20",
      icon: "text-[#A1A1AA]",
      border: "border-[#3F3F46]/40",
    },
  };

  const c = colors[accent] ?? colors.neutral;

  return (
    <div className={`rounded-xl border ${c.border} bg-[#18181B] p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#71717A]">
          {label}
        </p>
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${c.bg}`}>
          <Icon className={`h-4 w-4 ${c.icon}`} aria-hidden="true" />
        </div>
      </div>
      <p
        className="text-3xl font-bold text-[#FAFAFA]"
        style={{ fontFeatureSettings: "'tnum' 1" }}
      >
        {value}
      </p>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_META: Record<
  ReferralStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-[#F59E0B]/15 text-[#F59E0B]",
  },
  APPROVED: {
    label: "Aprobada",
    className: "bg-[#22C55E]/15 text-[#22C55E]",
  },
  REGISTERED: {
    label: "Registrado",
    className: "bg-brand-primary/15 text-brand-primary",
  },
  REJECTED: {
    label: "Rechazada",
    className: "bg-[#EF4444]/15 text-[#EF4444]",
  },
};

function StatusBadge({ status }: { status: ReferralStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

// ── Status filter chips ───────────────────────────────────────────────────────

type StatusFilter = "TODOS" | ReferralStatus;

const FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "TODOS", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "APPROVED", label: "Aprobados" },
  { value: "REGISTERED", label: "Registrados" },
  { value: "REJECTED", label: "Rechazados" },
];

// ── Page params ───────────────────────────────────────────────────────────────

interface PageSearchParams {
  status?: string;
  page?: string;
}

interface Props {
  searchParams: Promise<PageSearchParams>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminReferralsPage({ searchParams }: Props) {
  const params = await searchParams;
  const pageSize = 20;

  const rawStatus = params.status?.toUpperCase();
  const statusFilter: ReferralStatus | undefined =
    rawStatus === "PENDING" ||
    rawStatus === "APPROVED" ||
    rawStatus === "REGISTERED" ||
    rawStatus === "REJECTED"
      ? rawStatus
      : undefined;

  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const [listResult, statsResult] = await Promise.all([
    listAllReferrals({ status: statusFilter, page, pageSize }),
    getReferralStats(),
  ]);

  // ── Error states ────────────────────────────────────────────────────────────

  if (!statsResult.ok || !listResult.ok) {
    const msg = !statsResult.ok
      ? statsResult.error.message
      : !listResult.ok
        ? listResult.error.message
        : "Error desconocido";
    return (
      <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Error al cargar referencias: {msg}
      </div>
    );
  }

  const stats = statsResult.value;
  const { referrals, total } = listResult.value;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ── Build pagination URLs ───────────────────────────────────────────────────

  function buildUrl(targetPage: number) {
    const p = new URLSearchParams();
    if (statusFilter) p.set("status", statusFilter);
    if (targetPage > 1) p.set("page", String(targetPage));
    const qs = p.toString();
    return qs ? `?${qs}` : "?";
  }

  function buildFilterUrl(s: StatusFilter) {
    const p = new URLSearchParams();
    if (s !== "TODOS") p.set("status", s);
    const qs = p.toString();
    return qs ? `?${qs}` : "?";
  }

  const currentFilter: StatusFilter = statusFilter ?? "TODOS";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <PageHeader
        title="Referencias de coaches"
        description="Revisá y gestioná las referencias enviadas por los entrenadores."
      />

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Resumen
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total"
            value={stats.total}
            icon={Users}
            accent="neutral"
          />
          <StatCard
            label="Pendientes"
            value={stats.pending}
            icon={Clock}
            accent="yellow"
          />
          <StatCard
            label="Aprobadas"
            value={stats.approved}
            icon={CheckCircle2}
            accent="green"
          />
          <StatCard
            label="Registrados"
            value={stats.registered}
            icon={UserCheck}
            accent="blue"
          />
          <StatCard
            label="Rechazadas"
            value={stats.rejected}
            icon={XCircle}
            accent="red"
          />
        </div>
      </section>

      {/* ── Filter chips ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#3F3F46]/70 bg-[#18181B] p-1 w-fit">
        {FILTER_OPTIONS.map((opt) => (
          <a
            key={opt.value}
            href={buildFilterUrl(opt.value)}
            className={[
              "rounded-md px-3 py-1 text-sm font-medium transition-colors duration-150",
              currentFilter === opt.value
                ? "bg-brand-primary text-white shadow-sm"
                : "text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A]",
            ].join(" ")}
          >
            {opt.label}
          </a>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {referrals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#3F3F46] bg-[#18181B]/50 py-12 text-center">
          <p className="text-sm text-[#52525B]">
            Sin referencias para el filtro seleccionado.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <p className="text-xs text-[#71717A]">
            {total} {total === 1 ? "referencia" : "referencias"} · página {page}/
            {totalPages}
          </p>

          <div className="overflow-x-auto rounded-xl border border-[#3F3F46] bg-[#18181B]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272A]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#52525B]">
                    Referente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#52525B]">
                    Referido
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#52525B] hidden md:table-cell">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#52525B] hidden lg:table-cell">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#52525B]">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#52525B] hidden sm:table-cell">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#52525B]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {referrals.map((referral: ReferralListItem) => (
                  <tr
                    key={referral.id}
                    className="hover:bg-[#27272A]/40 transition-colors"
                  >
                    {/* Referente */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-[#FAFAFA]">
                        {referral.referrer.name}
                      </p>
                      <p className="text-[11px] text-[#71717A] mt-0.5">
                        {referral.referrer.email}
                      </p>
                    </td>

                    {/* Referido */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-[#FAFAFA]">
                        {referral.referredName}
                      </p>
                      {referral.note && (
                        <p
                          className="text-[11px] text-[#71717A] mt-0.5 line-clamp-1 max-w-[160px]"
                          title={referral.note}
                        >
                          {referral.note}
                        </p>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-[#A1A1AA]">
                        {referral.referredEmail}
                      </span>
                    </td>

                    {/* Teléfono */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-[#A1A1AA]">
                        {referral.referredPhone ?? "—"}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <StatusBadge status={referral.status} />
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-[#71717A] whitespace-nowrap">
                        {formatDateCR(referral.createdAt, "d/MM/yyyy")}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <ReferralActions
                        referralId={referral.id}
                        status={referral.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ───────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <a
                href={page > 1 ? buildUrl(page - 1) : "#"}
                aria-disabled={page <= 1}
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  page <= 1
                    ? "pointer-events-none border-[#27272A] text-[#3F3F46] opacity-40"
                    : "border-[#3F3F46] text-[#A1A1AA] hover:border-brand-primary hover:text-[#FAFAFA]",
                ].join(" ")}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </a>
              <span className="text-xs text-[#71717A]">
                Página {page} de {totalPages}
              </span>
              <a
                href={page < totalPages ? buildUrl(page + 1) : "#"}
                aria-disabled={page >= totalPages}
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  page >= totalPages
                    ? "pointer-events-none border-[#27272A] text-[#3F3F46] opacity-40"
                    : "border-[#3F3F46] text-[#A1A1AA] hover:border-brand-primary hover:text-[#FAFAFA]",
                ].join(" ")}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
