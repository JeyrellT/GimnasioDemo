"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, Clock, CheckCircle, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { db } from "@/lib/offline/db";
import { formatDateCR } from "@/lib/utils";
import type { DemoSessionRow } from "@/lib/offline/db";

type IconComponent = LucideIcon;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(totalSec: number | null): string {
  if (!totalSec) return "—";
  const m = Math.round(totalSec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}

function formatSessionDate(date: Date): string {
  return formatDateCR(date, "EEE d MMM yyyy, HH:mm");
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: IconComponent;
  accent?: boolean;
}) {
  return (
    <div className="flex-1 rounded-xl border border-[#3F3F46] bg-[#18181B]/80 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-4 py-3 flex items-center gap-3 min-w-0">
      <div
        className={
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " +
          (accent ? "bg-brand-primary/15" : "bg-[#27272A]")
        }
      >
        <Icon
          className={"h-4 w-4 " + (accent ? "text-brand-primary" : "text-[#71717A]")}
          aria-hidden
        />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#71717A] truncate">{label}</p>
        <p className="text-base font-bold text-[#FAFAFA]">{value}</p>
      </div>
    </div>
  );
}

// ── Duration bar ──────────────────────────────────────────────────────────────

function DurationBar({ durationSec, maxSec }: { durationSec: number | null; maxSec: number }) {
  if (!durationSec || maxSec === 0) return null;
  const pct = Math.min(100, Math.round((durationSec / maxSec) * 100));
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-[#27272A] overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-[#71717A] shrink-0 w-12 text-right">
        {formatDuration(durationSec)}
      </span>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#22C55E]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
        Completada
      </span>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#F59E0B]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
        </span>
        En curso
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#27272A] px-2.5 py-0.5 text-[10px] font-semibold text-[#71717A]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#71717A]" />
      Abortada
    </span>
  );
}

// ── Timeline dot ──────────────────────────────────────────────────────────────

function TimelineDot({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <div className="relative z-10 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-[#22C55E] ring-4 ring-[#09090B]" />
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <div className="relative z-10 flex h-3 w-3 shrink-0 items-center justify-center rounded-full ring-4 ring-[#09090B]">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-[#F59E0B]" />
      </div>
    );
  }
  return (
    <div className="relative z-10 h-3 w-3 shrink-0 rounded-full bg-[#3F3F46] ring-4 ring-[#09090B]" />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SesionesPageContent({ clientId }: { clientId: string }) {
  const [sessions, setSessions] = useState<DemoSessionRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.demoSessions
      .where({ clientUserId: clientId })
      .toArray()
      .then((rows) => {
        // Sort descending by startedAt
        rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
        setSessions(rows.slice(0, 50));
        setLoading(false);
      });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    );
  }

  const list = sessions ?? [];

  // ── Stats ─────────────────────────────────────────────────────────────────

  const total = list.length;
  const completed = list.filter((s) => s.status === "COMPLETED").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const durations = list
    .filter((s) => typeof s.totalDurationSec === "number" && (s.totalDurationSec ?? 0) > 0)
    .map((s) => s.totalDurationSec as number);
  const avgDurationSec =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
  const maxDurationSec = durations.length > 0 ? Math.max(...durations) : 0;

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
        <div>
          <h1 className="text-2xl font-bold text-[#FAFAFA]">Sesiones</h1>
          {total > 0 && (
            <p className="text-xs text-[#71717A]">{total} sesión{total !== 1 ? "es" : ""} registrada{total !== 1 ? "s" : ""}</p>
          )}
        </div>
      </div>

      {/* Stats banner */}
      {total > 0 && (
        <div className="flex gap-3 flex-wrap sm:flex-nowrap">
          <StatCard label="Total sesiones" value={String(total)} icon={Activity} accent />
          <StatCard
            label="Duración promedio"
            value={avgDurationSec > 0 ? formatDuration(avgDurationSec) : "—"}
            icon={Clock}
          />
          <StatCard
            label="Tasa de completado"
            value={`${completionRate}%`}
            icon={CheckCircle}
            accent={completionRate >= 75}
          />
        </div>
      )}

      {/* Empty state */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#3F3F46] px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#3F3F46] bg-[#18181B]">
            <Activity className="h-8 w-8 text-[#52525B]" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#FAFAFA]">Sin sesiones registradas</p>
            <p className="mt-1 text-xs text-[#71717A]">
              Las sesiones aparecerán aquí cuando el cliente empiece a entrenar.
            </p>
          </div>
        </div>
      ) : (
        /* Timeline */
        <div className="relative">
          <div
            className="absolute left-[5px] top-3 w-px"
            style={{
              bottom: "12px",
              background:
                "linear-gradient(to bottom, var(--brand-primary) 0%, var(--brand-primary) 60%, transparent 100%)",
            }}
            aria-hidden="true"
          />

          <ul className="flex flex-col gap-4 pl-7">
            {list.map((s) => (
              <li key={s.id} className="relative">
                <div className="absolute -left-7 top-3">
                  <TimelineDot status={s.status} />
                </div>

                <div className="rounded-xl border border-[#3F3F46] bg-[#18181B]/80 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-4 py-3 transition-colors hover:border-[#3F3F46]/80">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#FAFAFA] capitalize">
                        {formatSessionDate(new Date(s.startedAt))}
                      </p>
                      <p className="mt-0.5 text-xs text-[#71717A]">
                        {s.isFreeWorkout ? "Entrenamiento libre" : "Rutina asignada"}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>

                  {s.totalDurationSec != null && maxDurationSec > 0 && (
                    <DurationBar
                      durationSec={s.totalDurationSec}
                      maxSec={maxDurationSec}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
