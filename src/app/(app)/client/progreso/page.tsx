"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  TrendingDown,
  TrendingUp,
  Minus,
  Dumbbell,
  Activity,
  Trophy,
  Clock,
  Calendar,
  Zap,
} from "lucide-react";
import { useDemoUser } from "@/lib/demo/auth-context";
import {
  listMetricsForClient,
  listSessionsForClient,
} from "@/lib/demo/store";
import type { DemoMetricRow, DemoSessionRow } from "@/lib/offline/db";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function fmtLongDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function fmtTotalHours(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function statusLabel(status: DemoSessionRow["status"]): string {
  if (status === "COMPLETED") return "Completada";
  if (status === "IN_PROGRESS") return "En progreso";
  return "Abortada";
}

/** Count consecutive calendar weeks (Mon–Sun) that have at least 1 completed session. */
function calcStreak(sessions: DemoSessionRow[]): number {
  const completed = sessions.filter(
    (s) => s.status === "COMPLETED" && s.completedAt,
  );
  if (completed.length === 0) return 0;

  // Build a set of ISO week strings "YYYY-WW"
  function isoWeek(iso: string): string {
    const d = new Date(iso);
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const startOfWeek = new Date(jan4);
    startOfWeek.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
    const diff = d.getTime() - startOfWeek.getTime();
    const week = Math.floor(diff / (7 * 86400_000)) + 1;
    return `${d.getFullYear()}-${String(week).padStart(2, "0")}`;
  }

  const weeksWithSession = new Set(
    completed.map((s) => isoWeek(s.completedAt!)),
  );

  // Walk backwards from current week
  let streak = 0;
  const now = new Date();
  const checkDate = new Date(now);
  // align to start of current week (Monday)
  checkDate.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  for (let i = 0; i < 104; i++) {
    const wk = isoWeek(checkDate.toISOString());
    if (weeksWithSession.has(wk)) {
      streak++;
    } else {
      // Allow missing the current week if it just started
      if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 7);
        continue;
      }
      break;
    }
    checkDate.setDate(checkDate.getDate() - 7);
  }

  return streak;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface DeltaBadgeProps {
  delta: number | null;
  /** When true, a decrease is shown green (e.g. weight / waist / fat loss goals) */
  invertColors?: boolean;
  unit?: string;
}

function DeltaBadge({ delta, invertColors = false, unit = "" }: DeltaBadgeProps) {
  if (delta === null || delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-neutral-500">
        <Minus className="h-3 w-3" aria-hidden="true" />
        Sin cambio
      </span>
    );
  }

  const isPositive = delta > 0;
  // For weight/fat/waist: down is good (green), up is bad (red)
  // For muscle: up is good (green), down is bad (red)
  const isGood = invertColors ? !isPositive : isPositive;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
        isGood ? "text-success" : "text-danger"
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" aria-hidden="true" />
      ) : (
        <TrendingDown className="h-3 w-3" aria-hidden="true" />
      )}
      {isPositive ? "+" : ""}
      {delta.toFixed(1)}
      {unit}
    </span>
  );
}

interface SummaryCardProps {
  label: string;
  value: string | null;
  delta: number | null;
  invertColors?: boolean;
  unit?: string;
  emptyText?: string;
}

function SummaryCard({
  label,
  value,
  delta,
  invertColors,
  unit,
  emptyText = "—",
}: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className="text-xl font-bold tabular-nums text-neutral-100 leading-tight">
        {value ?? emptyText}
      </p>
      {value !== null && (
        <div className="mt-1">
          <DeltaBadge delta={delta} invertColors={invertColors} unit={unit} />
        </div>
      )}
    </div>
  );
}

interface WeightChartProps {
  metrics: DemoMetricRow[];
}

