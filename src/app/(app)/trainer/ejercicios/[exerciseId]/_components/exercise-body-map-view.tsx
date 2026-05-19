"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { MuscleGroup } from "@prisma/client";
import { MUSCLE_LABELS } from "@/lib/constants/exercise-display";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BodyZone =
  | "neck"
  | "shoulderLeft"
  | "shoulderRight"
  | "chest"
  | "bicepLeft"
  | "bicepRight"
  | "forearmLeft"
  | "forearmRight"
  | "abdomen"
  | "waist"
  | "hip"
  | "glute"
  | "quadLeft"
  | "quadRight"
  | "hamstringLeft"
  | "hamstringRight"
  | "calfLeft"
  | "calfRight";

export interface ExerciseBodyMapViewProps {
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
}

// ---------------------------------------------------------------------------
// Muscle → BodyZone mapping
// ---------------------------------------------------------------------------

const MUSCLE_TO_ZONES: Record<MuscleGroup, BodyZone[]> = {
  CHEST: ["chest"],
  BACK: ["shoulderLeft", "shoulderRight"],
  SHOULDERS: ["shoulderLeft", "shoulderRight"],
  BICEPS: ["bicepLeft", "bicepRight"],
  TRICEPS: ["bicepLeft", "bicepRight"],
  FOREARMS: ["forearmLeft", "forearmRight"],
  ABS: ["abdomen"],
  OBLIQUES: ["waist"],
  GLUTES: ["glute"],
  QUADS: ["quadLeft", "quadRight"],
  HAMSTRINGS: ["hamstringLeft", "hamstringRight"],
  CALVES: ["calfLeft", "calfRight"],
  NECK: ["neck"],
  FULL_BODY: ["chest", "abdomen", "quadLeft", "quadRight", "shoulderLeft", "shoulderRight"],
};

// Reverse map: zone → muscle enum key (first match wins)
const ZONE_TO_MUSCLE: Partial<Record<BodyZone, MuscleGroup>> = {} as Partial<
  Record<BodyZone, MuscleGroup>
>;
(Object.entries(MUSCLE_TO_ZONES) as [MuscleGroup, BodyZone[]][]).forEach(([muscle, zones]) => {
  zones.forEach((zone) => {
    if (!(zone in ZONE_TO_MUSCLE)) {
      ZONE_TO_MUSCLE[zone] = muscle;
    }
  });
});

// ---------------------------------------------------------------------------
// SVG path data (copied from src/components/charts/body-map.tsx)
// ViewBox 360×480, body center X=180.
// ---------------------------------------------------------------------------

interface ZonePath {
  zone: BodyZone;
  d: string;
  view: "front" | "back";
}

const FRONT_PATHS: ZonePath[] = [
  {
    zone: "neck",
    d: "M168 68 C168 60 192 60 192 68 L194 86 C185 90 175 90 166 86 Z",
    view: "front",
  },
  {
    zone: "shoulderLeft",
    d: "M214 90 C226 87 242 94 248 108 C252 118 248 130 240 134 C232 130 222 124 216 112 Z",
    view: "front",
  },
  {
    zone: "shoulderRight",
    d: "M146 90 C134 87 118 94 112 108 C108 118 112 130 120 134 C128 130 138 124 144 112 Z",
    view: "front",
  },
  {
    zone: "chest",
    d: "M148 90 C158 86 175 84 180 84 C185 84 202 86 212 90 L216 112 C210 118 200 124 180 126 C160 124 150 118 144 112 Z",
    view: "front",
  },
  {
    zone: "bicepLeft",
    d: "M240 134 C248 136 256 146 256 158 C256 168 252 178 244 182 C238 174 236 162 236 150 Z",
    view: "front",
  },
  {
    zone: "bicepRight",
    d: "M120 134 C112 136 104 146 104 158 C104 168 108 178 116 182 C122 174 124 162 124 150 Z",
    view: "front",
  },
  {
    zone: "forearmLeft",
    d: "M244 182 C250 186 258 196 260 212 C260 224 256 236 248 240 C242 232 238 218 238 206 C238 196 240 188 244 182 Z",
    view: "front",
  },
  {
    zone: "forearmRight",
    d: "M116 182 C110 186 102 196 100 212 C100 224 104 236 112 240 C118 232 122 218 122 206 C122 196 120 188 116 182 Z",
    view: "front",
  },
  {
    zone: "abdomen",
    d: "M152 126 C158 124 170 122 180 122 C190 122 202 124 208 126 L210 162 C202 166 192 168 180 168 C168 168 158 166 150 162 Z",
    view: "front",
  },
  {
    zone: "waist",
    d: "M150 162 C158 166 168 168 180 168 C192 168 202 166 210 162 L212 194 C204 198 192 200 180 200 C168 200 156 198 148 194 Z",
    view: "front",
  },
  {
    zone: "hip",
    d: "M148 194 C156 198 168 200 180 200 C192 200 204 198 212 194 L218 220 C210 228 196 234 180 234 C164 234 150 228 142 220 Z",
    view: "front",
  },
  {
    zone: "quadLeft",
    d: "M188 234 C196 232 208 230 216 228 L220 310 C214 316 204 320 196 318 C190 306 188 276 188 256 Z",
    view: "front",
  },
  {
    zone: "quadRight",
    d: "M172 234 C164 232 152 230 144 228 L140 310 C146 316 156 320 164 318 C170 306 172 276 172 256 Z",
    view: "front",
  },
  {
    zone: "calfLeft",
    d: "M196 318 C204 320 214 322 218 326 L214 390 C210 400 202 408 196 408 C192 396 190 372 190 354 Z",
    view: "front",
  },
  {
    zone: "calfRight",
    d: "M164 318 C156 320 146 322 142 326 L146 390 C150 400 158 408 164 408 C168 396 170 372 170 354 Z",
    view: "front",
  },
];

