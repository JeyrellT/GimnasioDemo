"use client";

// =============================================================================
// VIZION — /client/entrenador — Trainer info page for the logged-in client
// =============================================================================

import { useEffect, useState } from "react";
import {
  Loader2,
  MessageCircle,
  Calendar,
  User,
  Clock,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { useDemoUser, DEMO_PROFILES } from "@/lib/demo/auth-context";
import { getTrainerClientLink } from "@/lib/demo/store";
import type { DemoTrainerClientRow } from "@/lib/offline/db";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFullDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatMonthsAgo(iso: string): string {
  try {
    const start = new Date(iso);
    const now = new Date();
    const months =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());
    if (months <= 0) return "Menos de un mes";
    if (months === 1) return "1 mes";
    return `${months} meses`;
  } catch {
    return "—";
  }
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(amount);
}

type LinkStatus = DemoTrainerClientRow["status"];

interface StatusConfig {
  label: string;
  classes: string;
}

const STATUS_MAP: Record<LinkStatus, StatusConfig> = {
  ACTIVE: {
    label: "Activo",
    classes: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  },
  PENDING: {
    label: "Pendiente",
    classes: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  },
  PAUSED: {
    label: "Pausado",
    classes: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  },
  ENDED: {
    label: "Finalizado",
    classes: "bg-neutral-700/50 text-neutral-400 border border-neutral-700",
  },
};

function StatusBadge({ status }: { status: LinkStatus }) {
  const cfg = STATUS_MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.classes}`}
    >
      <CheckCircle className="h-3 w-3" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export default function EntrenadorPage() {
  const user = useDemoUser();
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<DemoTrainerClientRow | null>(null);

  useEffect(() => {
    getTrainerClientLink(user.id).then((row) => {
      setLink(row ?? null);
      setLoading(false);
    });
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-neutral-50">Mi entrenador</h1>
        <div className="py-16 text-center">
          <User className="mx-auto mb-4 h-12 w-12 text-neutral-700" />
          <p className="text-sm text-neutral-500">
            No tenés un entrenador asignado todavía.
          </p>
        </div>
      </div>
    );
  }

  const trainer = DEMO_PROFILES.find(
    (p) => p.id === link.trainerUserId && p.role === "TRAINER",
  );

  // Fallback: any TRAINER profile in case ids don't align in demo data
  const trainerProfile =
    trainer ?? DEMO_PROFILES.find((p) => p.role === "TRAINER");

  if (!trainerProfile) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-neutral-50">Mi entrenador</h1>

      {/* ── Trainer profile card ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Avatar */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6A1A] to-[#C04A00] text-2xl font-bold text-white shadow-lg shadow-[#FF6A1A]/20 select-none">
            {trainerProfile.avatarInitials}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-neutral-50">
              {trainerProfile.name}
            </h2>
            <p className="text-sm text-neutral-400">{trainerProfile.email}</p>
            <div className="flex justify-center pt-0.5">
              <StatusBadge status={link.status} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Relationship details card ────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Detalles de la relación
        </h3>

        <div className="space-y-3">
          {/* Desde */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800">
              <CheckCircle
                className="h-4 w-4 text-[#FF6A1A]"
                aria-hidden="true"
              />
            </div>
            <div className="flex flex-1 items-center justify-between gap-4">
              <span className="text-sm text-neutral-400">Desde</span>
              <span className="text-sm font-medium text-neutral-100">
                {formatFullDate(link.startedAt)}
              </span>
            </div>
          </div>

          {/* Tiempo juntos */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800">
              <Clock
                className="h-4 w-4 text-[#FF6A1A]"
                aria-hidden="true"
              />
            </div>
            <div className="flex flex-1 items-center justify-between gap-4">
              <span className="text-sm text-neutral-400">Tiempo juntos</span>
              <span className="text-sm font-medium text-neutral-100">
                {formatMonthsAgo(link.startedAt)}
              </span>
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800">
              <User
                className="h-4 w-4 text-[#FF6A1A]"
                aria-hidden="true"
              />
            </div>
            <div className="flex flex-1 items-center justify-between gap-4">
              <span className="text-sm text-neutral-400">Estado</span>
              <StatusBadge status={link.status} />
            </div>
          </div>

          {/* Plan mensual */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800">
              <CreditCard
                className="h-4 w-4 text-[#FF6A1A]"
                aria-hidden="true"
              />
            </div>
            <div className="flex flex-1 items-center justify-between gap-4">
              <span className="text-sm text-neutral-400">Plan mensual</span>
              <span className="text-sm font-semibold text-neutral-100 tabular-nums">
                {formatPrice(link.monthlyPriceCRC)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick contact section ────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Contacto
        </h3>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#FF6A1A]/50 px-4 py-2.5 text-sm font-semibold text-[#FF6A1A] opacity-50 cursor-not-allowed min-h-[44px] transition-colors"
            aria-disabled="true"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Enviar mensaje
          </button>

          <button
            type="button"
            disabled
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-300 opacity-50 cursor-not-allowed min-h-[44px] transition-colors"
            aria-disabled="true"
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Agendar cita
          </button>
        </div>

        <p className="text-xs text-neutral-600 text-center">
          En la versión completa podrás contactar directamente a tu entrenador
        </p>
      </div>
    </div>
  );
}
