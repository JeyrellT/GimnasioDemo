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
  // Unique IDs to avoid SVG gradient collisions when multiple instances render
  const uid = "blm";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Background circle gradient */}
        <radialGradient id={`${uid}-bg`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="#2A2A2E" />
          <stop offset="100%" stopColor="#111113" />
        </radialGradient>

        {/* Metallic silver gradient for the B */}
        <linearGradient id={`${uid}-silver`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ECEFF1" />
          <stop offset="35%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#B0BEC5" />
          <stop offset="100%" stopColor="#78909C" />
        </linearGradient>

        {/* Electric blue gradient for the L */}
        <linearGradient id={`${uid}-blue`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Bright blue for lightning bolt */}
        <linearGradient id={`${uid}-bolt`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="50%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>

        {/* Blue glow filter */}
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feFlood floodColor="#3B82F6" floodOpacity="0.6" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Subtle outer glow for the bolt */}
        <filter id={`${uid}-bolt-glow`} x="-60%" y="-20%" width="220%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feFlood floodColor="#60A5FA" floodOpacity="0.8" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Background circle ────────────────────────────────────────── */}
      <circle cx="32" cy="32" r="31" fill={`url(#${uid}-bg)`} />
      <circle cx="32" cy="32" r="31" fill="none" stroke="#3F3F46" strokeWidth="0.8" opacity="0.5" />

      {/* Letters group — shifted down 6px to center vertically in circle */}
      <g transform="translate(1, 6)">
        {/* ── B letter — angular, bold, metallic ───────────────────── */}
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
          fill={`url(#${uid}-silver)`}
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
          fill="#1A1A1D"
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
          fill="#1A1A1D"
        />

        {/* ── L letter — bold, angular, electric blue ──────────────── */}
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
          fill={`url(#${uid}-blue)`}
          filter={`url(#${uid}-glow)`}
        />

        {/* ── Lightning bolt ───────────────────────────────────────── */}
        <path
          d={[
            "M 37 2",
            "L 31 24",
            "L 36 21",
            "L 29 50",
          ].join(" ")}
          stroke={`url(#${uid}-bolt)`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter={`url(#${uid}-bolt-glow)`}
        />

        {/* Lightning bolt bright core */}
        <path
          d={[
            "M 37 2",
            "L 31 24",
            "L 36 21",
            "L 29 50",
          ].join(" ")}
          stroke="white"
          strokeWidth="0.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.6"
        />
      </g>
    </svg>
  );
}
