// =============================================================================
// SUPER_ADMIN — /admin/operations
// Server component. Displays operational flow: invitations, charges, subs.
// =============================================================================

import {
  getOperationsSnapshot,
  type OperationsSnapshot,
} from "@/server/actions/admin.actions";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateCR, formatCRC } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Send,
  ClipboardList,
  AlarmClock,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  CalendarClock,
  XOctagon,
} from "lucide-react";

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "neutral",
  sub,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: "blue" | "green" | "red" | "yellow" | "neutral";
  sub?: string;
}) {
  const colors: Record<
    string,
    { bg: string; icon: string; border: string }
  > = {
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
    <div
      className={`rounded-xl border ${c.border} bg-[#18181B] p-4 flex flex-col gap-3`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#71717A]">
          {label}
        </p>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-md ${c.bg}`}
        >
          <Icon className={`h-4 w-4 ${c.icon}`} aria-hidden="true" />
        </div>
      </div>
      <p
        className="text-3xl font-bold text-[#FAFAFA]"
        style={{ fontFeatureSettings: "'tnum' 1" }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-[#71717A]">{sub}</p>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function Badge({
  label,
  color,
}: {
  label: string;
  color: "yellow" | "green" | "red" | "neutral";
}) {
  const styles = {
    yellow: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20",
    green: "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20",
    red: "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20",
    neutral: "bg-[#3F3F46]/20 text-[#A1A1AA] border border-[#3F3F46]/40",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[color]}`}
    >
      {label}
    </span>
  );
}

// ── Table shared styles ───────────────────────────────────────────────────────

const thCls =
  "px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#71717A]";
const tdCls = "px-3 py-2.5 text-sm text-[#FAFAFA] align-top";
const trCls = "border-b border-[#3F3F46]/40 last:border-0 hover:bg-[#27272A]/40 transition-colors";

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OperationsPage() {
  const result = await getOperationsSnapshot();

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Error al cargar operaciones: {result.error.message}
      </div>
    );
  }

  const s: OperationsSnapshot = result.value;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Operación"
        description="Flujo operativo de la plataforma"
      />

      {/* ── Invitaciones ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Invitaciones
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Pendientes"
            value={s.invitationsPending}
            icon={Send}
            accent="yellow"
          />
          <StatCard
            label="Onboarding activos"
            value={s.onboardingDraftsActive}
            icon={ClipboardList}
            accent="blue"
          />
          <StatCard
            label="Onboarding por vencer"
            value={s.onboardingDraftsExpiringSoon}
            icon={AlarmClock}
            accent="red"
          />
        </div>
      </section>

      {/* ── Cobros ───────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Cobros (CRC)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Pendientes"
            value={s.chargesPending}
            icon={Clock}
            accent="yellow"
          />
          <StatCard
            label="Vencidos"
            value={s.chargesOverdue}
            icon={AlertTriangle}
            accent="red"
          />
          <StatCard
            label="Pagados (7d)"
            value={s.chargesPaidLast7d}
            icon={CheckCircle2}
            accent="green"
          />
        </div>
      </section>

      {/* ── Suscripciones por vencer ─────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Suscripciones por vencer
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Trial finalizando"
            value={s.subscriptionsTrialEndingSoon}
            icon={Hourglass}
            accent="yellow"
          />
          <StatCard
            label="Por vencer"
            value={s.subscriptionsExpiringSoon}
            icon={CalendarClock}
            accent="yellow"
          />
          <StatCard
            label="Vencidas"
            value={s.subscriptionsPastDue}
            icon={XOctagon}
            accent="red"
          />
        </div>
      </section>

      {/* ── Tabla: Invitaciones recientes ────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Invitaciones recientes
        </h2>
        {s.recentInvitations.length === 0 ? (
          <p className="text-sm text-[#71717A]">
            No hay invitaciones recientes.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#3F3F46]/40 bg-[#18181B]">
            <table className="min-w-full">
              <thead className="border-b border-[#3F3F46]/40">
                <tr>
                  <th className={thCls}>Email</th>
                  <th className={thCls}>Trainer</th>
                  <th className={thCls}>Expira</th>
                  <th className={thCls}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {s.recentInvitations.map((inv) => (
                  <tr key={inv.id} className={trCls}>
                    <td className={tdCls}>
                      <span className="block max-w-[180px] truncate" title={inv.email}>
                        {inv.email}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className="block max-w-[160px] truncate" title={inv.trainerEmail}>
                        {inv.trainerName}
                      </span>
                      <span className="block max-w-[160px] truncate text-xs text-[#71717A]" title={inv.trainerEmail}>
                        {inv.trainerEmail}
                      </span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      {formatDateCR(inv.expiresAt, "d MMM yyyy HH:mm")}
                    </td>
                    <td className={tdCls}>
                      {inv.usedAt === null ? (
                        <Badge label="Pendiente" color="yellow" />
                      ) : (
                        <Badge label="Usada" color="green" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Tabla: Próximos cobros ────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Próximos cobros
        </h2>
        {s.upcomingChargeDeadlines.length === 0 ? (
          <p className="text-sm text-[#71717A]">Sin cobros próximos.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#3F3F46]/40 bg-[#18181B]">
            <table className="min-w-full">
              <thead className="border-b border-[#3F3F46]/40">
                <tr>
                  <th className={thCls}>Cliente</th>
                  <th className={thCls}>Trainer</th>
                  <th className={thCls}>Monto</th>
                  <th className={thCls}>Vence</th>
                  <th className={thCls}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {s.upcomingChargeDeadlines.map((charge) => (
                  <tr key={charge.id} className={trCls}>
                    <td className={tdCls}>
                      <span className="block max-w-[160px] truncate" title={charge.clientEmail}>
                        {charge.clientName}
                      </span>
                      <span className="block max-w-[160px] truncate text-xs text-[#71717A]" title={charge.clientEmail}>
                        {charge.clientEmail}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className="block max-w-[140px] truncate">
                        {charge.trainerName}
                      </span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap font-medium`}>
                      {formatCRC(charge.amountCRC)}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      {formatDateCR(charge.periodEnd, "d MMM yyyy")}
                    </td>
                    <td className={tdCls}>
                      {charge.status === "OVERDUE" ? (
                        <Badge label="Vencido" color="red" />
                      ) : (
                        <Badge label="Pendiente" color="yellow" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
