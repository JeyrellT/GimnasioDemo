"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  CheckCircle2,
  Calendar,
  Timer,
  Trophy,
  Dumbbell,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getMySessionHistory } from "@/app/actions/client-portal";
import type { MySessionSummary } from "@/server/actions/client-portal.actions";
import { MeasurementsProgress } from "./_components/measurements-progress";

type ProgressTab = "entrenamientos" | "medidas";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-CR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatDateShort(value: Date | string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-CR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return String(value);
  }
}

/**
 * Group key: each "Día N" of the assigned routine collapses into one group,
 * and free workouts collapse into a separate "Libre" group. Within the group,
 * every WorkoutSession is one "set" (one repetition of that day).
 *
 * `sessions` arrives ordered by startedAt DESC from the server, so the first
 * item in each group is the most recent execution.
 */
interface DayGroup {
  key: string;
  label: string;
  isFreeWorkout: boolean;
  dayIndex: number | null;
  sessions: MySessionSummary[];
  totalMinutes: number;
}

function groupSessionsByDay(sessions: MySessionSummary[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const session of sessions) {
    const key = session.isFreeWorkout
      ? "free"
      : `day-${session.dayIndex ?? 0}`;
    const minutes = Math.round((session.totalDurationSec ?? 0) / 60);

    const existing = groups.get(key);
    if (existing) {
      existing.sessions.push(session);
      existing.totalMinutes += minutes;
    } else {
      groups.set(key, {
        key,
        label: session.isFreeWorkout
          ? "Entrenamiento libre"
          : `Día ${(session.dayIndex ?? 0) + 1}`,
        isFreeWorkout: session.isFreeWorkout,
        dayIndex: session.dayIndex,
        sessions: [session],
        totalMinutes: minutes,
      });
    }
  }

  // Ordered: numbered days ASC first, free workouts last.
  return Array.from(groups.values()).sort((a, b) => {
    if (a.isFreeWorkout && !b.isFreeWorkout) return 1;
    if (!a.isFreeWorkout && b.isFreeWorkout) return -1;
    return (a.dayIndex ?? 0) - (b.dayIndex ?? 0);
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KpiCardProps {
  value: number;
  label: string;
}

function KpiCard({ value, label }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-center">
      <p className="text-2xl font-bold tabular-nums text-brand-primary">
        {value}
      </p>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
  );
}

interface SessionSetRowProps {
  session: MySessionSummary;
  setNumber: number;
}

function SessionSetRow({ session, setNumber }: SessionSetRowProps) {
  const durationMin =
    session.totalDurationSec !== null
      ? Math.round(session.totalDurationSec / 60)
      : null;

  return (
    <div className="ml-3 flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-primary/40 bg-brand-primary/10 text-[11px] font-semibold tabular-nums text-brand-primary">
        {setNumber}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-neutral-300 truncate">
          Set {setNumber}
        </p>
        <p className="text-[11px] text-neutral-500">
          {formatDateShort(session.completedAt)}
        </p>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-neutral-500 shrink-0">
        {durationMin !== null && (
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3 w-3" aria-hidden="true" />
            {durationMin} min
          </span>
        )}
      </div>
    </div>
  );
}

interface DayGroupRowProps {
  group: DayGroup;
}

function DayGroupRow({ group }: DayGroupRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const setsCount = group.sessions.length;
  const latestSession = group.sessions[0];

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-left transition-colors hover:border-neutral-700"
      >
        <CheckCircle2
          className="h-4 w-4 shrink-0 text-emerald-400"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-200 truncate">
            {group.label}
          </p>
          <p className="text-xs text-neutral-500">
            Última: {formatDate(latestSession?.completedAt ?? null)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="inline-flex items-center gap-1 text-neutral-500">
            <Timer className="h-3 w-3" aria-hidden="true" />
            {group.totalMinutes} min
          </span>
          <span className="rounded-full border border-brand-primary/40 bg-brand-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-primary">
            {setsCount} {setsCount === 1 ? "set" : "sets"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-neutral-500 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {group.sessions.map((session, idx) => (
            // Sessions arrive ordered DESC (most recent first). Set 1 is the
            // first time the client ever did this day; Set N is the most
            // recent. We render most-recent at the top, so its number is N.
            <SessionSetRow
              key={session.id}
              session={session}
              setNumber={group.sessions.length - idx}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClientProgresoPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [tab, setTab] = useState<ProgressTab>("entrenamientos");

  const sessionsQuery = useQuery<MySessionSummary[]>({
    queryKey: ["client-sessions-history", userId],
    queryFn: async () => {
      const r = await getMySessionHistory();
      if (!r.ok) throw new Error(r.error.message);
      return r.value;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
    enabled: Boolean(userId),
  });

  const sessions = sessionsQuery.data ?? [];
  const groups = groupSessionsByDay(sessions);

  const uniqueDays = groups.length;
  const totalSets = sessions.length;
  const totalMinutes = sessions.reduce(
    (sum, s) => sum + Math.round((s.totalDurationSec ?? 0) / 60),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/15">
          <Trophy className="h-5 w-5 text-brand-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-50">Progreso</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {tab === "medidas"
              ? "Tu avance de medidas corporales"
              : "Tu historial de entrenamiento"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Tipo de progreso"
        className="flex border-b border-neutral-800"
      >
        {(
          [
            { id: "entrenamientos", label: "Entrenamientos" },
            { id: "medidas", label: "Medidas" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-[-2px] ${
              tab === t.id
                ? "border-b-2 border-brand-primary text-neutral-50"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "medidas" ? (
        <MeasurementsProgress userId={userId} />
      ) : sessionsQuery.isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
        </div>
      ) : (
        <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          value={uniqueDays}
          label={uniqueDays === 1 ? "Día" : "Días"}
        />
        <KpiCard
          value={totalSets}
          label={totalSets === 1 ? "Set total" : "Sets totales"}
        />
        <KpiCard value={totalMinutes} label="Minutos" />
      </div>

      {/* Empty state */}
      {sessions.length === 0 ? (
        <div className="py-12 text-center">
          <div className="flex justify-center mb-3">
            <Calendar
              className="h-10 w-10 text-neutral-700"
              aria-hidden="true"
            />
          </div>
          <p className="text-sm text-neutral-500">
            Aún no tenés sesiones completadas.
          </p>
          <p className="text-xs text-neutral-600 mt-1">
            Completá tu primera sesión para ver tu progreso aquí.
          </p>
        </div>
      ) : (
        /* Historial agrupado por día */
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Dumbbell
              className="h-4 w-4 text-brand-primary"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-neutral-300">
              Historial
            </h2>
            <span className="ml-auto text-[11px] text-neutral-500">
              Tocá un día para ver los sets
            </span>
          </div>
          <div className="space-y-2">
            {groups.map((group) => (
              <DayGroupRow key={group.key} group={group} />
            ))}
          </div>
        </section>
      )}
        </div>
      )}
    </div>
  );
}
