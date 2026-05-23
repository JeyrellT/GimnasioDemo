"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Dumbbell,
  Scale,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Ruler,
} from "lucide-react";
import {
  getMyActiveRoutine,
  getMySessionHistory,
  getMyMetrics,
} from "@/app/actions/client-portal";
import type {
  MyBodyMetric,
  MySessionSummary,
} from "@/server/actions/client-portal.actions";

interface Props {
  userId: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días,";
  if (h < 18) return "Buenas tardes,";
  return "Buenas noches,";
}

function formatShortDate(d: Date | string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("es-CR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "—";
  }
}

function daysBetween(a: Date | string, b: Date | string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round(Math.abs(db - da) / (1000 * 60 * 60 * 24));
}

function formatDelta(delta: number, unit: string): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} ${unit}`;
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

interface DeltaTagProps {
  delta: number | null;
  unit: string;
  /** When provided, shown as caption ("hace 7 días"). */
  caption?: string;
}

function DeltaTag({ delta, unit, caption }: DeltaTagProps) {
  if (delta === null) return null;

  const isZero = Math.abs(delta) < 0.05;
  const Icon = isZero ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  // Neutral colors — we don't assume goal direction (weight loss vs muscle
  // gain), the trainer interprets context.
  const color = isZero
    ? "text-neutral-500"
    : delta > 0
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div className={`mt-1 inline-flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span className="tabular-nums">{formatDelta(delta, unit)}</span>
      {caption && (
        <span className="text-[10px] text-neutral-600">{caption}</span>
      )}
    </div>
  );
}

interface MeasurementRowProps {
  label: string;
  latest: number | null;
  previous: number | null;
  unit: string;
}

