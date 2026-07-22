"use client";

// =============================================================================
// BLACKLINE FITNESS — EmptyStateCard
// Owner: frontend-react.
// Componente genérico de empty state con ícono, título, descripción y acción
// opcional. Usalo en cualquier sección del app que pueda estar vacía.
// =============================================================================

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateCardProps) {
  const hasAction = Boolean(actionLabel && (actionHref || onAction));

  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center gap-5 rounded-2xl",
        "border border-dashed border-[#3F3F46] bg-[#18181B] px-8 py-10 text-center",
        className,
      )}
      role="region"
    >
      {/* Icon container */}
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#27272A]"
        aria-hidden="true"
      >
        <Icon className="h-7 w-7 text-[#3F3F46]" strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-[#FAFAFA]">{title}</p>
        <p className="max-w-xs text-balance text-sm leading-relaxed text-[#71717A]">
          {description}
        </p>
      </div>

      {/* Action */}
      {hasAction && actionLabel && (
        <>
          {actionHref ? (
            <Link
              href={actionHref}
              className={cn(
                "inline-flex min-h-[44px] items-center justify-center rounded-xl",
                "bg-brand-primary px-5 py-3 text-sm font-semibold text-[#09090B]",
                "transition-colors hover:bg-brand-primary-hover",
                "focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2",
              )}
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className={cn(
                "inline-flex min-h-[44px] items-center justify-center rounded-xl",
                "bg-brand-primary px-5 py-3 text-sm font-semibold text-[#09090B]",
                "transition-colors hover:bg-brand-primary-hover",
                "focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2",
              )}
            >
              {actionLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
}
