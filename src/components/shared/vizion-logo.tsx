"use client";

import { cn } from "@/lib/utils";

interface VizionLogoProps {
  variant?: "mark" | "wordmark" | "full";
  className?: string;
  size?: number;
}

export function VizionLogo({ variant = "mark", className, size }: VizionLogoProps) {
  if (variant === "wordmark" || variant === "full") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {variant === "full" && <VizionMark size={size ?? 32} />}
        <span
          className="font-bold tracking-[0.08em] uppercase"
          style={{
            fontSize: size ? size * 0.6 : 20,
            background: "linear-gradient(135deg, #FF8C42 0%, #FF6A1A 50%, #C04A00 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          VIZION
        </span>
      </div>
    );
  }
  return <VizionMark size={size ?? 32} className={className} />;
}

function VizionMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vizion-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF8C42" />
          <stop offset="50%" stopColor="#FF6A1A" />
          <stop offset="100%" stopColor="#C04A00" />
        </linearGradient>
        <linearGradient id="vizion-inner" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFB374" />
          <stop offset="100%" stopColor="#FF6A1A" />
        </linearGradient>
      </defs>
      {/* Outer V shape — angular, sharp, arrowhead pointing down */}
      <path
        d="M5 5 L20 36 L35 5 L27 5 L20 22 L13 5 Z"
        fill="url(#vizion-grad)"
      />
      {/* Inner highlight facet for depth — metallic/faceted feel */}
      <path
        d="M10 7 L20 30 L30 7 L25 7 L20 19 L15 7 Z"
        fill="url(#vizion-inner)"
        opacity="0.3"
      />
    </svg>
  );
}
