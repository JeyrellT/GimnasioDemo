"use client";

// =============================================================================
// BLACKLINE FITNESS — CircumferencesTable
// Owner: frontend-react.
// Tabla de circunferencias agrupadas con valor + delta. Navegable por teclado.
// Alternativa accesible al body map SVG.
// =============================================================================

import * as React from "react";
import { cn } from "@/lib/utils";
import type { BodyComposition } from "@/types/profile";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface CircumferencesTableProps {
  data: BodyComposition;
  selectedZone?: string | null;
  onZoneClick?: (zone: string) => void;
  className?: string;
}

interface CircRow {
  zone: string;
  label: string;
  value: number | null;
  delta?: number | null;
}

interface CircGroup {
  title: string;
  rows: CircRow[];
  /** Tailwind border-left color class for measured rows in this group */
  accentClass: string;
  /** Header band background */
  headerBg: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatCm(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} cm`;
}

function DeltaBadge({ delta }: { delta: number | null | undefined }) {
  if (delta === null || delta === undefined) return null;
  const isPositive = delta > 0;
  const isNeutral = Math.abs(delta) < 0.1;

  if (isNeutral) {
    return (
      <span className="text-xs text-[#71717A]" aria-label="Sin cambio">
        → 0.0
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium",
        isPositive ? "text-[#22C55E]" : "text-[#EF4444]",
      )}
      aria-label={`${isPositive ? "Aumento" : "Disminución"} de ${Math.abs(delta).toFixed(1)} cm`}
    >
      {isPositive ? "↑" : "↓"} {isPositive ? "+" : ""}{delta.toFixed(1)}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function CircumferencesTable({
  data,
  selectedZone,
  onZoneClick,
  className,
}: CircumferencesTableProps) {
  const c = data.circumferences;

  const groups: CircGroup[] = [
    {
      title: "Tronco",
      accentClass: "border-l-2 border-l-[rgba(59,130,246,0.6)]",
      headerBg: "bg-[rgba(59,130,246,0.06)]",
      rows: [
        { zone: "neck", label: "Cuello", value: c.neckCm },
        { zone: "shoulderL", label: "Hombro izq.", value: c.shoulderLeftCm },
        { zone: "shoulderR", label: "Hombro der.", value: c.shoulderRightCm },
        { zone: "chest", label: "Pecho", value: c.chestCm },
        { zone: "abdomen", label: "Abdomen", value: c.abdomenCm },
        { zone: "waist", label: "Cintura", value: c.waistCm },
        { zone: "hip", label: "Cadera", value: c.hipCm },
        { zone: "gluteL", label: "Glúteo izq.", value: c.leftGluteCm },
        { zone: "gluteR", label: "Glúteo der.", value: c.rightGluteCm },
      ],
    },
    {
      title: "Brazos",
      accentClass: "border-l-2 border-l-[rgba(168,85,247,0.6)]",
      headerBg: "bg-[rgba(168,85,247,0.06)]",
      rows: [
        { zone: "bicepL", label: "Bíceps izq.", value: c.leftBicepCm },
        { zone: "bicepR", label: "Bíceps der.", value: c.rightBicepCm },
        { zone: "forearmL", label: "Antebrazo izq.", value: c.leftForearmCm },
        { zone: "forearmR", label: "Antebrazo der.", value: c.rightForearmCm },
      ],
    },
    {
      title: "Piernas",
      accentClass: "border-l-2 border-l-[rgba(34,197,94,0.6)]",
      headerBg: "bg-[rgba(34,197,94,0.06)]",
      rows: [
        { zone: "quadL", label: "Cuádriceps izq.", value: c.leftThighCm },
        { zone: "quadR", label: "Cuádriceps der.", value: c.rightThighCm },
        { zone: "hamstringL", label: "Isquios izq.", value: c.leftHamstringCm },
        { zone: "hamstringR", label: "Isquios der.", value: c.rightHamstringCm },
        { zone: "calfL", label: "Gemelo izq.", value: c.leftCalfCm },
        { zone: "calfR", label: "Gemelo der.", value: c.rightCalfCm },
      ],
    },
  ];

  return (
    <div
      className={cn("space-y-4", className)}
      role="region"
      aria-label="Tabla de circunferencias"
    >
      {groups.map((group) => (
        <section key={group.title} aria-label={`Grupo: ${group.title}`}>
          {/* Group header with subtle background band */}
          <div className={cn("mb-0 rounded-t-xl px-4 py-2", group.headerBg)}>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#71717A]">
              {group.title}
            </h3>
          </div>
          <div className="overflow-hidden rounded-b-xl border border-t-0 border-[rgba(63,63,70,0.7)]">
            <table className="w-full text-sm" role="table">
              <thead className="sr-only">
                <tr>
                  <th scope="col">Zona</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Cambio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(39,39,42,0.8)]">
                {group.rows.map((row, idx) => {
                  const hasValue = row.value !== null;
                  const isClickable = Boolean(onZoneClick);
                  const isSelected = selectedZone === row.zone;

                  return (
                    <tr
                      key={row.zone}
                      className={cn(
                        "flex items-center justify-between py-3 transition-all duration-150",
                        // Selection overrides accent border and background
                        isSelected
                          ? "border-l-2 border-l-[#3B82F6] bg-[rgba(255,106,26,0.10)] pl-3 pr-4"
                          : hasValue
                            ? cn("pl-3 pr-4", group.accentClass)
                            : "px-4",
                        isClickable
                          ? "cursor-pointer hover:bg-[rgba(39,39,42,0.9)] focus-within:bg-[rgba(39,39,42,0.9)]"
                          : "hover:bg-[rgba(255,255,255,0.02)]",
                        !isSelected && idx % 2 === 1 ? "bg-[rgba(255,255,255,0.025)]" : "",
                      )}
                      onClick={isClickable ? () => onZoneClick?.(row.zone) : undefined}
                      onKeyDown={
                        isClickable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onZoneClick?.(row.zone);
                              }
                            }
                          : undefined
                      }
                      role={isClickable ? "button" : "row"}
                      tabIndex={isClickable ? 0 : undefined}
                      aria-pressed={isClickable ? isSelected : undefined}
                      aria-label={
                        isClickable
                          ? `${row.label}: ${formatCm(row.value)}. Tocá para ${isSelected ? "deseleccionar" : "ver detalle"}.`
                          : undefined
                      }
                    >
                      <td className={cn("text-sm", hasValue ? "text-[#D4D4D8]" : "text-[#71717A]")}>
                        {row.label}
                      </td>
                      <td className="ml-auto pr-4">
                        {hasValue ? (
                          <span
                            className="font-semibold text-[#FAFAFA]"
                            style={{ fontFeatureSettings: "'tnum' 1" }}
                          >
                            {formatCm(row.value)}
                          </span>
                        ) : (
                          <span className="text-xs text-[#3F3F46]">Sin medir</span>
                        )}
                      </td>
                      <td className="w-16 text-right">
                        <DeltaBadge delta={row.delta} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
