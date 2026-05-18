"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  getDashboardKPIs,
  getDashboardCalendarEvents,
  getDashboardRoster,
  getDashboardAggregates,
  getDashboardAlerts,
} from "@/app/actions/trainer-dashboard";
import { TrainerDashboard } from "./trainer-dashboard";
import type {
  DashboardKPIBand,
  DashboardCalendar,
  DashboardRosterItem,
  DashboardAggregates,
  DashboardAlert,
  DashboardFilters,
} from "@/types/dashboard";

// Default filters for demo mode — 30d window, no client/goal/parq filters.
function buildDefaultFilters(): DashboardFilters {
  const toDate = new Date();
  toDate.setHours(23, 59, 59, 999);
  const fromDate = new Date(toDate.getTime() - 29 * 86400000);
  fromDate.setHours(0, 0, 0, 0);
  return { fromDate, toDate, clientIds: null, goals: null, parqStatuses: null };
}

interface DashboardState {
  kpis: DashboardKPIBand | null;
  calendar: DashboardCalendar | null;
  roster: DashboardRosterItem[] | null;
  aggregates: DashboardAggregates | null;
  alerts: DashboardAlert[] | null;
}

interface TrainerDashboardClientProps {
  trainerName: string;
}

export function TrainerDashboardClient({ trainerName }: TrainerDashboardClientProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardState>({
    kpis: null,
    calendar: null,
    roster: null,
    aggregates: null,
    alerts: null,
  });

  const filters = buildDefaultFilters();

  useEffect(() => {
    Promise.all([
      getDashboardKPIs(filters),
      getDashboardCalendarEvents(),
      getDashboardRoster(filters),
      getDashboardAggregates(filters),
      getDashboardAlerts(),
    ]).then(([kpisResult, calendarResult, rosterResult, aggregatesResult, alertsResult]) => {
      setData({
        kpis: kpisResult.ok ? kpisResult.value : null,
        calendar: calendarResult.ok ? calendarResult.value : null,
        roster: rosterResult.ok ? rosterResult.value : null,
        aggregates: aggregatesResult.ok ? aggregatesResult.value : null,
        alerts: alertsResult.ok ? alertsResult.value : null,
      });
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6A1A]" aria-label="Cargando dashboard" />
      </div>
    );
  }

  return (
    <TrainerDashboard
      trainerName={trainerName}
      filters={filters}
      kpis={data.kpis}
      calendar={data.calendar}
      roster={data.roster}
      aggregates={data.aggregates}
      alerts={data.alerts}
    />
  );
}
