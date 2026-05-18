"use client";

// =============================================================================
// BLACKLINE FITNESS — DashboardSection
// Phase 5, Agent 10 (polish).
// Animated entry wrapper with optional labelled section header.
// Respects prefers-reduced-motion via framer-motion's useReducedMotion().
// =============================================================================

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardSectionProps {
  /**
   * Pre-rendered icon JSX (e.g. `<Calendar className="h-3.5 w-3.5" />`).
   * MUST be JSX, not a component reference — this is a Client Component
   * and Server Components cannot serialize component types across the boundary.
   */
  icon?: ReactNode;
  /** Uppercase label shown next to the icon. */
  label?: string;
  /** Stagger index — each +1 adds 50ms delay to the entry animation. */
  index?: number;
  children: ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardSection({
  icon,
  label,
  index = 0,
  children,
}: DashboardSectionProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="space-y-3"
    >
      {/* Section header — only rendered when label is provided */}
      {label !== undefined && (
        <div className="flex items-center gap-2">
          {icon !== undefined && (
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FF6A1A]/15 text-[#FF6A1A]"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#A1A1AA]">
            {label}
          </p>
          <div className="h-px flex-1 bg-gradient-to-r from-[#27272A] to-transparent" />
        </div>
      )}

      {children}
    </motion.section>
  );
}
