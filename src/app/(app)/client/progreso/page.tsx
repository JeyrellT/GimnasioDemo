"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Calendar, Timer } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getMySessionHistory } from "@/app/actions/client-portal";
import type { MySessionSummary } from "@/server/actions/client-portal.actions";

export default function ClientProgresoPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<MySessionSummary[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getMySessionHistory().then((result) => {
      if (result.ok) {
        // Server returns only COMPLETED sessions ordered by startedAt DESC.
        setSessions(result.value);
      }
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

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
      <div>
        <h1 className="text-2xl font-bold text-neutral-50">Progreso</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Tu historial de entrenamiento
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-neutral-50">
            {sessions.length}
          </p>
          <p className="text-xs text-neutral-500 mt-1">Sesiones</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-neutral-50">
            {totalSets}
          </p>
          <p className="text-xs text-neutral-500 mt-1">Sets totales</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-neutral-50">
            {totalMinutes}
          </p>
          <p className="text-xs text-neutral-500 mt-1">Minutos</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="py-12 text-center">
          <Calendar className="h-10 w-10 text-neutral-700 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">
            Aún no tenés sesiones completadas.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-200">
                  {s.isFreeWorkout
                    ? "Entrenamiento libre"
                    : `Día ${(s.dayIndex ?? 0) + 1}`}
                </p>
                <p className="text-xs text-neutral-500">
                  {s.completedAt ? formatDate(s.completedAt) : "—"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                {s.totalDurationSec !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {Math.round(s.totalDurationSec / 60)} min
                  </span>
                )}
                <span>{s._count.performedSets} sets</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(value: Date | string): string {
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
