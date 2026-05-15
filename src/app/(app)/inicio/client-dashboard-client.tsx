"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dumbbell,
  TrendingUp,
  Scale,
  Calendar,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Target,
} from "lucide-react";
import {
  getActiveAssignedRoutine,
  listSessionsForClient,
  getLatestMetric,
  getRoutine,
} from "@/lib/demo/store";
import type {
  DemoAssignedRoutineRow,
  DemoSessionRow,
  DemoMetricRow,
  DemoRoutineRow,
} from "@/lib/offline/db";

interface Props {
  userId: string;
  name: string;
}

interface DashboardData {
  activeRoutine: (DemoAssignedRoutineRow & { routine?: DemoRoutineRow }) | null;
  recentSessions: DemoSessionRow[];
  latestMetric: DemoMetricRow | null;
  totalCompleted: number;
}

export function ClientDashboardClient({ userId, name }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    activeRoutine: null,
    recentSessions: [],
    latestMetric: null,
    totalCompleted: 0,
  });

  const firstName = name.split(" ")[0];

  useEffect(() => {
    async function load() {
      const [assigned, sessions, metric] = await Promise.all([
        getActiveAssignedRoutine(userId),
        listSessionsForClient(userId),
        getLatestMetric(userId),
      ]);

      let routineData: DashboardData["activeRoutine"] = null;
      if (assigned) {
        const routine = await getRoutine(assigned.routineTemplateId);
        routineData = { ...assigned, routine: routine ?? undefined };
      }

      const completed = sessions.filter((s) => s.status === "COMPLETED");
      const sorted = completed
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
        .slice(0, 3);

      setData({
        activeRoutine: routineData,
        recentSessions: sorted,
        latestMetric: metric ?? null,
        totalCompleted: completed.length,
      });
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-neutral-500">{greeting}</p>
        <h1 className="text-2xl font-bold text-neutral-50">{firstName}</h1>
      </div>

      {data.activeRoutine && (
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
                {data.activeRoutine.routine?.name ?? "Rutina asignada"}
              </p>
              <p className="text-sm text-neutral-500">
                {data.activeRoutine.routine?.splitDays ?? 0} días ·{" "}
                {data.activeRoutine.routine?.goal?.toLowerCase().replace("_", " ") ?? "general"}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/15">
              <Dumbbell className="h-5 w-5 text-brand-primary" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm font-medium text-brand-primary">
            Ir a sesión <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <Target className="h-4 w-4 text-neutral-500 mb-2" />
          <p className="text-2xl font-bold tabular-nums text-neutral-50">
            {data.totalCompleted}
          </p>
          <p className="text-xs text-neutral-500">Sesiones completadas</p>
        </div>

        <Link
          href="/client/mediciones"
          className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-700"
        >
          <Scale className="h-4 w-4 text-neutral-500 mb-2" />
          <p className="text-2xl font-bold tabular-nums text-neutral-50">
            {data.latestMetric?.weightKg
              ? `${data.latestMetric.weightKg} kg`
              : "—"}
          </p>
          <p className="text-xs text-neutral-500">Último peso</p>
        </Link>
      </div>

      {data.recentSessions.length > 0 && (
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
            {data.recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-200 truncate">
                    Día {(session.dayIndex ?? 0) + 1}
                    {session.totalDurationSec
                      ? ` · ${Math.round(session.totalDurationSec / 60)} min`
                      : ""}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {session.completedAt
                      ? formatShortDate(session.completedAt)
                      : "—"}
                  </p>
                </div>
                {session.setsJson.length > 0 && (
                  <span className="text-xs text-neutral-600">
                    {session.setsJson.length} sets
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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días,";
  if (h < 18) return "Buenas tardes,";
  return "Buenas noches,";
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}
