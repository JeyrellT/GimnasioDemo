import { AlertTriangle, Activity, CalendarDays, TrendingUp, Users, Zap } from "lucide-react";
import { DashboardShell } from "./_components/dashboard-shell";
import { DashboardSection } from "./_components/dashboard-section";
import { DashboardFilterBar } from "./_components/dashboard-filter-bar";
import { AlertsFeed } from "./_components/alerts-feed";
import { QuickActionsBar } from "./_components/quick-actions-bar";
import type {
  DashboardFilters,
  DashboardKPIBand,
  DashboardCalendar,
  DashboardRosterItem,
  DashboardAggregates,
  DashboardAlert,
} from "@/types/dashboard";

import { KPIHeroRow } from "./_components/kpi-hero-row";
import { CalendarWidget } from "./_components/calendar-widget";
import { ClientRoster } from "./_components/client-roster";
import { AggregateCharts } from "./_components/aggregate-charts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrainerDashboardProps {
  /** Trainer's display name (for greeting). */
  trainerName: string;
  filters: DashboardFilters;
  kpis: DashboardKPIBand | null;
  calendar: DashboardCalendar | null;
  roster: DashboardRosterItem[] | null;
  aggregates: DashboardAggregates | null;
  alerts: DashboardAlert[] | null;
}

// ── Section error fallback ─────────────────────────────────────────────────────

function SectionError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5 px-4 py-3 text-sm text-[#EF4444]">
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────

export function TrainerDashboard({
  trainerName,
  filters,
  kpis,
  calendar,
  roster,
  aggregates,
  alerts,
}: TrainerDashboardProps) {
  return (
    <DashboardShell>
      {/* Greeting + filter bar — no section header, it IS the header */}
      <DashboardFilterBar trainerName={trainerName} />

      {/* KPI hero row */}
      <DashboardSection icon={<Activity className="h-3.5 w-3.5" />} label="Indicadores clave" index={0}>
        {kpis !== null ? (
          <KPIHeroRow kpis={kpis} />
        ) : (
          <SectionError message="No se pudieron cargar los indicadores clave. Recargá la página." />
        )}
      </DashboardSection>

      {/* Calendar + Alerts — two-column section, shared section heading */}
      <DashboardSection icon={<CalendarDays className="h-3.5 w-3.5" />} label="Agenda y seguimientos" index={1}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {calendar !== null ? (
              <CalendarWidget calendar={calendar} />
            ) : (
              <SectionError message="No se pudo cargar el calendario. Recargá la página." />
            )}
          </div>

          <AlertsFeed
            alerts={alerts ?? []}
            className="lg:col-span-1"
          />
        </div>
      </DashboardSection>

      {/* Aggregate charts */}
      <DashboardSection icon={<TrendingUp className="h-3.5 w-3.5" />} label="Tendencias del grupo" index={2}>
        {aggregates !== null ? (
          <AggregateCharts aggregates={aggregates} />
        ) : (
          <SectionError message="No se pudieron cargar los gráficos. Recargá la página." />
        )}
      </DashboardSection>

      {/* Client roster */}
      <DashboardSection icon={<Users className="h-3.5 w-3.5" />} label="Tus clientes" index={3}>
        {roster !== null ? (
          <ClientRoster items={roster} />
        ) : (
          <SectionError message="No se pudo cargar el listado de clientes. Recargá la página." />
        )}
      </DashboardSection>

      {/* Quick actions */}
      <DashboardSection icon={<Zap className="h-3.5 w-3.5" />} label="Acciones rápidas" index={4}>
        <QuickActionsBar />
      </DashboardSection>
    </DashboardShell>
  );
}
