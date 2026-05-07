import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * Top-level layout wrapper for the trainer dashboard.
 * Adds a gradient accent line at the top and consistent vertical rhythm.
 */
export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Orange accent line — mirrors the routine detail page top treatment */}
      <div
        className="h-[2px] w-full bg-gradient-to-r from-[#FF6A1A] via-[#E55A0E]/60 to-transparent rounded-full"
        aria-hidden="true"
      />

      {children}
    </div>
  );
}