const BACK_PATHS: ZonePath[] = [
  {
    zone: "neck",
    d: "M168 68 C168 60 192 60 192 68 L194 86 C185 90 175 90 166 86 Z",
    view: "back",
  },
  {
    zone: "shoulderLeft",
    d: "M214 90 C226 87 242 94 248 108 C252 118 248 130 240 134 C232 130 222 124 216 112 Z",
    view: "back",
  },
  {
    zone: "shoulderRight",
    d: "M146 90 C134 87 118 94 112 108 C108 118 112 130 120 134 C128 130 138 124 144 112 Z",
    view: "back",
  },
  {
    zone: "glute",
    d: "M146 194 C154 198 166 202 180 202 C194 202 206 198 214 194 L220 232 C210 244 196 250 180 250 C164 250 150 244 140 232 Z",
    view: "back",
  },
  {
    zone: "hamstringLeft",
    d: "M188 250 C196 248 208 246 216 244 L218 320 C212 328 202 332 194 330 C190 314 188 282 188 262 Z",
    view: "back",
  },
  {
    zone: "hamstringRight",
    d: "M172 250 C164 248 152 246 144 244 L142 320 C148 328 158 332 166 330 C170 314 172 282 172 262 Z",
    view: "back",
  },
  {
    zone: "calfLeft",
    d: "M194 330 C202 332 212 334 216 338 L212 400 C208 410 200 418 194 418 C190 404 188 378 188 360 Z",
    view: "back",
  },
  {
    zone: "calfRight",
    d: "M166 330 C158 332 148 334 144 338 L148 400 C152 410 160 418 166 418 C170 404 172 378 172 360 Z",
    view: "back",
  },
];

const HEAD = { cx: 180, cy: 44, r: 28 };
const TORSO_D =
  "M148 90 C136 94 118 100 112 110 L100 240 C100 246 120 252 140 248 L142 320 L150 430 L170 432 L172 360 L188 360 L190 432 L210 430 L218 320 L220 248 C240 252 260 246 260 240 L248 110 C242 100 224 94 212 90 C202 86 192 84 180 84 C168 84 158 86 148 90 Z";

// ---------------------------------------------------------------------------
// Zone fill color helpers
// ---------------------------------------------------------------------------

type ZoneRole = "primary" | "secondary" | "other";

function getZoneFill(
  role: ZoneRole,
  hovered: boolean,
): { fill: string; fillOpacity: number; filter?: string } {
  switch (role) {
    case "primary":
      return { fill: "#3B82F6", fillOpacity: hovered ? 0.8 : 0.6, filter: "url(#glow-primary)" };
    case "secondary":
      return { fill: "#F59E0B", fillOpacity: hovered ? 0.55 : 0.35 };
    default:
      return { fill: "#FAFAFA", fillOpacity: 0.05 };
  }
}

// ---------------------------------------------------------------------------
// Single SVG body view (with hover interactivity)
// ---------------------------------------------------------------------------

