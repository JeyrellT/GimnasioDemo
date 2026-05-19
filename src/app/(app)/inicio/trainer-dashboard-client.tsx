"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getDashboardKPIs,
  getDashboardCalendarEvents,
  getDashboardRoster,
  getDashboardAggregates,
  getDashboardAlerts,
} from "@/app/actions/trainer-dashboard";
import { TrainerDashboard } from "./trainer-dashboard";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";
import type {
  DashboardKPIBand,
  DashboardCalendar,
  DashboardRosterItem,
  DashboardAggregates,
  DashboardAlert,
  DashboardFilters,
} from "@/types/dashboard";
import type { Goal, ParqStatus } from "@prisma/client";

/** Build filters from URL searchParams so the effect can re-run on changes. */
function buildFiltersFromParams(searchParams: URLSearchParams): DashboardFilters {
  const toDate = new Date();
  toDate.setHours(23, 59, 59, 999);

  const rangeParam = searchParams.get("range") ?? "30d";
  const rangeMap: Record<string, number> = { today: 0, "7d": 6, "30d": 29, "90d": 89 };
  const days = rangeMap[rangeParam] ?? 29;

  const fromDate = new Date(toDate.getTime() - days * 86400000);
  fromDate.setHours(0, 0, 0, 0);

  const goalsRaw = searchParams.get("goals")?.split(",").filter(Boolean) ?? [];
  const parqRaw = searchParams.get("parqStatuses")?.split(",").filter(Boolean) ?? [];

  return {
    fromDate,
    toDate,
    clientIds: null,
    goals: goalsRaw.length > 0 ? (goalsRaw as Goal[]) : null,
    parqStatuses: parqRaw.length > 0 ? (parqRaw as ParqStatus[]) : null,
  };
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
  const searchParams = useSearchParams();
  // Stable string dep — re-runs the effect only when the query string actually changes.
  const searchParamsString = searchParams.toString();

  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>(() =>
    buildFiltersFromParams(searchParams),
  );
  const [data, setData] = useState<DashboardState>({
    kpis: null,
    calendar: null,
    roster: null,
    aggregates: null,
    alerts: null,
  });

  useEffect(() => {
    const currentFilters = buildFiltersFromParams(new URLSearchParams(searchParamsString));
    setFilters(currentFilters);
    setLoading(true);

    Promise.all([
      getDashboardKPIs(currentFilters),
      getDashboardCalendarEvents(),
      getDashboardRoster(currentFilters),
      getDashboardAggregates(currentFilters),
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
  }, [searchParamsString]); // eslint-disable-line react-hooks/exhaustive-deps -- searchParams object identity is not stable; string snapshot is the correct dep

  if (loading) {
    return <DashboardSkeleton />;
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
