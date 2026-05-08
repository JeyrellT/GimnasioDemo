"use client";

// =============================================================================
// VIZION — KpiHeroCard
// Owner: frontend-react.
// Muestra un KPI individual: label, valor, delta semantizado, sparkline mini.
// =============================================================================

import * as React from "react";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DeltaAlignment } from "@/types/profile";

// TODO(data-viz): este import depende de kpi-sparkline.tsx
import { KpiSparkline } from "@/components/charts/kpi-sparkline";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface KpiHeroCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaLabel?: string;
  sparklineData?: number[];
  goalAlignment: DeltaAlignment;
  /** Index en el grid — controla el stagger de la animación de entrada. */
  index?: number;
  className?: string;
}

// -----------------------------------------------------------------------------
// Helpers de color por alineación al goal
// -----------------------------------------------------------------------------

const ALIGNMENT_CONFIG = {
  good: {
    text: "text-[#22C55E]",
    bg: "bg-[rgba(34,197,94,0.1)]",
    accentBorder: "rgba(34,197,94,0.7)",
    hoverGlow: "hover:shadow-[0_0_24px_-6px_rgba(34,197,94,0.25)]",
  },
  bad: {
    text: "text-[#EF4444]",
    bg: "bg-[rgba(239,68,68,0.1)]",
    accentBorder: "rgba(239,68,68,0.7)",
    hoverGlow: "hover:shadow-[0_0_24px_-6px_rgba(239,68,68,0.25)]",
  },
  neutral: {
    text: "text-[#A1A1AA]",
    bg: "bg-[rgba(161,161,170,0.08)]",
    accentBorder: "rgba(113,113,122,0.5)",
    hoverGlow: "hover:shadow-[0_0_24px_-6px_rgba(161,161,170,0.12)]",
  },
} as const;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function KpiHeroCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  sparklineData,
  goalAlignment,
  index = 0,
  className,
}: KpiHeroCardProps) {
  const shouldReduceMotion = useReducedMotion();

  const transition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : {
        duration: 0.32,
        type: "tween",
        ease: [0, 0, 0.2, 1],
        delay: index * 0.05,
      };

  const initial = shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 };
  const animate = { opacity: 1, y: 0 };

  const alignConfig = goalAlignment ? ALIGNMENT_CONFIG[goalAlignment] : null;

  const accentBorderColor = alignConfig?.accentBorder ?? "rgba(63,63,70,0.6)";
  const hoverGlowClass = alignConfig?.hoverGlow ?? "hover:shadow-[0_0_24px_-6px_rgba(255,106,26,0.1)]";

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={transition}
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-xl border border-[rgba(63,63,70,0.5)] p-4",
        "bg-[rgba(24,24,27,0.8)] backdrop-blur-xl",
        "transition-all duration-200 hover:bg-[rgba(39,39,42,0.9)]",
        hoverGlowClass,
        "focus-within:outline-2 focus-within:outline-[#FF6A1A] focus-within:outline-offset-2",
        className,
      )}
      aria-label={`${label}: ${value}${unit ? ` ${unit}` : ""}${delta ? `, ${delta}` : ""}`}
    >
      {/* Top accent border — color based on goalAlignment */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-xl"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${accentBorderColor} 40%, ${accentBorderColor} 60%, transparent 100%)` }}
        aria-hidden="true"
      />

      {/* Label */}
      <p className="text-[11px] font-medium uppercase tracking-widest text-[#71717A]">
        {label}
      </p>

      {/* Valor + unidad */}
      <div className="flex items-baseline gap-1.5">
        <span
          className="bg-gradient-to-b from-[#FAFAFA] to-[#A1A1AA] bg-clip-text text-4xl font-bold leading-none text-transparent"
          style={{ fontFeatureSettings: "'tnum' 1, 'cv11' 1" }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-[#71717A]">{unit}</span>
        )}
      </div>

      {/* Delta badge */}
      {delta && alignConfig && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
              alignConfig.text,
              alignConfig.bg,
            )}
            aria-label={`Cambio: ${delta}`}
          >
            {delta}
          </span>
          {deltaLabel && (
            <span className="text-[11px] text-[#52525B]">{deltaLabel}</span>
          )}
        </div>
      )}

      {/* Delta sin color (sin alineación de goal) */}
      {delta && !alignConfig && (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-[rgba(161,161,170,0.08)] px-2 py-0.5 text-xs font-semibold text-[#A1A1AA]">
            {delta}
          </span>
          {deltaLabel && (
            <span className="text-[11px] text-[#52525B]">{deltaLabel}</span>
          )}
        </div>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-auto pt-1">
          <KpiSparkline data={sparklineData} />
        </div>
      )}
    </motion.div>
  );
}
