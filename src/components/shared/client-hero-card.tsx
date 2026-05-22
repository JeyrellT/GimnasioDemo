"use client";

// =============================================================================
// BLACKLINE FITNESS — ClientHeroCard
// Owner: frontend-react.
// Hero del perfil: avatar, nombre, meta-line con chips, botones primarios.
// =============================================================================

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import Link from "next/link";
import { AlertTriangle, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParqStatus } from "@/types/domain";
import type { Goal } from "@/types/domain";
import { useMeasurementSheetStore } from "@/stores/measurement-sheet-store";
import { ParqCompletionDialog } from "@/components/shared/parq-completion-dialog";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ClientHeroCardProps {
  name: string;
  email: string;
  avatarUrl?: string | null;
  ageYears: number | null;
  genderLabel: string | null;
  goalLabel: string | null;
  daysSinceStart: number;
  parqStatus: ParqStatus;
  hasActiveRoutine: boolean;
  routineHref: string;
  clientId: string;
  /** Triggered after the PAR-Q dialog saves successfully so the parent can
   *  refetch profile data and re-render the badge with the new status. */
  onParqCompleted?: () => void;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const PARQ_CONFIG: Record<
  ParqStatus,
  { label: string; className: string }
> = {
  GREEN: {
    label: "PAR-Q Verde",
    className: "bg-[rgba(34,197,94,0.15)] text-[#22C55E] border border-[rgba(34,197,94,0.3)]",
  },
  REVIEW: {
    label: "PAR-Q Revisión",
    className: "bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.3)]",
  },
  RED: {
    label: "PAR-Q Rojo",
    className: "bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]",
  },
  NOT_COMPLETED: {
    label: "PAR-Q Pendiente",
    className: "bg-[rgba(161,161,170,0.12)] text-[#A1A1AA] border border-[rgba(161,161,170,0.2)]",
  },
};

const GOAL_LABELS: Record<string, string> = {
  FAT_LOSS: "Bajar grasa",
  MUSCLE_GAIN: "Ganar músculo",
  MAINTENANCE: "Mantenimiento",
  ENDURANCE: "Resistencia",
  STRENGTH: "Fuerza",
  FLEXIBILITY: "Flexibilidad",
  GENERAL_FITNESS: "Fitness general",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ClientHeroCard({
  name,
  email,
  avatarUrl,
  ageYears,
  genderLabel,
  goalLabel,
  daysSinceStart,
  parqStatus,
  hasActiveRoutine,
  routineHref,
  clientId,
  onParqCompleted,
}: ClientHeroCardProps) {
  const parqConfig = PARQ_CONFIG[parqStatus];
  const resolvedGoalLabel = goalLabel ? (GOAL_LABELS[goalLabel] ?? goalLabel) : null;
  const openMeasurementSheet = useMeasurementSheetStore((s) => s.open);
  const [parqDialogOpen, setParqDialogOpen] = React.useState(false);

  return (
    <section
      aria-label={`Perfil de ${name}`}
      className="relative overflow-hidden rounded-2xl border border-[rgba(63,63,70,0.8)] bg-gradient-to-br from-[#18181B] via-[#1C1C20] to-[#18181B] shadow-[0_0_80px_-20px_rgba(255,106,26,0.15)]"
    >
      {/* Decorative top gradient line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,106,26,0.7) 30%, rgba(255,106,26,1) 50%, rgba(255,106,26,0.7) 70%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <div className="p-6 pt-7">
        {/* PAR-Q RED alert */}
        {parqStatus === "RED" && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)] px-4 py-3"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]"
              aria-hidden="true"
            />
            <p className="text-sm text-[#EF4444]">
              PAR-Q rojo — necesita validación médica antes de continuar entrenando.
            </p>
          </div>
        )}

        {/* Layout principal */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar con blue ring */}
          <AvatarPrimitive.Root
            className="mx-auto h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-2 ring-[rgba(255,106,26,0.3)] sm:mx-0"
            aria-label={`Avatar de ${name}`}
          >
            <AvatarPrimitive.Image
              src={avatarUrl ?? undefined}
              alt={name}
              className="h-full w-full object-cover"
            />
            <AvatarPrimitive.Fallback
              className="flex h-full w-full items-center justify-center bg-[#27272A] text-xl font-bold text-brand-primary"
              aria-hidden="true"
            >
              {getInitials(name)}
            </AvatarPrimitive.Fallback>
          </AvatarPrimitive.Root>

          {/* Info + botones */}
          <div className="flex flex-1 flex-col gap-3">
            {/* Nombre */}
            <h1 className="text-center text-2xl font-bold leading-tight text-[#FAFAFA] sm:text-left">
              {name}
            </h1>

            {/* Meta-line: chips inline */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {ageYears !== null && (
                <Chip>{ageYears} años</Chip>
              )}
              {genderLabel && (
                <Chip>{genderLabel}</Chip>
              )}
              {resolvedGoalLabel && (
                <span className="inline-flex items-center rounded-full bg-[rgba(255,106,26,0.15)] px-2.5 py-1 text-xs font-semibold text-brand-primary border border-[rgba(255,106,26,0.3)]">
                  {resolvedGoalLabel}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                  parqConfig.className,
                )}
                aria-label={`Estado PAR-Q: ${parqConfig.label}`}
              >
                {parqConfig.label}
              </span>
              {parqStatus === "NOT_COMPLETED" && (
                <button
                  type="button"
                  onClick={() => setParqDialogOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,106,26,0.4)] bg-[rgba(255,106,26,0.08)] px-2.5 py-1 text-xs font-semibold text-brand-primary transition-colors hover:bg-[rgba(255,106,26,0.16)] focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2"
                  aria-label="Completar el cuestionario PAR-Q para este cliente"
                >
                  <ClipboardCheck className="h-3 w-3" aria-hidden="true" />
                  Completar PAR-Q
                </button>
              )}
            </div>

            {/* Días entrenando */}
            <p className="text-center text-sm text-[#71717A] sm:text-left">
              {daysSinceStart === 0
                ? "Comenzó hoy"
                : `${daysSinceStart} día${daysSinceStart !== 1 ? "s" : ""} entrenando con vos`}
            </p>

            {/* Email secundario */}
            <p className="hidden text-xs text-[#52525B] sm:block">{email}</p>

            {/* Botones */}
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => openMeasurementSheet(clientId)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-[#09090B] shadow-[0_0_20px_-4px_rgba(255,106,26,0.4)] transition-all duration-150 hover:scale-[1.02] hover:bg-brand-primary-hover hover:shadow-[0_0_28px_-4px_rgba(255,106,26,0.6)] focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2"
                aria-label="Agregar nueva medición para este cliente"
              >
                + Nueva medición
              </button>
              <Link
                href={routineHref}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[rgba(63,63,70,0.8)] bg-transparent px-5 py-3 text-sm font-semibold text-[#FAFAFA] transition-all duration-150 hover:scale-[1.02] hover:bg-[#27272A] hover:border-[rgba(63,63,70,1)] focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2"
                aria-label={
                  hasActiveRoutine
                    ? "Ver rutina activa de este cliente"
                    : "Asignar rutina a este cliente"
                }
              >
                {hasActiveRoutine ? "Ver rutina activa" : "Asignar rutina"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ParqCompletionDialog
        open={parqDialogOpen}
        onOpenChange={setParqDialogOpen}
        clientUserId={clientId}
        clientName={name}
        onCompleted={() => {
          onParqCompleted?.();
        }}
      />
    </section>
  );
}

// -----------------------------------------------------------------------------
// Sub-componente: Chip genérico
// -----------------------------------------------------------------------------

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[rgba(39,39,42,0.8)] px-2.5 py-1 text-xs font-medium text-[#A1A1AA] border border-[rgba(63,63,70,0.5)] backdrop-blur-sm">
      {children}
    </span>
  );
}
