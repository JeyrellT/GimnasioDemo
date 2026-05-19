// =============================================================================
// SUPER_ADMIN — /admin/users/[userId]
// Server component. Shows full user detail + action panel.
// =============================================================================

import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserDetail } from "@/server/actions/admin.actions";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateCR } from "@/lib/utils";
import { UserActions } from "../../_components/user-actions";
import { LicenseControl } from "../../_components/license-control";
import { ArrowLeft } from "lucide-react";
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client";

const ROLE_LABELS: Record<string, string> = {
  TRAINER: "Trainer",
  CLIENT: "Cliente",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

const ROLE_COLORS: Record<string, string> = {
  TRAINER: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
  CLIENT: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20",
  ADMIN: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
  SUPER_ADMIN: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (value == null) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#3F3F46]/40 py-2 last:border-0">
      <span className="text-sm text-[#71717A] shrink-0">{label}</span>
      <span className="text-sm text-[#FAFAFA] text-right break-all">{value}</span>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const result = await getUserDetail(userId);

  if (!result.ok) {
    if (
      result.error.code === "USER_NOT_FOUND" ||
      result.error.code === "NOT_FOUND"
    ) {
      notFound();
    }
    return (
      <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Error al cargar usuario: {result.error.message}
      </div>
    );
  }

  // AdminUserDetail is a flat object (no `.user` nesting)
  const detail = result.value;
  const isSuspended = !!detail.suspendedAt;
  const sub = detail.activeSubscription;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#FAFAFA] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Volver a usuarios
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <PageHeader
          title={detail.name ?? "(sin nombre)"}
          description={detail.email}
        />
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[detail.role] ?? "bg-[#3F3F46]/20 text-[#A1A1AA] border-[#3F3F46]/40"}`}
          >
            {ROLE_LABELS[detail.role] ?? detail.role}
          </span>
          {isSuspended ? (
            <span className="inline-flex items-center rounded-full border border-[#EF4444]/20 bg-[#EF4444]/10 px-2.5 py-0.5 text-xs font-semibold text-[#EF4444]">
              Suspendido
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-[#22C55E]/20 bg-[#22C55E]/10 px-2.5 py-0.5 text-xs font-semibold text-[#22C55E]">
              Activo
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left column: data sections ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* User info */}
          <section className="rounded-xl border border-[#3F3F46]/60 bg-[#18181B] p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A] mb-4">
              Información básica
            </h2>
            <div className="space-y-0">
              <Row label="ID" value={detail.id} />
              <Row label="Email" value={detail.email} />
              <Row label="Nombre" value={detail.name} />
              <Row label="Rol" value={ROLE_LABELS[detail.role] ?? detail.role} />
              <Row
                label="Registro"
                value={formatDateCR(detail.createdAt, "d 'de' MMMM 'de' yyyy")}
              />
              <Row
                label="Último acceso"
                value={
                  detail.lastLoginAt
                    ? formatDateCR(
                        detail.lastLoginAt,
                        "d 'de' MMMM 'de' yyyy, HH:mm",
                      )
                    : "Nunca"
                }
              />
              {detail.suspendedAt && (
                <Row
                  label="Suspendido el"
                  value={formatDateCR(
                    detail.suspendedAt,
                    "d 'de' MMMM 'de' yyyy",
                  )}
                />
              )}
              {detail.suspendedReason && (
                <Row label="Motivo de suspensión" value={detail.suspendedReason} />
              )}
            </div>
          </section>

          {/* Trainer subscription info (read-only summary) */}
          {sub && (
            <section className="rounded-xl border border-[#3F3F46]/60 bg-[#18181B] p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A] mb-4">
                Suscripción
              </h2>
              <div className="space-y-0">
                <Row label="Plan" value={sub.planTier} />
                <Row label="Estado" value={sub.status} />
                {sub.trialEndsAt && (
                  <Row
                    label="Trial vence"
                    value={formatDateCR(sub.trialEndsAt, "d MMM yyyy")}
                  />
                )}
                <Row
                  label="Período vence"
                  value={formatDateCR(sub.currentPeriodEndsAt, "d MMM yyyy")}
                />
              </div>
            </section>
          )}

          {/* License control — trainers only. Shows "Activar" when no sub exists. */}
          {detail.role === "TRAINER" && (
            <LicenseControl
              mode="panel"
              subscriptionId={sub?.id ?? null}
              trainerUserId={detail.id}
              status={(sub?.status as SubscriptionStatus | undefined) ?? null}
              planTier={(sub?.planTier as SubscriptionTier | undefined) ?? null}
            />
          )}

          {/* Counts */}
          {(detail.totalClients !== null || detail.totalSessions !== null) && (
            <section className="rounded-xl border border-[#3F3F46]/60 bg-[#18181B] p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A] mb-4">
                Estadísticas
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {detail.totalClients !== null && (
                  <div className="rounded-lg bg-[#27272A] p-3 text-center">
                    <p className="text-2xl font-bold text-[#FAFAFA]">
                      {detail.totalClients}
                    </p>
                    <p className="text-xs text-[#71717A] mt-1">Clientes activos</p>
                  </div>
                )}
                {detail.totalSessions !== null && (
                  <div className="rounded-lg bg-[#27272A] p-3 text-center">
                    <p className="text-2xl font-bold text-[#FAFAFA]">
                      {detail.totalSessions}
                    </p>
                    <p className="text-xs text-[#71717A] mt-1">Sesiones totales</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ── Right column: actions ────────────────────────────────────── */}
        <div>
          <UserActions
            userId={detail.id}
            currentRole={detail.role}
            isSuspended={isSuspended}
            subscriptionId={sub?.id}
          />
        </div>
      </div>
    </div>
  );
}
