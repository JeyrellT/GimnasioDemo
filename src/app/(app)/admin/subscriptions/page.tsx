// =============================================================================
// SUPER_ADMIN — /admin/subscriptions
// Server component. Lists all trainer subscriptions with status filter.
// =============================================================================

import Link from "next/link";
import { listAllSubscriptions } from "@/server/actions/admin.actions";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateCR } from "@/lib/utils";
import { LicenseControl } from "../_components/license-control";
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client";

type SearchParams = {
  status?: string;
  page?: string;
};

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "ACTIVE", label: "Activas" },
  { value: "TRIAL", label: "Trial" },
  { value: "CANCELLED", label: "Canceladas" },
  { value: "READ_ONLY", label: "Solo lectura" },
  { value: "PAST_DUE", label: "Vencidas" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-[#22C55E]/10 text-[#22C55E]",
  TRIAL: "bg-[#F59E0B]/10 text-[#F59E0B]",
  CANCELLED: "bg-[#EF4444]/10 text-[#EF4444]",
  READ_ONLY: "bg-[#71717A]/10 text-[#71717A]",
  PAST_DUE: "bg-[#EF4444]/10 text-[#EF4444]",
};

const PLAN_LABELS: Record<string, string> = {
  SOLO: "Solo",
  PRO: "Pro",
  STUDIO: "Studio",
};

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const VALID_STATUSES: SubscriptionStatus[] = [
    "TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "READ_ONLY",
  ];
  const statusParam = params.status && VALID_STATUSES.includes(params.status as SubscriptionStatus)
    ? (params.status as SubscriptionStatus)
    : undefined;

  const result = await listAllSubscriptions({
    status: statusParam,
    page,
    pageSize: PAGE_SIZE,
  });

  const data = result.ok ? result.value : null;
  const subscriptions = data?.subscriptions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suscripciones"
        description={`${total} suscripción${total !== 1 ? "es" : ""} registradas`}
      />

      {/* Status filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#71717A] shrink-0">Estado:</span>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(({ value, label }) => {
            const isActive = (params.status ?? "") === value;
            const href = value
              ? `/admin/subscriptions?status=${value}&page=1`
              : `/admin/subscriptions?page=1`;
            return (
              <Link
                key={value}
                href={href}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-brand-primary text-white"
                    : "bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-[#FAFAFA]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {!result.ok && (
        <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-4 text-sm text-[#EF4444]">
          Error al cargar suscripciones: {result.error.message}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[#3F3F46]/60 bg-[#18181B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#3F3F46]/60">
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-[#71717A]">
                  Trainer
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-[#71717A]">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-[#71717A]">
                  Estado
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-[#71717A]">
                  Trial vence
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-[#71717A]">
                  Período vence
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-[#71717A]">
                  Creada
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-[#71717A]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3F3F46]/40">
              {subscriptions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-[#71717A]"
                  >
                    No se encontraron suscripciones con ese filtro.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-[#27272A]/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${sub.trainerUserId}`}
                        className="text-sm text-[#FAFAFA] hover:text-brand-primary transition-colors"
                      >
                        {sub.trainerEmail ?? sub.trainerUserId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#A1A1AA]">
                      {PLAN_LABELS[sub.planTier] ?? sub.planTier}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[sub.status] ?? "bg-[#3F3F46]/20 text-[#A1A1AA]"}`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs text-[#71717A]">
                      {sub.trialEndsAt
                        ? formatDateCR(sub.trialEndsAt, "d MMM yyyy")
                        : "—"}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-xs text-[#71717A]">
                      {formatDateCR(sub.currentPeriodEndsAt, "d MMM yyyy")}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-xs text-[#71717A]">
                      {formatDateCR(sub.createdAt, "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <LicenseControl
                        mode="row"
                        subscriptionId={sub.id}
                        trainerUserId={sub.trainerUserId}
                        status={sub.status}
                        planTier={sub.planTier as SubscriptionTier}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#71717A]">
          <span>
            Página {page} de {totalPages} — {total} suscripciones
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/subscriptions?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
                className="rounded-lg border border-[#3F3F46] bg-[#18181B] px-3 py-1.5 text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/subscriptions?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
                className="rounded-lg border border-[#3F3F46] bg-[#18181B] px-3 py-1.5 text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