function MeasurementRow({ label, latest, previous, unit }: MeasurementRowProps) {
  if (latest === null && previous === null) return null;

  const delta =
    latest !== null && previous !== null ? latest - previous : null;

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-neutral-500">{label}</span>
      <div className="flex items-center gap-2 text-right">
        <span className="text-sm font-medium tabular-nums text-neutral-100">
          {latest !== null ? `${latest.toFixed(1)} ${unit}` : "—"}
        </span>
        {delta !== null && Math.abs(delta) >= 0.05 && (
          <span
            className={`text-[11px] tabular-nums ${
              delta > 0 ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {formatDelta(delta, unit)}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ClientDashboardClient({ userId, name }: Props) {
  const greeting = getGreeting();
  const firstName = name.split(" ")[0];

  const routineQuery = useQuery({
    queryKey: ["client-active-routine", userId],
    queryFn: async () => {
      const r = await getMyActiveRoutine();
      if (!r.ok) throw new Error(r.error.message);
      return r.value;
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const sessionsQuery = useQuery<MySessionSummary[]>({
    queryKey: ["client-sessions-history", userId],
    queryFn: async () => {
      const r = await getMySessionHistory();
      if (!r.ok) throw new Error(r.error.message);
      return r.value;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const metricsQuery = useQuery<MyBodyMetric[]>({
    queryKey: ["client-metrics", userId],
    queryFn: async () => {
      const r = await getMyMetrics();
      if (!r.ok) throw new Error(r.error.message);
      return r.value;
    },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const isLoading =
    routineQuery.isLoading ||
    sessionsQuery.isLoading ||
    metricsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  const activeRoutine = routineQuery.data ?? null;
  const sessions = sessionsQuery.data ?? [];
  const metrics = metricsQuery.data ?? [];

  // Sessions already filtered to COMPLETED by the server action.
  const totalCompleted = sessions.length;
  const recentSessions = sessions.slice(0, 3);
  const lastSessionAt = sessions[0]?.completedAt ?? null;

  // Latest + previous body metric for comparative deltas.
  const latest = metrics[0] ?? null;
  const previous = metrics[1] ?? null;
  const weightDelta =
    latest?.weightKg != null && previous?.weightKg != null
      ? latest.weightKg - previous.weightKg
      : null;
  const daysSincePrev =
    latest && previous
      ? daysBetween(previous.recordedAt, latest.recordedAt)
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-neutral-500">{greeting}</p>
        <h1 className="text-2xl font-bold text-neutral-50">{firstName}</h1>
      </div>

      {/* Active routine */}
      {activeRoutine && (
        <Link
          href="/client/rutinas"
          className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-brand-primary/40"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-brand-primary uppercase tracking-wider">
                Rutina activa
              </p>
              <p className="text-lg font-semibold text-neutral-100">
                Tu rutina del día
              </p>
              <p className="text-sm text-neutral-500">
                Tocá para empezar tu sesión
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/15">
              <Dumbbell className="h-5 w-5 text-brand-primary" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm font-medium text-brand-primary">
            Ir a la sesión <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      )}

      {/* Stats: sesiones + último peso (con delta vs anterior) */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/client/progreso"
          className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-700"
        >
          <Target className="h-4 w-4 text-neutral-500 mb-2" />
          <p className="text-2xl font-bold tabular-nums text-neutral-50">
            {totalCompleted}
          </p>
          <p className="text-xs text-neutral-500">
            Sesi{totalCompleted === 1 ? "ón completada" : "ones completadas"}
          </p>
          {lastSessionAt && (
            <p className="mt-1 text-[10px] text-neutral-600">
              Última: {formatShortDate(lastSessionAt)}
            </p>
          )}
        </Link>

        <Link
          href="/client/mediciones"
          className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-700"
        >
          <Scale className="h-4 w-4 text-neutral-500 mb-2" />
          <p className="text-2xl font-bold tabular-nums text-neutral-50">
            {latest?.weightKg != null ? `${latest.weightKg.toFixed(1)} kg` : "—"}
          </p>
          <p className="text-xs text-neutral-500">Último peso</p>
          {weightDelta !== null && daysSincePrev !== null && (
            <DeltaTag
              delta={weightDelta}
              unit="kg"
              caption={
                daysSincePrev === 0
                  ? "vs hoy"
                  : daysSincePrev === 1
                    ? "vs ayer"
                    : `vs hace ${daysSincePrev}d`
              }
            />
          )}
        </Link>
      </div>

      {/* Comparativa de medidas detallada — solo si hay 2+ registros */}
      {latest && previous && (
        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-neutral-200">
                Cambios desde la última medición
              </h2>
            </div>
            <Link
              href="/client/mediciones"
              className="text-xs font-medium text-brand-primary hover:underline"
            >
              Ver detalle
            </Link>
          </div>
          <p className="mt-1 text-[11px] text-neutral-600">
            {formatShortDate(previous.recordedAt)} →{" "}
            {formatShortDate(latest.recordedAt)}
          </p>
          <div className="mt-3 divide-y divide-neutral-800/80">
            <MeasurementRow
              label="Peso"
              latest={latest.weightKg}
              previous={previous.weightKg}
              unit="kg"
            />
            <MeasurementRow
              label="Grasa corporal"
              latest={latest.bodyFatPct}
              previous={previous.bodyFatPct}
              unit="%"
            />
            <MeasurementRow
              label="Masa muscular"
              latest={latest.muscleMassKg}
              previous={previous.muscleMassKg}
              unit="kg"
            />
            <MeasurementRow
              label="Cintura"
              latest={latest.waistCm}
              previous={previous.waistCm}
              unit="cm"
            />
            <MeasurementRow
              label="Pecho"
              latest={latest.chestCm}
              previous={previous.chestCm}
              unit="cm"
            />
            <MeasurementRow
              label="Brazo"
              latest={latest.armCm}
              previous={previous.armCm}
              unit="cm"
            />
            <MeasurementRow
              label="Muslo"
              latest={latest.thighCm}
              previous={previous.thighCm}
              unit="cm"
            />
          </div>
        </section>
      )}

      {/* Sesiones recientes — solo si hay completadas */}
      {recentSessions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-300">
              Sesiones recientes
            </h2>
            <Link
              href="/client/progreso"
              className="text-xs font-medium text-brand-primary hover:underline"
            >
              Ver todo
            </Link>
          </div>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
              >
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-emerald-400"
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-200 truncate">
                    {session.isFreeWorkout
                      ? "Entrenamiento libre"
                      : `Día ${(session.dayIndex ?? 0) + 1}`}
                    {session.totalDurationSec
                      ? ` · ${Math.round(session.totalDurationSec / 60)} min`
                      : ""}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatShortDate(session.completedAt)}
                  </p>
                </div>
                {session._count.performedSets > 0 && (
                  <span className="text-xs text-neutral-600">
                    {session._count.performedSets} sets
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
