"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Dumbbell, Loader2, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getClientAssignedRoutines,
  cancelAssignedRoutine,
  deleteAssignedRoutine,
} from "@/app/actions/routines";
import type { ClientAssignedRoutine } from "@/server/actions/routines.actions";
import { formatDateCR } from "@/lib/utils";
import type { RoutineSnapshot } from "@/types/domain";

// ── Helpers ──────────────────────────────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  MUSCLE_GAIN: "Ganancia muscular",
  FAT_LOSS: "Pérdida de grasa",
  STRENGTH: "Fuerza",
  ENDURANCE: "Resistencia",
  FLEXIBILITY: "Flexibilidad",
  GENERAL_FITNESS: "Fitness general",
  SPORT_SPECIFIC: "Deporte específico",
  REHABILITATION: "Rehabilitación",
  HYPERTROPHY: "Hipertrofia",
};

function narrowSnapshot(raw: unknown): RoutineSnapshot | null {
  if (raw === null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.templateName !== "string") return null;
  return obj as unknown as RoutineSnapshot;
}

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

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#22C55E]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
        Activa
      </span>
    );
  }
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#3B82F6]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#3B82F6]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
        Completada
      </span>
    );
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#F59E0B]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
        Cancelada
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

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] text-[#71717A]">Progreso estimado</span>
        <span className="text-[10px] font-semibold text-[#3B82F6]">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#27272A] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#3B82F6] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function RutinasPageContent({ clientId }: { clientId: string }) {
  const [routines, setRoutines] = useState<ClientAssignedRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await getClientAssignedRoutines(clientId);
    if (result.ok) setRoutines(result.value);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(id: string) {
    setActionId(id);
    const result = await cancelAssignedRoutine(id);
    if (result.ok) {
      toast.success("Rutina cancelada.");
      await load();
    } else {
      toast.error(result.error.message ?? "Error al cancelar.");
    }
    setActionId(null);
  }

  async function handleDelete(id: string) {
    setActionId(id);
    setConfirmDelete(null);
    const result = await deleteAssignedRoutine(id);
    if (result.ok) {
      toast.success("Rutina eliminada.");
      await load();
    } else {
      toast.error(result.error.message ?? "Error al eliminar.");
    }
    setActionId(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  const now = new Date();
  const activeCount = routines.filter((r) => r.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/trainer/clientes/${clientId}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#18181B] text-[#71717A] transition-colors hover:border-[#3B82F6]/40 hover:text-[#FAFAFA]"
          aria-label="Volver al cliente"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#FAFAFA]">Rutinas asignadas</h1>
          <p className="text-xs text-[#71717A] mt-0.5">
            {activeCount} activa{activeCount !== 1 ? "s" : ""} de {routines.length} total
          </p>
        </div>
      </div>

      {/* Empty state */}
      {routines.length === 0 ? (
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
          {routines.map((r) => {
            const snapshot = narrowSnapshot(r.snapshotJson);
            const templateName = snapshot?.templateName ?? "Rutina";
            const goal = snapshot?.goal ? GOAL_LABELS[snapshot.goal] ?? snapshot.goal : null;
            const splitDays = snapshot?.splitDays ?? null;
            const durationWeeks = snapshot?.durationWeeks ?? null;
            const startsOnDate = new Date(r.startsOn);
            const endsOnDate = r.endsOn ? new Date(r.endsOn) : null;
            const pct = r.status === "ACTIVE" ? calcProgress(startsOnDate, endsOnDate, now) : 100;
            const dateFrom = formatDateCR(startsOnDate, "d MMM yyyy");
            const dateTo = endsOnDate ? formatDateCR(endsOnDate, "d MMM yyyy") : "En curso";
            const isBusy = actionId === r.id;

            return (
              <li
                key={r.id}
                className={[
                  "rounded-xl border bg-[#18181B]/80 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-4 py-4 transition-all duration-200",
                  r.status === "ACTIVE" ? "border-[#3B82F6]/30" : "border-[#3F3F46] opacity-70",
                ].join(" ")}
              >
                {/* Top row: name + status + actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#FAFAFA] leading-tight">
                        {templateName}
                      </p>
                      <StatusBadge status={r.status} />
                    </div>
                    {(goal || splitDays !== null) && (
                      <p className="mt-0.5 text-xs text-[#71717A]">
                        {[
                          goal,
                          splitDays !== null ? `${splitDays} día${splitDays !== 1 ? "s" : ""}/sem` : null,
                          durationWeeks !== null ? `${durationWeeks} sem.` : null,
                        ].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 gap-1.5">
                    {r.status === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(r.id)}
                        disabled={isBusy}
                        title="Cancelar rutina"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#27272A]/80 text-[#71717A] hover:text-[#F59E0B] hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/10 transition-colors disabled:opacity-40"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(r.id)}
                      disabled={isBusy}
                      title="Eliminar rutina"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#27272A]/80 text-[#71717A] hover:text-[#EF4444] hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>

                {/* Date range */}
                <p className="mt-2 text-xs text-[#71717A]">
                  <span className="text-[#A1A1AA]">Desde</span> {dateFrom}{" "}
                  <span className="text-[#A1A1AA]">{r.endsOn ? "— Hasta" : ""}</span>{" "}
                  {dateTo}
                </p>

                {/* Days tags */}
                {snapshot?.days && snapshot.days.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {snapshot.days.map((day) => (
                      <span
                        key={day.dayIndex}
                        className="inline-flex items-center rounded-md bg-[#27272A] px-2 py-0.5 text-[10px] font-medium text-[#A1A1AA]"
                      >
                        Día {day.dayIndex + 1}
                        {day.name ? ` — ${day.name}` : ""}
                      </span>
                    ))}
                  </div>
                )}

                {r.status === "ACTIVE" && <ProgressBar pct={pct} />}
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#FAFAFA]">Eliminar rutina asignada</h3>
            <p className="mt-2 text-sm text-[#A1A1AA]">
              Esta acción eliminará la rutina asignada. El cliente ya no la verá.
              ¿Estás seguro?
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-[#3F3F46] px-4 py-2 text-sm text-[#A1A1AA] hover:bg-[#27272A] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className="rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#DC2626] transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
