// =============================================================================
// BLACKLINE FITNESS — Dashboard private query helpers (DEMO STUB)
// Owner: backend-api.
//
// In demo mode, all Prisma queries are replaced with empty stubs.
// These functions are not directly called in demo build — the demo actions
// (src/lib/demo/actions/dashboard.ts) bypass this file entirely.
// =============================================================================

import type { AssignedRoutine, Goal, ParqStatus } from "@prisma/client";
import type {
  DashboardAlert,
  DashboardFilters,
} from "@/types/dashboard";
import {
  toDateString,
  startOfWeek,
  daysBetween,
  alertId,
  percentile,
} from "./formatters";

// =============================================================================
// Types used internally
// =============================================================================

export interface ActiveClientRow {
  clientId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  parqStatus: ParqStatus;
  goal: Goal | null;
  lastSessionAt: Date | null;
  activeRoutineId: string | null;
  activeRoutineName: string | null;
  activeRoutineEndsOn: Date | null;
  activeRoutineStartsOn: Date | null;
  activeRoutineDurationWeeks: number | null;
  activeRoutineSplitDays: number | null;
}

// =============================================================================
// Core helper: fetch all active clients for a trainer (demo stub)
// =============================================================================

export async function getActiveClientsForTrainer(
  _trainerId: string,
  _filters: Pick<DashboardFilters, "clientIds" | "goals" | "parqStatuses">,
): Promise<ActiveClientRow[]> {
  return [];
}

// =============================================================================
// Adherence computation (demo stub)
// =============================================================================

export async function computeAdherence(
  _clientUserId: string,
  _fromDate: Date,
  _toDate: Date,
): Promise<number | null> {
  return null;
}

// =============================================================================
// Routine end date computation
// =============================================================================

export function getRoutineEndDate(ar: {
  endsOn: Date | null;
  startsOn: Date;
  routineTemplate?: { durationWeeks: number } | null;
}): Date | null {
  if (ar.endsOn) return ar.endsOn;
  if (ar.routineTemplate?.durationWeeks != null) {
    return new Date(
      ar.startsOn.getTime() + ar.routineTemplate.durationWeeks * 7 * 24 * 60 * 60 * 1000,
    );
  }
  return null;
}

export function getRoutineEndDateFromRow(row: {
  activeRoutineEndsOn: Date | null;
  activeRoutineStartsOn: Date | null;
  activeRoutineDurationWeeks: number | null;
}): Date | null {
  if (!row.activeRoutineStartsOn) return row.activeRoutineEndsOn;
  return getRoutineEndDate({
    endsOn: row.activeRoutineEndsOn,
    startsOn: row.activeRoutineStartsOn,
    routineTemplate: row.activeRoutineDurationWeeks != null
      ? { durationWeeks: row.activeRoutineDurationWeeks }
      : null,
  });
}

// =============================================================================
// Alert derivation helpers (pure, no DB — kept as-is)
// =============================================================================

export function derivePARQAlerts(clients: ActiveClientRow[]): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  for (const c of clients) {
    if (c.parqStatus === "RED") {
      alerts.push({
        id: alertId(c.clientId, "parq_red"),
        clientId: c.clientId,
        clientName: c.name,
        severity: "critical",
        trigger: "parq_red",
        message: `${c.name}: PAR-Q en rojo — revisá antes de entrenar`,
        actionUrl: `/trainer/clientes/${c.clientId}`,
      });
    } else if (c.parqStatus === "REVIEW") {
      alerts.push({
        id: alertId(c.clientId, "parq_review"),
        clientId: c.clientId,
        clientName: c.name,
        severity: "warning",
        trigger: "parq_review",
        message: `${c.name}: PAR-Q pendiente de revisión`,
        actionUrl: `/trainer/clientes/${c.clientId}`,
      });
    }
  }
  return alerts;
}

export function deriveSessionAlerts(
  clients: ActiveClientRow[],
  today: Date,
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const threshold = 14 * 24 * 60 * 60 * 1000;

  for (const c of clients) {
    if (!c.activeRoutineId) continue;
    const lastSession = c.lastSessionAt;
    const msAgo = lastSession ? today.getTime() - lastSession.getTime() : Infinity;
    if (msAgo >= threshold) {
      const daysAgo = lastSession ? Math.floor(msAgo / (1000 * 60 * 60 * 24)) : null;
      const timeLabel = daysAgo ? `hace ${daysAgo} días` : "nunca";
      alerts.push({
        id: alertId(c.clientId, "no_session_14d"),
        clientId: c.clientId,
        clientName: c.name,
        severity: "warning",
        trigger: "no_session_14d",
        message: `${c.name} sin entrenar ${timeLabel}`,
        actionUrl: `/trainer/clientes/${c.clientId}`,
      });
    }
  }
  return alerts;
}