function WeightChart({ metrics }: WeightChartProps) {
  const points = metrics
    .filter((m) => m.weightKg !== null)
    .slice(-8) as (DemoMetricRow & { weightKg: number })[];

  if (points.length === 0) return null;

  const weights = points.map((p) => p.weightKg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
        Tendencia de peso
      </h2>
      <div className="flex items-end gap-1.5 h-20">
        {points.map((p) => {
          const heightPct = ((p.weightKg - minW) / range) * 70 + 15; // 15–85% range
          return (
            <div
              key={p.id}
              className="flex flex-1 flex-col items-center gap-1 group"
            >
              <div className="relative flex-1 w-full flex items-end">
                {/* Tooltip on hover */}
                <div
                  className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                  aria-hidden="true"
                >
                  {p.weightKg} kg
                </div>
                <div
                  className="w-full rounded-t-sm bg-[#FF6A1A]/70 hover:bg-[#FF6A1A] transition-colors"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-1.5 mt-1.5">
        {points.map((p) => (
          <p
            key={p.id}
            className="flex-1 text-center text-[9px] text-neutral-600 truncate"
          >
            {fmtShortDate(p.recordedAt)}
          </p>
        ))}
      </div>
      {/* Y-axis reference */}
      <div className="flex justify-between mt-2 text-[9px] text-neutral-700 tabular-nums">
        <span>{minW} kg</span>
        <span>{maxW} kg</span>
      </div>
    </div>
  );
}

interface StatChipProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatChip({ icon, label, value }: StatChipProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FF6A1A]/10 text-[#FF6A1A]">
        {icon}
      </div>
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-base font-bold tabular-nums text-neutral-100 leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

interface ActivityRowProps {
  session: DemoSessionRow;
  index: number;
}

function ActivityRow({ session, index }: ActivityRowProps) {
  const dateIso = session.completedAt ?? session.startedAt;
  const fatigue = session.subjectiveFatigue;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-neutral-800 last:border-0">
      {/* Day number badge */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-xs font-bold text-neutral-400">
        #{index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-100 truncate">
          {fmtLongDate(dateIso)}
        </p>
        <p
          className={`text-xs ${
            session.status === "COMPLETED"
              ? "text-success"
              : session.status === "IN_PROGRESS"
                ? "text-warning"
                : "text-neutral-500"
          }`}
        >
          {statusLabel(session.status)}
        </p>
      </div>

      {/* Duration */}
      {session.totalDurationSec !== null && (
        <p className="text-xs tabular-nums text-neutral-500 shrink-0">
          {fmtDuration(session.totalDurationSec)}
        </p>
      )}

      {/* Fatigue dots */}
      {fatigue !== null && (
        <div className="flex gap-0.5 shrink-0" aria-label={`Fatiga: ${fatigue}/5`}>
          {[1, 2, 3, 4, 5].map((dot) => (
            <span
              key={dot}
              className={`block h-2 w-2 rounded-full ${
                dot <= fatigue
                  ? fatigue <= 2
                    ? "bg-success"
                    : fatigue <= 3
                      ? "bg-warning"
                      : "bg-danger"
                  : "bg-neutral-700"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientProgresoPage() {
  const user = useDemoUser();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DemoMetricRow[]>([]);
  const [sessions, setSessions] = useState<DemoSessionRow[]>([]);

  useEffect(() => {
    Promise.all([
      listMetricsForClient(user.id),
      listSessionsForClient(user.id),
    ]).then(([m, s]) => {
      // metrics already sorted asc by listMetricsForClient
      setMetrics(m);
      // sessions sorted desc for the feed
      const sorted = [...s].sort((a, b) => {
        const da = a.completedAt ?? a.startedAt;
        const db_ = b.completedAt ?? b.startedAt;
        return db_.localeCompare(da);
      });
      setSessions(sorted);
      setLoading(false);
    });
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────

  const firstMetric = metrics[0] ?? null;
  const lastMetric = metrics[metrics.length - 1] ?? null;

  function numDelta(
    field: keyof Pick<
      DemoMetricRow,
      "weightKg" | "bodyFatPct" | "muscleMassKg" | "waistCm"
    >,
  ): number | null {
    if (!firstMetric || !lastMetric) return null;
    const a = firstMetric[field];
    const b = lastMetric[field];
    if (a === null || b === null) return null;
    return (b as number) - (a as number);
  }

  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");

  const nowMs = Date.now();
  const sevenDaysAgo = new Date(nowMs - 7 * 86400_000).toISOString();
  const thisWeekCount = completedSessions.filter(
    (s) => (s.completedAt ?? s.startedAt) >= sevenDaysAgo,
  ).length;

  const streak = calcStreak(sessions);

  const prCount = sessions.reduce((acc, s) => {
    return acc + s.setsJson.filter((set) => set.isPr).length;
  }, 0);

  const totalDurationSec = completedSessions.reduce(
    (acc, s) => acc + (s.totalDurationSec ?? 0),
    0,
  );

  const recentSessions = sessions.slice(0, 5);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-50">Progreso</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Composición corporal y actividad de entrenamiento
        </p>
      </div>

      {/* 1. Summary cards */}
      {metrics.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 py-10 text-center empty-state-pattern">
          <Activity className="h-9 w-9 text-neutral-700 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-neutral-500">
            Aún no hay mediciones. Tu entrenador registrará tu composición
            corporal.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard
              label="Peso"
              value={lastMetric?.weightKg != null ? `${lastMetric.weightKg} kg` : null}
              delta={numDelta("weightKg")}
              invertColors
              unit=" kg"
            />
            <SummaryCard
              label="% Grasa"
              value={lastMetric?.bodyFatPct != null ? `${lastMetric.bodyFatPct}%` : null}
              delta={numDelta("bodyFatPct")}
              invertColors
              unit="%"
            />
            <SummaryCard
              label="Masa muscular"
              value={lastMetric?.muscleMassKg != null ? `${lastMetric.muscleMassKg} kg` : null}
              delta={numDelta("muscleMassKg")}
              unit=" kg"
            />
            <SummaryCard
              label="Cintura"
              value={lastMetric?.waistCm != null ? `${lastMetric.waistCm} cm` : null}
              delta={numDelta("waistCm")}
              invertColors
              unit=" cm"
            />
          </div>

          {/* 2. Weight trend chart */}
          <WeightChart metrics={metrics} />
        </>
      )}

      {/* 3. Training stats */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
          Estadísticas de entrenamiento
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatChip
            icon={<Dumbbell className="h-4 w-4" aria-hidden="true" />}
            label="Sesiones completadas"
            value={String(completedSessions.length)}
          />
          <StatChip
            icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
            label="Esta semana"
            value={String(thisWeekCount)}
          />
          <StatChip
            icon={<Zap className="h-4 w-4" aria-hidden="true" />}
            label="Racha actual"
            value={streak === 0 ? "—" : `${streak} sem.`}
          />
          <StatChip
            icon={<Trophy className="h-4 w-4" aria-hidden="true" />}
            label="PRs logrados"
            value={String(prCount)}
          />
          <StatChip
            icon={<Clock className="h-4 w-4" aria-hidden="true" />}
            label="Tiempo total"
            value={totalDurationSec > 0 ? fmtTotalHours(totalDurationSec) : "—"}
          />
        </div>
      </div>

      {/* 4. Recent activity feed */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
          Actividad reciente
        </h2>
        {recentSessions.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 py-10 text-center">
            <Dumbbell className="h-9 w-9 text-neutral-700 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-neutral-500">
              No hay sesiones registradas todavía.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4">
            {recentSessions.map((s, i) => (
              <ActivityRow key={s.id} session={s} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
