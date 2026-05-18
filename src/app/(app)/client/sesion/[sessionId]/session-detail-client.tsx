"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Dumbbell } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getSessionDetail } from "@/app/actions/client-portal";
import type { MySessionDetail } from "@/server/actions/client-portal.actions";
import Link from "next/link";

export function SessionDetailClient() {
  const { user } = useAuth();
  const params = useParams<{ sessionId: string }>();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<MySessionDetail | null>(null);

  useEffect(() => {
    if (!params.sessionId) {
      setLoading(false);
      return;
    }
    getSessionDetail(params.sessionId).then((result) => {
      if (result.ok) setSession(result.value);
      setLoading(false);
    });
  }, [params.sessionId]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 text-center space-y-4">
        <Dumbbell className="h-12 w-12 text-neutral-600 mx-auto" />
        <h2 className="text-xl font-bold text-neutral-50">
          Sesión no encontrada
        </h2>
        <Link
          href="/client/progreso"
          className="inline-block px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Ver progreso
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-50">
          {session.isFreeWorkout
            ? "Entrenamiento libre"
            : `Sesión — Día ${(session.dayIndex ?? 0) + 1}`}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {session.completedAt ? formatDate(session.completedAt) : "En progreso"}
          {session.totalDurationSec !== null
            ? ` · ${Math.round(session.totalDurationSec / 60)} min`
            : ""}
        </p>
      </div>

      {session.performedSets.length === 0 ? (
        <p className="text-sm text-neutral-500">No hay sets registrados.</p>
      ) : (
        <div className="space-y-2">
          {session.performedSets.map((set) => (
            <div
              key={set.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-neutral-400">
                {set.setNumber}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-200 truncate">
                  {set.exercise.nameEs}
                </p>
                <p className="text-xs text-neutral-500">
                  {set.weightKg !== null ? `${set.weightKg} kg` : "—"} ·{" "}
                  {set.reps !== null ? `${set.reps} reps` : "—"}
                  {set.rpe !== null ? ` · RPE ${set.rpe}` : ""}
                </p>
              </div>
              {set.isPr && (
                <span className="text-[10px] font-bold text-brand-primary uppercase">
                  PR
                </span>
              )}
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
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return String(value);
  }
}