interface BodySvgProps {
  paths: ZonePath[];
  primaryZones: Set<BodyZone>;
  secondaryZones: Set<BodyZone>;
  label: string;
  hoveredZone: BodyZone | null;
  onZoneEnter: (zone: BodyZone) => void;
  onZoneLeave: () => void;
}

function BodySvg({
  paths,
  primaryZones,
  secondaryZones,
  label,
  hoveredZone,
  onZoneEnter,
  onZoneLeave,
}: BodySvgProps) {
  return (
    <svg
      viewBox="0 0 360 480"
      width="160"
      height="213"
      role="img"
      aria-label={label}
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* Glow filter for primary muscle */}
      <defs>
        <filter id="glow-primary" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Static silhouette */}
      <g aria-hidden="true">
        <circle
          cx={HEAD.cx}
          cy={HEAD.cy}
          r={HEAD.r}
          fill="#27272A"
          stroke="#52525B"
          strokeWidth={1.5}
        />
        <path
          d={TORSO_D}
          fill="#27272A"
          stroke="#52525B"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </g>

      {/* Zone fills — interactive for primary/secondary */}
      {paths.map((p) => {
        const role: ZoneRole = primaryZones.has(p.zone)
          ? "primary"
          : secondaryZones.has(p.zone)
            ? "secondary"
            : "other";
        const isHovered = hoveredZone === p.zone;
        const { fill, fillOpacity, filter } = getZoneFill(role, isHovered);
        const isInteractive = role !== "other";
        return (
          <path
            key={p.zone + p.view}
            d={p.d}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={role === "primary" ? "#3B82F6" : role === "secondary" ? "#F59E0B" : "none"}
            strokeWidth={role !== "other" ? 1 : 0}
            strokeOpacity={role === "primary" ? 0.8 : 0.5}
            filter={filter}
            style={{
              cursor: isInteractive ? "pointer" : undefined,
              transition: "fill-opacity 0.15s ease",
            }}
            onMouseEnter={isInteractive ? () => onZoneEnter(p.zone) : undefined}
            onMouseLeave={isInteractive ? onZoneLeave : undefined}
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const } },
};

export function ExerciseBodyMapView({ primaryMuscle, secondaryMuscles }: ExerciseBodyMapViewProps) {
  const primaryZones = new Set<BodyZone>(MUSCLE_TO_ZONES[primaryMuscle] ?? []);
  const secondaryZones = new Set<BodyZone>(
    secondaryMuscles.flatMap((m) => MUSCLE_TO_ZONES[m] ?? []),
  );

  const [hoveredZone, setHoveredZone] = useState<BodyZone | null>(null);

  // Resolve the muscle label for the hovered zone
  const hoveredMuscle = hoveredZone ? ZONE_TO_MUSCLE[hoveredZone] : null;
  const tooltipLabel = hoveredMuscle ? (MUSCLE_LABELS[hoveredMuscle] ?? hoveredMuscle) : null;

  return (
    <motion.div {...fadeIn} className="flex flex-col items-center gap-4">
      {/* Dual view: front + back */}
      <div className="relative flex items-start justify-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-widest text-[#71717A]">
            Frente
          </span>
          <BodySvg
            paths={FRONT_PATHS}
            primaryZones={primaryZones}
            secondaryZones={secondaryZones}
            label="Vista frontal del cuerpo con músculos marcados"
            hoveredZone={hoveredZone}
            onZoneEnter={setHoveredZone}
            onZoneLeave={() => setHoveredZone(null)}
          />
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-widest text-[#71717A]">
            Espalda
          </span>
          <BodySvg
            paths={BACK_PATHS}
            primaryZones={primaryZones}
            secondaryZones={secondaryZones}
            label="Vista dorsal del cuerpo con músculos marcados"
            hoveredZone={hoveredZone}
            onZoneEnter={setHoveredZone}
            onZoneLeave={() => setHoveredZone(null)}
          />
        </div>

        {/* Floating tooltip */}
        {tooltipLabel && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
            aria-hidden="true"
          >
            <div className="rounded-md border border-[#3F3F46] bg-[#09090B]/95 px-2.5 py-1 shadow-lg">
              <span className="text-xs font-semibold text-[#FAFAFA] whitespace-nowrap">
                {tooltipLabel}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        className="flex items-center gap-5"
        aria-label="Leyenda del mapa muscular"
      >
        <span className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "#3B82F6", flexShrink: 0 }}
          />
          Primario
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "#F59E0B", flexShrink: 0 }}
          />
          Secundario
        </span>
      </div>
    </motion.div>
  );
}
