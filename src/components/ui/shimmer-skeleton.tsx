"use client";

// =============================================================================
// VIZION — ShimmerSkeleton
// Owner: frontend-react.
// Dark-theme skeleton loader with a moving gradient shimmer.
// Pure CSS animation via a @keyframes shimmer injected once into <style>.
// Base color: #27272A. Shimmer: translucent white band sweeping left→right.
// =============================================================================

import { cn } from "@/lib/utils";

// Keyframes injected once — avoids Tailwind config changes for a single utility.
const SHIMMER_STYLE = `
@keyframes vizion-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
.vizion-shimmer {
  background: linear-gradient(
    90deg,
    #27272a 0%,
    #27272a 35%,
    rgba(255, 255, 255, 0.06) 50%,
    #27272a 65%,
    #27272a 100%
  );
  background-size: 200% 100%;
  animation: vizion-shimmer 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .vizion-shimmer {
    animation: none;
    background: #27272a;
  }
}
`;

// Inject the style tag once per document (SSR-safe guard via typeof window)
let styleInjected = false;
function ensureStyle(): void {
  if (typeof window === "undefined" || styleInjected) return;
  const existing = document.getElementById("vizion-shimmer-style");
  if (existing) {
    styleInjected = true;
    return;
  }
  const el = document.createElement("style");
  el.id = "vizion-shimmer-style";
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
      className={cn("vizion-shimmer", roundedMap[rounded], className)}
      aria-hidden="true"
    />
  );
}
