"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Dumbbell, Loader2 } from "lucide-react";
import { db } from "@/lib/offline/db";
import { formatDateCR } from "@/lib/utils";
import type { DemoAssignedRoutineRow } from "@/lib/offline/db";
import type { RoutineSnapshot } from "@/types/domain";

// ── Helpers ───────────────────────────────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  MUSCLE_GAIN: "Ganancia muscular",
  FAT_LOSS: "Pérdida de grasa",
  STRENGTH: "Fuerza",
  ENDURANCE: "Resistencia",
  FLEXIBILITY: "Flexibilidad",
  GENERAL_FITNESS: "Fitness general",
  SPORT_SPECIFIC: "Deporte específico",
  REHABILITATION: "Rehabilitación",
};

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
  const [routines, setRoutines] = useState<DemoAssignedRoutineRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.demoAssignedRoutines
      .where({ clientUserId: clientId })
      .toArray()
      .then((rows) => {
        rows.sort((a, b) => b.startsOn.localeCompare(a.startsOn));
        setRoutines(rows.slice(0, 30));
        setLoading(false);
      });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  const list = routines ?? [];
  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={"/trainer/clientes/" + clientId}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#3F3F46] bg-[#18181B] text-[#71717A] transition-colors hover:border-[#3B82F6]/40 hover:text-[#FAFAFA]"
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
            const goal = snapshot?.goal ? GOAL_LABELS[snapshot.goal] ?? snapshot.goal : null;
            const splitDays = snapshot?.splitDays ?? null;
            const durationWeeks = snapshot?.durationWeeks ?? null;
            const startsOnDate = new Date(r.startsOn);
            const endsOnDate = r.endsOn ? new Date(r.endsOn) : null;
            const pct =
              r.status === "ACTIVE"
                ? calcProgress(startsOnDate, endsOnDate, now)
                : 100;

            const dateFrom = formatDateCR(startsOnDate, "d MMM yyyy");
            const dateTo = endsOnDate ? formatDateCR(endsOnDate, "d MMM yyyy") : "En curso";

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
                          splitDays !== null
                            ? `${splitDays} día${splitDays !== 1 ? "s" : ""} por semana`
                            : null,
                          durationWeeks !== null
                            ? `${durationWeeks} sem.`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {/* Date range */}
                <p className="mt-2 text-xs text-[#71717A]">
                  <span className="text-[#A1A1AA]">Desde</span> {dateFrom}{" "}
                  <span className="text-[#A1A1AA]">— {r.endsOn ? "Hasta" : ""}</span> {dateTo}
                </p>

                {/* Days tags from snapshot */}
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
    </div>
  );
}
