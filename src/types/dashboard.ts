// =============================================================================
// FORJA — Dashboard-specific TypeScript interfaces
// Owner: backend-api.
//
// Consumed by:
//   - src/app/actions/trainer-dashboard.ts  (producer)
//   - Frontend agents 5-8 (consumers — contract is LOCKED after handoff)
//
// Rules:
//   - No Prisma.Decimal: all numeric fields are plain `number`.
//   - All Date fields that cross the RSC boundary are ISO 8601 strings.
//   - Enums (Goal, ParqStatus, MuscleGroup) imported from @prisma/client.
// =============================================================================

import type { Goal, ParqStatus, MuscleGroup } from "@prisma/client";

// ── Filter shape (URL or computed from URL) ───────────────────────────────────

export interface DashboardFilters {
  /** Inclusive start of observation window */
  fromDate: Date;
  /** Inclusive end of observation window */
  toDate: Date;
  /** null = all active clients of this trainer */
  clientIds: string[] | null;
  /** null = all goals */
  goals: Goal[] | null;
  /** null = all PAR-Q statuses */
  parqStatuses: ParqStatus[] | null;
}

// ── Single KPI ────────────────────────────────────────────────────────────────

export interface DashboardKPI {
  label: string;
  value: number;
  unit: string; // "" if none
  /** delta vs previous comparable window. null = no comparison available */
  delta: number | null;
  /** Spanish label for the comparison, e.g. "vs hace 30 días" */
  deltaLabel: string | null;
  /** 7-30 numeric points; empty array if not enough data */
  sparklineData: number[];
  /** semantic color: good = green, bad = red, neutral = gray */
  goalAlignment: "good" | "bad" | "neutral";
}

// ── KPI Hero Band (5 cards) ───────────────────────────────────────────────────

export interface DashboardKPIBand {
  activeClients: DashboardKPI;
  groupAdherence: DashboardKPI;
  sessionsThisWeek: DashboardKPI;
  routinesEnding14d: DashboardKPI;
  openAlerts: DashboardKPI;
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export type CalendarEventType =
  | "session_completed"
  | "session_today"
  | "routine_ending";

export interface DashboardCalendarEvent {
  id: string; // session id or assigned-routine id
  type: CalendarEventType;
  clientId: string;
  clientName: string;
  /** ISO 8601 date (date-only or datetime) */
  date: string;
  title: string; // already in es-CR voseo
  /** Optional time HH:mm for sessions */
  time?: string;
}

export interface CalendarHeatDay {
  /** YYYY-MM-DD */
  date: string;
  eventCount: number;
  intensity: "none" | "low" | "medium" | "high";
}

export interface DashboardCalendar {
  /** 14 days from today (today = heatmap[0]) */
  heatmap: CalendarHeatDay[];
  /** All events in window, sorted ascending by date */
  events: DashboardCalendarEvent[];
}

// ── Alerts (derived, no DB table) ─────────────────────────────────────────────

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertTrigger =
  | "parq_red"
  | "parq_review"
  | "no_session_14d"
  | "weight_plateau"
  | "routine_ending_7d"
  | "no_measurement_30d";

export interface DashboardAlert {
  /** Deterministic id: hash(clientId + trigger) */
  id: string;
  clientId: string;
  clientName: string;
  severity: AlertSeverity;
  trigger: AlertTrigger;
  message: string; // es-CR voseo, ready to display
  /** Path to drill into (e.g. /trainer/clientes/abc123) */
  actionUrl?: string;
}

// ── Roster ────────────────────────────────────────────────────────────────────

export interface DashboardRosterItem {
  clientId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** 0-100 ; null when no active routine */
  adherencePct7d: number | null;
  lastSessionAt: string | null; // ISO 8601
  parqStatus: ParqStatus;
  goal: Goal | null;
  /** Total active alerts for this client */
  alertCount: number;
  /** Active routine name, null if none */
  activeRoutineName: string | null;
}

// ── Aggregate charts ──────────────────────────────────────────────────────────

export interface ClientAdherenceData {
  clientId: string;
  clientName: string;
  /** 0-100 */
  adherencePct: number;
  sessionsCompleted: number;
  sessionsExpected: number;
}

export interface DashboardAdherenceChart {
  /** Sorted by adherencePct desc, top 10 */
  data: ClientAdherenceData[];
}

export interface WeightTrendPoint {
  weekStart: string; // YYYY-MM-DD
  avgKg: number;
  /** 25th percentile across clients in this week */
  p25Kg: number;
  /** 75th percentile across clients in this week */
  p75Kg: number;
  /** Count of clients contributing data */
  clientCount: number;
}

export interface DashboardWeightTrend {
  data: WeightTrendPoint[];
  metric: "weight" | "bodyFat" | "muscleMass"; // default "weight"
}

export interface VolumeByMuscleData {
  muscle: MuscleGroup;
  totalSets: number;
  totalVolumeKg: number; // sum(weightKg * reps)
  exerciseCount: number;
}

export interface DashboardVolumeByMuscle {
  data: VolumeByMuscleData[];
}

export interface DashboardAggregates {
  adherenceChart: DashboardAdherenceChart;
  weightTrend: DashboardWeightTrend;
  volumeByMuscle: DashboardVolumeByMuscle;
}

// ── Top-level payload (used by integration agent) ─────────────────────────────

export interface DashboardPayload {
  kpis: DashboardKPIBand;
  calendar: DashboardCalendar;
  alerts: DashboardAlert[];
  roster: DashboardRosterItem[];
  aggregates: DashboardAggregates;
}
