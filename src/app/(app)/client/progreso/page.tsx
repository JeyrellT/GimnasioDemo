"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  CheckCircle2,
  Calendar,
  Timer,
  Trophy,
  Dumbbell,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getMySessionHistory } from "@/app/actions/client-portal";
import type { MySessionSummary } from "@/server/actions/client-portal.actions";

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

interface SessionRowProps {
  session: MySessionSummary;
}

function SessionRow({ session }: SessionRowProps) {
  const label = session.isFreeWorkout
    ? "Entrenamiento libre"
    : `Día ${(session.dayIndex ?? 0) + 1}`;
  const durationMin =
    session.totalDurationSec !== null
      ? Math.round(session.totalDurationSec / 60)
      : null;

  return (
    <Link
      href={`/client/sesion/${session.id}`}
      className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 transition-colors hover:border-neutral-700"
    >
      <CheckCircle2
        className="h-4 w-4 shrink-0 text-emerald-400"
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-200 truncate">{label}</p>
        <p className="text-xs text-neutral-500">
          {formatDate(session.completedAt)}
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs text-neutral-500 shrink-0">
        {durationMin !== null && (
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3 w-3" aria-hidden="true" />
            {durationMin} min
          </span>
        )}
        <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
          {session._count.performedSets}{" "}
          {session._count.performedSets === 1 ? "set" : "sets"}
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClientProgresoPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

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

  if (sessionsQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  const sessions = sessionsQuery.data ?? [];

  const totalSets = sessions.reduce(
    (sum, s) => sum + s._count.performedSets,
    0,
  );
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
            Tu historial de entrenamiento
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          value={sessions.length}
          label={sessions.length === 1 ? "Sesión" : "Sesiones"}
        />
        <KpiCard value={totalSets} label="Sets totales" />
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
        /* Historial */
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Dumbbell
              className="h-4 w-4 text-brand-primary"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-neutral-300">
              Historial
            </h2>
          </div>
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