export function deriveRoutineEndingAlerts(
  clients: ActiveClientRow[],
  today: Date,
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  for (const c of clients) {
    if (!c.activeRoutineId) continue;
    const endDate = getRoutineEndDateFromRow(c);
    if (!endDate) continue;
    const msUntilEnd = endDate.getTime() - today.getTime();
    if (msUntilEnd >= 0 && msUntilEnd <= sevenDaysMs) {
      const daysLeft = Math.ceil(msUntilEnd / (1000 * 60 * 60 * 24));
      alerts.push({
        id: alertId(c.clientId, "routine_ending_7d"),
        clientId: c.clientId,
        clientName: c.name,
        severity: "info",
        trigger: "routine_ending_7d",
        message: `${c.name}: rutina termina en ${daysLeft} ${daysLeft === 1 ? "día" : "días"}`,
        actionUrl: `/trainer/clientes/${c.clientId}`,
      });
    }
  }
  return alerts;
}

export async function deriveWeightPlateauAlerts(
  _clients: ActiveClientRow[],
): Promise<DashboardAlert[]> {
  return [];
}

export async function deriveNoMeasurementAlerts(
  _clients: ActiveClientRow[],
  _today: Date,
): Promise<DashboardAlert[]> {
  return [];
}

// =============================================================================
// KPI sparkline helpers (demo stubs)
// =============================================================================

export async function getActiveClientsSparkline(_trainerId: string): Promise<number[]> {
  return Array(12).fill(0) as number[];
}

export async function getDailySessionSparkline(
  _clientIds: string[],
  days = 30,
): Promise<number[]> {
  return Array(days).fill(0) as number[];
}

export async function getWeeklySessionSparkline(
  _clientIds: string[],
): Promise<number[]> {
  return Array(28).fill(0) as number[];
}

// =============================================================================
// Calendar helpers (demo stubs)
// =============================================================================

export interface CalendarRawSession {
  id: string;
  clientId: string;
  clientName: string;
  completedAt: Date;
}

export interface CalendarRawRoutineEnding {
  id: string;
  clientId: string;
  clientName: string;
  endDate: Date;
  routineName: string;
}

export async function getCalendarSessions(
  _trainerId: string,
  _from: Date,
  _to: Date,
): Promise<CalendarRawSession[]> {
  return [];
}

export async function getCalendarRoutineEndings(
  _trainerId: string,
  _from: Date,
  _to: Date,
): Promise<CalendarRawRoutineEnding[]> {
  return [];
}

// =============================================================================
// Weight trend helpers (demo stubs)
// =============================================================================

export interface WeightMetricRow {
  clientUserId: string;
  weightKg: number;
  recordedAt: Date;
}

export async function getWeightMetrics(
  _clientIds: string[],
  _fromDate: Date,
  _toDate: Date,
): Promise<WeightMetricRow[]> {
  return [];
}

export function groupWeightByWeek(
  rows: WeightMetricRow[],
): Array<{
  weekStart: string;
  avgKg: number;
  p25Kg: number;
  p75Kg: number;
  clientCount: number;
}> {
  const weekMap = new Map<
    string,
    { weights: number[]; clients: Set<string> }
  >();

  for (const row of rows) {
    const ws = toDateString(startOfWeek(row.recordedAt));
    let bucket = weekMap.get(ws);
    if (!bucket) {
      bucket = { weights: [], clients: new Set() };
      weekMap.set(ws, bucket);
    }
    bucket.weights.push(row.weightKg);
    bucket.clients.add(row.clientUserId);
  }

  const result: Array<{ weekStart: string; avgKg: number; p25Kg: number; p75Kg: number; clientCount: number }> = [];
  for (const [weekStart, bucket] of weekMap.entries()) {
    const sorted = [...bucket.weights].sort((a, b) => a - b);
    const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    result.push({
      weekStart,
      avgKg: Math.round(avg * 10) / 10,
      p25Kg: Math.round(percentile(sorted, 25) * 10) / 10,
      p75Kg: Math.round(percentile(sorted, 75) * 10) / 10,
      clientCount: bucket.clients.size,
    });
  }

  return result.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// =============================================================================
// Volume by muscle helpers (demo stubs)
// =============================================================================

export interface VolumeSetRow {
  primaryMuscle: string;
  weightKg: number | null;
  reps: number | null;
}

export async function getVolumeSetRows(
  _clientIds: string[],
  _fromDate: Date,
  _toDate: Date,
): Promise<VolumeSetRow[]> {
  return [];
}
