"use client";

// =============================================================================
// BLACKLINE FITNESS — PulseDot
// Owner: frontend-react.
// Small animated status indicator. Outer ring uses Tailwind `animate-ping`,
// inner circle is solid. Pure CSS — no framer-motion overhead needed here.
// =============================================================================

import { cn } from "@/lib/utils";

type DotColor = "green" | "orange" | "red";
type DotSize = "sm" | "md";

export interface PulseDotProps {
  color?: DotColor;
  size?: DotSize;
  className?: string;
}

const colorMap: Record<DotColor, { ring: string; dot: string }> = {
  green: {
    ring: "bg-[#22c55e]",
    dot: "bg-[#22c55e]",
  },
  orange: {
    ring: "bg-[#FF6A1A]",
    dot: "bg-[#FF6A1A]",
  },
  red: {
    ring: "bg-[#ef4444]",
    dot: "bg-[#ef4444]",
  },
};

const sizeMap: Record<DotSize, { wrapper: string; ring: string; dot: string }> =
  {
    sm: {
      wrapper: "h-[6px] w-[6px]",
      ring: "h-[6px] w-[6px]",
      dot: "h-[6px] w-[6px]",
    },
    md: {
      wrapper: "h-[8px] w-[8px]",
      ring: "h-[8px] w-[8px]",
      dot: "h-[8px] w-[8px]",
    },
  };

export function PulseDot({
  color = "green",
  size = "md",
  className,
}: PulseDotProps) {
  const colors = colorMap[color];
  const sizes = sizeMap[size];

  return (
    <span
      className={cn("relative inline-flex", sizes.wrapper, className)}
      role="img"
      aria-label="active indicator"
    >
      {/* Pulsing outer ring */}
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
          colors.ring,
        )}
      />
      {/* Solid inner circle */}
      <span
        className={cn(
          "relative inline-flex rounded-full",
          sizes.dot,
          colors.dot,
        )}
      />
    </span>
  );
}
