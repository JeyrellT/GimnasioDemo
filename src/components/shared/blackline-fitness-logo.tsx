"use client";

import { cn } from "@/lib/utils";

interface BlacklineFitnessLogoProps {
  variant?: "mark" | "wordmark" | "full";
  className?: string;
  size?: number;
}

export function BlacklineFitnessLogo({ variant = "mark", className, size }: BlacklineFitnessLogoProps) {
  if (variant === "wordmark" || variant === "full") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {variant === "full" && <BlacklineFitnessMark size={size ?? 32} />}
        <span
          className="font-bold tracking-[0.08em] uppercase"
          style={{
            fontSize: size ? size * 0.6 : 20,
            background: "linear-gradient(135deg, #93C5FD 0%, #3B82F6 50%, #1D4ED8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          BLACKLINE FITNESS
        </span>
      </div>
    );
  }
  return <BlacklineFitnessMark size={size ?? 32} className={className} />;
}

function BlacklineFitnessMark({ size = 32, className }: { size?: number; className?: string }) {
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
        <linearGradient id="bl-grad-b" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0E7FF" />
          <stop offset="50%" stopColor="#C7D2FE" />
          <stop offset="100%" stopColor="#A5B4FC" />
        </linearGradient>
        <linearGradient id="bl-grad-l" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <filter id="bl-glow">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* B — silver/white, bold geometric */}
      <path
        d="M4 6 h10 c3.5 0 6 2 6 5 c0 2.2-1.2 3.8-3.2 4.4 c2.5 0.7 4.2 2.8 4.2 5.6 c0 3.5-2.8 6-6.5 6 H4 Z M9 13.5 h4.5 c1.8 0 2.8-1 2.8-2.3 c0-1.3-1-2.2-2.8-2.2 H9 Z M9 24 h5.5 c2 0 3.2-1.2 3.2-2.7 c0-1.5-1.2-2.7-3.2-2.7 H9 Z"
        fill="url(#bl-grad-b)"
      />
      {/* L — electric blue with angular style */}
      <path
        d="M23 6 h5 v21 h8.5 v5 H23 Z"
        fill="url(#bl-grad-l)"
        filter="url(#bl-glow)"
      />
      {/* Lightning accent — diagonal slash between B and L */}
      <path
        d="M22 8 L20 20 L23 18 L21 32"
        stroke="#60A5FA"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
        filter="url(#bl-glow)"
      />
    </svg>
  );
}
