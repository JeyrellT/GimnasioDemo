// =============================================================================
// SUPER_ADMIN — /admin/monitoring
// Server component. Displays platform health: audit logs, payments, LPDP.
// =============================================================================

import {
  getMonitoringSnapshot,
  type MonitoringSnapshot,
} from "@/server/actions/admin.actions";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateCR } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  LogIn,
  ScrollText,
  AlertOctagon,
  Ban,
  Trash2,
  Wallet,
  FileWarning,
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

type BadgeColor = "yellow" | "green" | "red" | "neutral";

function Badge({ label, color }: { label: string; color: BadgeColor }) {
  const styles: Record<BadgeColor, string> = {
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

// ── Audit action badge color ──────────────────────────────────────────────────

function auditActionColor(action: string): BadgeColor {
  const upper = action.toUpperCase();
  if (upper.includes("DELETE")) return "red";
  if (upper.includes("UPDATE")) return "yellow";
  if (upper.includes("CREATE")) return "green";
  if (upper.includes("ACCESS")) return "neutral";
  return "neutral";
}

// ── Table shared styles ───────────────────────────────────────────────────────

const thCls =
  "px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#71717A]";
const tdCls = "px-3 py-2.5 text-sm text-[#FAFAFA] align-top";
const trCls =
  "border-b border-[#3F3F46]/40 last:border-0 hover:bg-[#27272A]/40 transition-colors";

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MonitoringPage() {
  const result = await getMonitoringSnapshot();

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-6 text-sm text-[#EF4444]">
        Error al cargar monitoreo: {result.error.message}
      </div>
    );
  }

  const s: MonitoringSnapshot = result.value;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Monitoreo"
        description="Salud y actividad de la aplicación"
      />

      {/* ── Salud ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Salud
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Sesiones activas"
            value={s.activeSessionsCount}
            icon={Activity}
            accent="green"
          />
          <StatCard
            label="Logins recientes"
            value={s.recentLoginsCount}
            icon={LogIn}
            accent="blue"
            sub="últimas 24h"
          />
          <StatCard
            label="Audit logs"
            value={s.totalAuditLogsLast24h}
            icon={ScrollText}
            accent="neutral"
            sub="eventos 24h"
          />
          <StatCard
            label="Borrados 24h"
            value={s.errorAuditLogsLast24h}
            icon={AlertOctagon}
            accent="red"
            sub="acciones DELETE en audit"
          />
        </div>
      </section>

      {/* ── Usuarios ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Usuarios
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Suspendidos"
            value={s.suspendedUsersCount}
            icon={Ban}
            accent="red"
          />
          <StatCard
            label="Eliminados"
            value={s.deletedUsersLast30dCount}
            icon={Trash2}
            accent="red"
            sub="últimos 30 días"
          />
        </div>
      </section>

      {/* ── Pagos ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Pagos
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Eventos sin procesar"
            value={s.unprocessedPaymentEvents}
            icon={Wallet}
            accent="yellow"
            sub="no procesados"
          />
          <StatCard
            label="Solicitudes LPDP"
            value={s.openLpdpRequestsCount}
            icon={FileWarning}
            accent="yellow"
            sub="LPDP abiertas"
          />
        </div>
      </section>

      {/* ── Tabla: Audit log reciente ─────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Audit log reciente
        </h2>
        {s.recentAuditLogs.length === 0 ? (
          <p className="text-sm text-[#71717A]">Sin eventos de audit recientes.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#3F3F46]/40 bg-[#18181B]">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="min-w-full">
                <thead className="sticky top-0 z-10 border-b border-[#3F3F46]/40 bg-[#18181B]">
                  <tr>
                    <th className={thCls}>Cuándo</th>
                    <th className={thCls}>Actor</th>
                    <th className={thCls}>Acción</th>
                    <th className={thCls}>Entidad</th>
                  </tr>
                </thead>
                <tbody>
                  {s.recentAuditLogs.slice(0, 30).map((log) => (
                    <tr key={log.id} className={trCls}>
                      <td className={`${tdCls} whitespace-nowrap`}>
                        {formatDateCR(log.createdAt, "d MMM yyyy HH:mm")}
                      </td>
                      <td className={tdCls}>
                        {log.actorName === null && log.actorEmail === null ? (
                          <span className="text-[#71717A]">(sistema)</span>
                        ) : (
                          <>
                            {log.actorName && (
                              <span className="block max-w-[160px] truncate" title={log.actorName}>
                                {log.actorName}
                              </span>
                            )}
                            {log.actorEmail && (
                              <span
                                className="block max-w-[160px] truncate text-xs text-[#71717A]"
                                title={log.actorEmail}
                              >
                                {log.actorEmail}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className={tdCls}>
                        <Badge
                          label={log.action}
                          color={auditActionColor(log.action)}
                        />
                      </td>
                      <td className={tdCls}>
                        <span className="block text-[#FAFAFA]">{log.entityType}</span>
                        {log.entityId && (
                          <span className="block font-mono text-xs text-[#71717A]">
                            {log.entityId.slice(0, 8)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Tabla: Errores de pago ────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          Errores de pago
        </h2>
        {s.failedPaymentEvents.length === 0 ? (
          <p className="text-sm text-[#71717A]">Sin errores de pago recientes.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#3F3F46]/40 bg-[#18181B]">
            <table className="min-w-full">
              <thead className="border-b border-[#3F3F46]/40">
                <tr>
                  <th className={thCls}>Cuándo</th>
                  <th className={thCls}>Tipo</th>
                  <th className={thCls}>External ID</th>
                  <th className={thCls}>Error</th>
                </tr>
              </thead>
              <tbody>
                {s.failedPaymentEvents.map((ev) => (
                  <tr key={ev.id} className={trCls}>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      {formatDateCR(ev.createdAt, "d MMM yyyy HH:mm")}
                    </td>
                    <td className={tdCls}>
                      <span className="block max-w-[120px] truncate">{ev.type}</span>
                    </td>
                    <td className={tdCls}>
                      {ev.externalId ? (
                        <span className="block max-w-[140px] truncate font-mono text-xs text-[#A1A1AA]">
                          {ev.externalId}
                        </span>
                      ) : (
                        <span className="text-[#71717A]">—</span>
                      )}
                    </td>
                    <td className={tdCls}>
                      {ev.error ? (
                        <span
                          className="block max-w-[260px] truncate text-xs text-[#EF4444]"
                          title={ev.error}
                        >
                          {ev.error.length > 60
                            ? `${ev.error.slice(0, 60)}…`
                            : ev.error}
                        </span>
                      ) : (
                        <span className="text-[#71717A]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Tabla: LPDP abiertas ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
          LPDP abiertas
        </h2>
        {s.openLpdpRequests.length === 0 ? (
          <p className="text-sm text-[#71717A]">
            Sin solicitudes LPDP abiertas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#3F3F46]/40 bg-[#18181B]">
            <table className="min-w-full">
              <thead className="border-b border-[#3F3F46]/40">
                <tr>
                  <th className={thCls}>Cuándo</th>
                  <th className={thCls}>Usuario</th>
                  <th className={thCls}>Tipo</th>
                  <th className={thCls}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {s.openLpdpRequests.map((req) => (
                  <tr key={req.id} className={trCls}>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      {formatDateCR(req.createdAt, "d MMM yyyy HH:mm")}
                    </td>
                    <td className={tdCls}>
                      <span className="block max-w-[160px] truncate" title={req.userEmail}>
                        {req.userName}
                      </span>
                      <span
                        className="block max-w-[160px] truncate text-xs text-[#71717A]"
                        title={req.userEmail}
                      >
                        {req.userEmail}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <Badge label={req.type} color="neutral" />
                    </td>
                    <td className={tdCls}>
                      <Badge label={req.status} color="yellow" />
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
