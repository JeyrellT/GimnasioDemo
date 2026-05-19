"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardAlert, AlertSeverity } from "@/types/dashboard";

// ── Constants ─────────────────────────────────────────────────────────────────

const DISPLAY_LIMIT = 10;

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: "Crítica",
  warning: "Alta",
  info: "Info",
};

const SEVERITY_BORDER_COLOR: Record<AlertSeverity, string> = {
  critical: "border-l-[#EF4444]",
  warning: "border-l-[#F59E0B]",
  info: "border-l-[#71717A]",
};

const SEVERITY_BADGE_COLOR: Record<AlertSeverity, string> = {
  critical: "text-[#EF4444]",
  warning: "text-[#F59E0B]",
  info: "text-[#71717A]",
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface AlertsFeedProps {
  alerts: DashboardAlert[];
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AlertsFeed({ alerts, className }: AlertsFeedProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const sorted = [...alerts].sort((a, b) => {
    const severityDiff =
      (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
    if (severityDiff !== 0) return severityDiff;
    return a.clientName.localeCompare(b.clientName, "es");
  });

  const visible = sorted.filter((a) => !dismissed.has(a.id));
  const displayed = visible.slice(0, DISPLAY_LIMIT);
  const overflow = visible.length - DISPLAY_LIMIT;

  function dismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-[#3F3F46] bg-[#18181B] overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#3F3F46]">
        <h2 className="text-xs font-semibold text-[#71717A] uppercase tracking-widest">
          Seguimientos
        </h2>
        <p className="mt-0.5 text-sm text-[#A1A1AA]">
          {visible.length === 0
            ? "Sin alertas"
            : visible.length === 1
              ? "1 alerta"
              : `${visible.length} alertas`}
        </p>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-3 overflow-y-auto max-h-[420px]">
        {displayed.length === 0 ? (
          <EmptyAlerts />
        ) : (
          <>
            {displayed.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDismiss={() => dismiss(alert.id)}
              />
            ))}

            {overflow > 0 && (
              <Link
                href="/trainer/clientes"
                className="mt-1 text-center text-xs text-[#3B82F6] hover:text-[#2563EB] transition-colors"
              >
                + {overflow} {overflow === 1 ? "alerta más" : "alertas más"}
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── AlertCard ─────────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onDismiss,
}: {
  alert: DashboardAlert;
  onDismiss: () => void;
}) {
  const profileUrl =
    alert.actionUrl ?? `/trainer/clientes/${alert.clientId}`;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-lg border border-[#3F3F46] bg-[#09090B] pl-4 pr-3 py-3 border-l-[3px]",
        SEVERITY_BORDER_COLOR[alert.severity],
      )}
    >
      {/* Severity badge */}
      <span
        className={cn(
          "text-xs font-semibold uppercase tracking-wide",
          SEVERITY_BADGE_COLOR[alert.severity],
        )}
      >
        {SEVERITY_LABEL[alert.severity]}
      </span>

      {/* Message */}
      <p className="text-sm text-[#FAFAFA] leading-snug">{alert.message}</p>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-0.5">
        <Link
          href={profileUrl}
          className="text-xs font-medium text-[#3B82F6] hover:text-[#2563EB] transition-colors"
        >
          Ver perfil
        </Link>

        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Descartar alerta de ${alert.clientName}`}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ── EmptyAlerts ───────────────────────────────────────────────────────────────

function EmptyAlerts() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <CheckCircle2 className="h-8 w-8 text-[#22C55E]" aria-hidden="true" />
      <p className="text-sm font-medium text-[#FAFAFA]">Todo en orden.</p>
      <p className="text-xs text-[#71717A]">Sin alertas pendientes.</p>
    </div>
  );
}
