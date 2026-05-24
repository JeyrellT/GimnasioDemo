"use client";

import { cn } from "@/lib/utils";

interface BlacklineFitnessLogoProps {
  variant?: "mark" | "wordmark" | "full";
  className?: string;
  size?: number;
}

export function BlacklineFitnessLogo({
  variant = "mark",
  className,
  size,
}: BlacklineFitnessLogoProps) {
  if (variant === "wordmark" || variant === "full") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        {variant === "full" && <BlacklineFitnessMark size={size ?? 32} />}
        <div className="flex flex-col leading-none" style={{ gap: 1 }}>
          <span
            className="font-black tracking-[0.12em] uppercase"
            style={{
              fontSize: size ? size * 0.48 : 15,
              background:
                "linear-gradient(180deg, #FFFFFF 0%, #B0BEC5 50%, #78909C 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            BLACKLINE
          </span>
          <span
            className="font-semibold tracking-[0.35em] uppercase"
            style={{
              fontSize: size ? size * 0.26 : 8,
              color: "var(--brand-primary)",
              borderTop: "1.5px solid var(--brand-primary)",
              paddingTop: 2,
            }}
          >
            FITNESS
          </span>
        </div>
      </div>
    );
  }
  return <BlacklineFitnessMark size={size ?? 32} className={className} />;
}

function BlacklineFitnessMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* ── Background circle — LIGHT GRAY for max contrast on dark UIs ── */}
      <circle cx="32" cy="32" r="31" fill="#3A3A42" />
      <circle cx="32" cy="32" r="31" fill="none" stroke="#62626C" strokeWidth="1.5" />

      {/* Letters group — centered in circle */}
      <g transform="translate(1, 6)">
        {/* ── B letter — SOLID WHITE for maximum visibility ─────── */}
        <path
          d={[
            "M 6 6",
            "L 24 6",
            "L 29 10",
            "L 29 19",
            "L 25 23",
            "L 30 27",
            "L 30 40",
            "L 25 45",
            "L 6 45",
            "Z",
          ].join(" ")}
          fill="#FFFFFF"
        />
        {/* Top bowl cutout */}
        <path
          d={[
            "M 14 13",
            "L 22 13",
            "L 24 15",
            "L 24 19",
            "L 22 21",
            "L 14 21",
            "Z",
          ].join(" ")}
          fill="#3A3A42"
        />
        {/* Bottom bowl cutout */}
        <path
          d={[
            "M 14 28",
            "L 23 28",
            "L 25 30",
            "L 25 37",
            "L 23 39",
            "L 14 39",
            "Z",
          ].join(" ")}
          fill="#3A3A42"
        />

        {/* ── L letter — SOLID BRIGHT BLUE for max visibility ──── */}
        <path
          d={[
            "M 33 6",
            "L 40 6",
            "L 40 39",
            "L 54 39",
            "L 54 45",
            "L 33 45",
            "Z",
          ].join(" ")}
          fill="#3B82F6"
        />

        {/* ── Lightning bolt — PURE WHITE, thick ───────────────── */}
        <path
          d={[
            "M 37 2",
            "L 31 24",
            "L 36 21",
            "L 29 50",
          ].join(" ")}
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
