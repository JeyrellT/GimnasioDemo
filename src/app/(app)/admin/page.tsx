// =============================================================================
// SUPER_ADMIN — /admin dashboard
// Server component. Fetches platform-wide KPI stats.
// =============================================================================

import { getAdminDashboardStats } from "@/server/actions/admin.actions";
import { PageHeader } from "@/components/shared/page-header";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  Dumbbell,
  UserRound,
  ShieldCheck,
  Ban,
  CreditCard,
  Clock,
  XCircle,
  BookOpen,
  TrendingUp,
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
      bg: "bg-[#3B82F6]/10",
      icon: "text-[#3B82F6]",
      border: "border-[#3B82F6]/20",
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const result = await getAdminDashboardStats();

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Error al cargar estadísticas: {result.error.message}
      </div>
    );
  }

  const s = result.value;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Panel de Super Admin"
        description="Vista general de la plataforma"
      />

      {/* ── Usuarios ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Usuarios
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total usuarios"
            value={s.totalUsers}
            icon={Users}
            accent="blue"
          />
          <StatCard
            label="Trainers"
            value={s.totalTrainers}
            icon={Dumbbell}
            accent="green"
            sub={`+${s.newTrainersLast30d} últimos 30d`}
          />
          <StatCard
            label="Clientes"
            value={s.totalClients}
            icon={UserRound}
            accent="neutral"
          />
          <StatCard
            label="Admins"
            value={s.totalAdmins}
            icon={ShieldCheck}
            accent="yellow"
          />
          <StatCard
            label="Suspendidos"
            value={s.suspendedUsers}
            icon={Ban}
            accent="red"
          />
        </div>
      </section>

      {/* ── Suscripciones ────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Suscripciones
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Activas"
            value={s.activeSubs}
            icon={CreditCard}
            accent="green"
          />
          <StatCard
            label="Trial"
            value={s.trialSubs}
            icon={Clock}
            accent="yellow"
          />
          <StatCard
            label="Canceladas"
            value={s.cancelledSubs}
            icon={XCircle}
            accent="red"
          />
          <StatCard
            label="Solo lectura"
            value={s.readOnlySubs}
            icon={BookOpen}
            accent="neutral"
          />
        </div>
      </section>

      {/* ── Nuevos 30d ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Crecimiento — últimos 30 días
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Nuevos usuarios"
            value={s.newUsersLast30d}
            icon={TrendingUp}
            accent="blue"
          />
          <StatCard
            label="Nuevos trainers"
            value={s.newTrainersLast30d}
            icon={Dumbbell}
            accent="green"
          />
        </div>
      </section>
    </div>
  );
}
