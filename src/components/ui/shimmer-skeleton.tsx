"use client";

// =============================================================================
// BLACKLINE FITNESS — ShimmerSkeleton
// Owner: frontend-react.
// Dark-theme skeleton loader with a moving gradient shimmer.
// Pure CSS animation via a @keyframes shimmer injected once into <style>.
// Base color: #27272A. Shimmer: translucent white band sweeping left→right.
// =============================================================================

import { cn } from "@/lib/utils";

// Keyframes injected once — avoids Tailwind config changes for a single utility.
const SHIMMER_STYLE = `
@keyframes blackline-fitness-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
.blackline-fitness-shimmer {
  background: linear-gradient(
    90deg,
    #27272a 0%,
    #27272a 35%,
    rgba(255, 255, 255, 0.06) 50%,
    #27272a 65%,
    #27272a 100%
  );
  background-size: 200% 100%;
  animation: blackline-fitness-shimmer 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .blackline-fitness-shimmer {
    animation: none;
    background: #27272a;
  }
}
`;

// Inject the style tag once per document (SSR-safe guard via typeof window)
let styleInjected = false;
function ensureStyle(): void {
  if (typeof window === "undefined" || styleInjected) return;
  const existing = document.getElementById("blackline-fitness-shimmer-style");
  if (existing) {
    styleInjected = true;
    return;
  }
  const el = document.createElement("style");
  el.id = "blackline-fitness-shimmer-style";
  el.textContent = SHIMMER_STYLE;
  document.head.appendChild(el);
  styleInjected = true;
}

type RoundedVariant = "sm" | "md" | "lg" | "full";

export interface ShimmerSkeletonProps {
  className?: string;
  rounded?: RoundedVariant;
}

const roundedMap: Record<RoundedVariant, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function ShimmerSkeleton({
  className,
  rounded = "md",
}: ShimmerSkeletonProps) {
  // Inject on first render (client only)
  if (typeof window !== "undefined") {
    ensureStyle();
  }

  return (
    <div
      className={cn("blackline-fitness-shimmer", roundedMap[rounded], className)}
      aria-hidden="true"
    />
  );
}
