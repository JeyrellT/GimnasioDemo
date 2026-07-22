"use client";

// =============================================================================
// BLACKLINE FITNESS — HealthDeclaredBlock
// Owner: frontend-react.
//
// Read-only panel shown in the trainer's client profile page. Displays the
// medical conditions declared by the client, grouped by kind. No edit actions.
// =============================================================================

import * as React from "react";
import { useEffect, useState } from "react";
import {
  Heart,
  AlertTriangle,
  Bandage,
  Activity,
  Pill,
  Scissors,
  Info,
  Loader2,
} from "lucide-react";

import { listClientMedicalConditions } from "@/app/actions/medical-conditions";
import type { MedicalConditionKindValue, ConditionSeverityValue } from "@/lib/validation/medical-conditions.schema";

// ---------------------------------------------------------------------------
// Types  (mirrors Prisma MedicalCondition — server action returns these exact fields)
// ---------------------------------------------------------------------------

interface MedicalConditionRow {
  id: string;
  kind: MedicalConditionKindValue;
  label: string;
  detail: string | null;
  severity: ConditionSeverityValue | null;
  startedAt: Date | null;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Config maps
// ---------------------------------------------------------------------------

const KIND_CONFIG: Record<
  MedicalConditionKindValue,
  { label: string; Icon: React.ElementType; colorClass: string }
> = {
  ALLERGY: {
    label: "Alergias",
    Icon: AlertTriangle,
    colorClass: "text-[#F59E0B]",
  },
  INJURY: {
    label: "Lesiones",
    Icon: Bandage,
    colorClass: "text-[#EF4444]",
  },
  CHRONIC: {
    label: "Condiciones crónicas",
    Icon: Activity,
    colorClass: "text-[#A78BFA]",
  },
  MEDICATION: {
    label: "Medicamentos",
    Icon: Pill,
    colorClass: "text-[#22C55E]",
  },
  SURGERY: {
    label: "Cirugías",
    Icon: Scissors,
    colorClass: "text-[#F472B6]",
  },
  OTHER: {
    label: "Otra información",
    Icon: Info,
    colorClass: "text-[#71717A]",
  },
};

const SEVERITY_CONFIG: Record<
  ConditionSeverityValue,
  { label: string; className: string }
> = {
  MILD: {
    label: "Leve",
    className: "bg-[rgba(34,197,94,0.12)] text-[#22C55E] border border-[rgba(34,197,94,0.25)]",
  },
  MODERATE: {
    label: "Moderada",
    className: "bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border border-[rgba(245,158,11,0.25)]",
  },
  SEVERE: {
    label: "Severa",
    className: "bg-[rgba(239,68,68,0.12)] text-[#EF4444] border border-[rgba(239,68,68,0.25)]",
  },
};

const KIND_ORDER: MedicalConditionKindValue[] = [
  "ALLERGY",
  "INJURY",
  "MEDICATION",
  "CHRONIC",
  "SURGERY",
  "OTHER",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByKind(
  conditions: MedicalConditionRow[],
): Map<MedicalConditionKindValue, MedicalConditionRow[]> {
  const map = new Map<MedicalConditionKindValue, MedicalConditionRow[]>();
  for (const c of conditions) {
    const arr = map.get(c.kind) ?? [];
    arr.push(c);
    map.set(c.kind, arr);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Sub-component: ConditionItem
// ---------------------------------------------------------------------------

function ConditionItem({ condition }: { condition: MedicalConditionRow }) {
  const severityCfg = condition.severity ? SEVERITY_CONFIG[condition.severity] : null;

  return (
    <li
      className={[
        "rounded-lg border border-[rgba(63,63,70,0.5)] bg-[#09090B]/50 px-3 py-2.5 space-y-1",
        !condition.isActive && "opacity-50",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={condition.label}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-[#E4E4E7] leading-snug">
          {condition.label}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {!condition.isActive && (
            <span className="rounded-full bg-[#27272A] px-2 py-0.5 text-[10px] font-semibold text-[#71717A] uppercase tracking-wide border border-[#3F3F46]">
              Resuelto
            </span>
          )}
          {severityCfg && (
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                severityCfg.className,
              ].join(" ")}
            >
              {severityCfg.label}
            </span>
          )}
        </div>
      </div>
      {condition.detail && (
        <p className="text-xs text-[#71717A] leading-relaxed line-clamp-2">
          {condition.detail}
        </p>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: KindGroup
// ---------------------------------------------------------------------------

function KindGroup({
  kind,
  items,
}: {
  kind: MedicalConditionKindValue;
  items: MedicalConditionRow[];
}) {
  const cfg = KIND_CONFIG[kind];
  const { Icon } = cfg;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className={["h-3.5 w-3.5", cfg.colorClass].join(" ")} aria-hidden="true" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">
          {cfg.label}
        </h4>
        <span className="text-[10px] text-[#52525B]">({items.length})</span>
      </div>
      <ul className="space-y-1.5" aria-label={`Lista de ${cfg.label.toLowerCase()}`}>
        {items.map((item) => (
          <ConditionItem key={item.id} condition={item} />
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface HealthDeclaredBlockProps {
  clientId: string;
}

export function HealthDeclaredBlock({ clientId }: HealthDeclaredBlockProps) {
  const [conditions, setConditions] = useState<MedicalConditionRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listClientMedicalConditions(clientId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        // Prisma MedicalCondition — kind/severity are typed as string by Prisma client;
        // values are guaranteed to be the enum values by the DB constraints.
        setConditions(result.value as unknown as MedicalConditionRow[]);
      } else {
        setError(result.error.message ?? "No se pudieron cargar las condiciones médicas.");
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [clientId]);

  const grouped = conditions ? groupByKind(conditions) : null;
  const hasAny = grouped && grouped.size > 0;

  return (
    <section
      aria-label="Salud declarada por el cliente"
      className="rounded-2xl border border-[rgba(63,63,70,0.7)] bg-gradient-to-b from-[#1A1A1D] to-[#18181B] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-[rgba(63,63,70,0.5)] px-4 py-3.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]">
          <Heart className="h-3.5 w-3.5 text-[#EF4444]" aria-hidden="true" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#A1A1AA]">
          Salud declarada
        </h3>
      </div>

      {/* Body */}
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-[#52525B]" aria-label="Cargando..." />
          </div>
        )}

        {!loading && error && (
          <p className="text-xs text-[#EF4444] py-4 text-center">{error}</p>
        )}

        {!loading && !error && !hasAny && (
          <div className="py-4 space-y-1 text-center">
            <p className="text-sm text-[#71717A]">
              El cliente aún no ha declarado condiciones médicas.
            </p>
            <p className="text-xs text-[#52525B]">
              Le aparecerá un cuestionario al entrar a sus rutinas.
            </p>
          </div>
        )}

        {!loading && !error && hasAny && (
          <div className="space-y-4">
            {KIND_ORDER.filter((k) => grouped.has(k)).map((kind) => (
              <KindGroup
                key={kind}
                kind={kind}
                items={grouped.get(kind)!}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="border-t border-[rgba(63,63,70,0.4)] px-4 py-2.5">
        <p className="text-[11px] text-[#52525B] text-center">
          Solo el cliente puede editar esta información.
        </p>
      </div>
    </section>
  );
}
