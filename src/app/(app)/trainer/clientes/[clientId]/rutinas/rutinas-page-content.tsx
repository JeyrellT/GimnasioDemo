"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, Dumbbell, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteAssignedRoutine,
  getClientAssignedRoutines,
} from "@/app/actions/routines";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDateCR } from "@/lib/utils";
import type { RoutineSnapshot } from "@/types/domain";
import { getRoutineAudienceLabel, getRoutineGoalLabel } from "@/lib/routines/metadata";

type AssignedRoutineRow = {
  id: string;
  routineTemplateId: string;
  status: string;
  startsOn: Date;
  endsOn: Date | null;
  assignedAt: Date;
  trainerNotes: string | null;
  snapshotJson: unknown;
  completedDayIndexes: number[];
  completedSessionCount: number;
  lastCompletedAt: Date | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcProgress(startsOn: Date, endsOn: Date | null, now: Date): number {
  const start = startsOn.getTime();
  const end = endsOn ? endsOn.getTime() : null;
  const current = now.getTime();

  if (current <= start) return 0;
  if (!end) {
    const elapsed = current - start;
    const estimatedTotal = 84 * 24 * 60 * 60 * 1000;
    return Math.min(100, Math.round((elapsed / estimatedTotal) * 100));
  }
  if (current >= end) return 100;
  return Math.round(((current - start) / (end - start)) * 100);
}

function narrowSnapshot(raw: unknown): RoutineSnapshot | null {
  if (raw === null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.templateName !== "string") return null;
  return obj as unknown as RoutineSnapshot;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

/**
 * Progreso real = sesiones que el cliente efectivamente completó sobre el total
 * prescrito (splitDays × durationWeeks). El progreso por fechas se muestra
 * aparte como "tiempo transcurrido": comparar ambos es lo que revela adherencia.
 */
function ProgressBar({
  completedSessions,
  totalSessions,
  elapsedPct,
  lastCompletedAt,
}: {
  completedSessions: number;
  totalSessions: number | null;
  elapsedPct: number;
  lastCompletedAt: Date | null;
}) {
  const pct =
    totalSessions && totalSessions > 0
      ? Math.min(100, Math.round((completedSessions / totalSessions) * 100))
      : completedSessions > 0
        ? 100
        : 0;

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] text-[#71717A]">Sesiones completadas</span>
        <span className="text-[10px] font-semibold text-brand-primary">
          {completedSessions}
          {totalSessions && totalSessions > 0 ? ` de ${totalSessions}` : ""} · {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#27272A] overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-[#52525B]">
        Tiempo transcurrido {elapsedPct}%
        {lastCompletedAt
          ? ` · Última sesión ${formatDateCR(lastCompletedAt, "d MMM yyyy")}`
          : " · Sin sesiones aún"}
      </p>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#22C55E]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
        Activa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#27272A] px-2.5 py-0.5 text-[10px] font-semibold text-[#71717A]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#71717A]" />
      Archivada
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RutinasPageContent({ clientId }: { clientId: string }) {
  const [routines, setRoutines] = useState<AssignedRoutineRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routineToDelete, setRoutineToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getClientAssignedRoutines(clientId).then((result) => {
      if (cancelled) return;

      if (!result.ok) {
        setRoutines([]);
        setError(result.error.message);
      } else {
        setRoutines(result.value.slice(0, 30));
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    );
  }

  const list = routines ?? [];
  const now = new Date();

  async function handleDeleteAssignedRoutine() {
    if (!routineToDelete || deletingId) return;

    setDeletingId(routineToDelete.id);
    const result = await deleteAssignedRoutine(routineToDelete.id);

    if (!result.ok) {
      toast.error(result.error.message ?? "No se pudo quitar la rutina.");
      setDeletingId(null);
      return;
    }

    setRoutines((current) =>
      current?.filter((routine) => routine.id !== routineToDelete.id) ?? [],
    );
    toast.success("Rutina eliminada del perfil del cliente.");
    setRoutineToDelete(null);
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={"/trainer/clientes/" + clientId}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#18181B] text-[#71717A] transition-colors hover:border-brand-primary/40 hover:text-[#FAFAFA]"
          aria-label="Volver al cliente"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#FAFAFA]">Rutinas asignadas</h1>
          {list.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-[#27272A] px-2.5 py-0.5 text-xs font-semibold text-[#A1A1AA]">
              {list.length}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3 text-sm text-[#FBBF24]">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#3F3F46] px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#3F3F46] bg-[#18181B]">
            <Dumbbell className="h-8 w-8 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#FAFAFA]">Sin rutinas asignadas</p>
            <p className="mt-1 text-xs text-[#71717A]">
              Asigná una plantilla de rutina a este cliente.
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((r) => {
            const snapshot = narrowSnapshot(r.snapshotJson);
            const templateName = snapshot?.templateName ?? "Rutina";
            const goal = snapshot?.goal ? getRoutineGoalLabel(snapshot.goal) : null;
            const audience = snapshot ? getRoutineAudienceLabel(snapshot.audience) : null;
            const splitDays = snapshot?.splitDays ?? null;
            const durationWeeks = snapshot?.durationWeeks ?? null;
            const startsOnDate = new Date(r.startsOn);
            const endsOnDate = r.endsOn ? new Date(r.endsOn) : null;
            const pct = r.status === "ACTIVE" ? calcProgress(startsOnDate, endsOnDate, now) : 100;
            const completedDays = new Set(r.completedDayIndexes ?? []);
            const totalSessions =
              splitDays !== null && durationWeeks !== null
                ? splitDays * durationWeeks
                : null;

            const dateFrom = formatDateCR(startsOnDate, "d MMM yyyy");
            const dateTo = endsOnDate ? formatDateCR(endsOnDate, "d MMM yyyy") : "En curso";
            const editHref = `/trainer/rutinas/${r.routineTemplateId}?clientId=${encodeURIComponent(clientId)}&assignedRoutineId=${encodeURIComponent(r.id)}`;

            return (
              <li
                key={r.id}
                className="rounded-xl border border-[#3F3F46] bg-[#18181B]/80 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-4 py-4 transition-all duration-200 hover:border-[#3F3F46]/80"
              >
                {/* Top row: name + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#FAFAFA] leading-tight">
                      {templateName}
                    </p>
                    {(goal ?? splitDays !== null) && (
                      <p className="mt-0.5 text-xs text-[#71717A]">
                        {[
                          goal,
                          audience,
                          splitDays !== null
                            ? `${splitDays} día${splitDays !== 1 ? "s" : ""} por semana`
                            : null,
                          durationWeeks !== null ? `${durationWeeks} sem.` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={editHref}
                      title="Editar rutina"
                      aria-label={`Editar ${templateName}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#27272A]/80 text-[#71717A] transition-colors hover:border-brand-primary/40 hover:bg-brand-primary/10 hover:text-brand-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      title="Quitar rutina del cliente"
                      aria-label={`Quitar ${templateName} del cliente`}
                      disabled={deletingId === r.id}
                      onClick={() => setRoutineToDelete({ id: r.id, name: templateName })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#27272A]/80 text-[#71717A] transition-colors hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10 hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      )}
                    </button>
                    <StatusBadge status={r.status} />
                  </div>
                </div>

                {/* Date range */}
                <p className="mt-2 text-xs text-[#71717A]">
                  <span className="text-[#A1A1AA]">Desde</span> {dateFrom}{" "}
                  <span className="text-[#A1A1AA]">— {r.endsOn ? "Hasta" : ""}</span> {dateTo}
                </p>

                {/* Days tags from snapshot — los completados quedan marcados */}
                {snapshot?.days && snapshot.days.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {snapshot.days.map((day) => {
                      const done = completedDays.has(day.dayIndex);
                      return (
                        <span
                          key={day.dayIndex}
                          title={done ? "Completado por el cliente" : "Sin completar"}
                          className={
                            done
                              ? "inline-flex items-center gap-1 rounded-md bg-[#22C55E]/15 px-2 py-0.5 text-[10px] font-semibold text-[#22C55E]"
                              : "inline-flex items-center rounded-md bg-[#27272A] px-2 py-0.5 text-[10px] font-medium text-[#A1A1AA]"
                          }
                        >
                          {done && (
                            <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                          )}
                          Día {day.dayIndex + 1}
                          {day.name ? ` — ${day.name}` : ""}
                        </span>
                      );
                    })}
                  </div>
                )}

                {r.status === "ACTIVE" && (
                  <ProgressBar
                    completedSessions={r.completedSessionCount}
                    totalSessions={totalSessions}
                    elapsedPct={pct}
                    lastCompletedAt={r.lastCompletedAt ? new Date(r.lastCompletedAt) : null}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={routineToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) setRoutineToDelete(null);
        }}
        title="Quitar rutina del cliente"
        description={
          routineToDelete
            ? `Se quitará “${routineToDelete.name}” del perfil de este cliente. La plantilla original seguirá disponible en tus rutinas.`
            : ""
        }
        confirmLabel="Quitar rutina"
        cancelLabel="Cancelar"
        variant="destructive"
        loading={deletingId !== null}
        onConfirm={handleDeleteAssignedRoutine}
      />
    </div>
  );
}
