"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { useBranding } from "@/lib/branding/branding-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BodyZone =
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

export interface ZoneData {
  valueCm: number;
  deltaCm: number;
  measuredAt: Date | string;
  trendSparkline?: number[];
}

export interface BodyMapProps {
  view?: "front" | "back";
  onViewChange?: (view: "front" | "back") => void;
  zones: Record<BodyZone, ZoneData | null>;
  selectedZone?: BodyZone | null;
  onZoneClick?: (zone: BodyZone) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Spanish label map — exported for reuse by popover and table
// ---------------------------------------------------------------------------

export const BODY_ZONE_LABELS_ES: Record<BodyZone, string> = {
  neck: "Cuello",
  shoulderLeft: "Hombro izquierdo",
  shoulderRight: "Hombro derecho",
  chest: "Pecho",
  bicepLeft: "Bíceps izquierdo",
  bicepRight: "Bíceps derecho",
  forearmLeft: "Antebrazo izquierdo",
  forearmRight: "Antebrazo derecho",
  abdomen: "Abdomen",
  waist: "Cintura",
  hip: "Cadera",
  glute: "Glúteo",
  quadLeft: "Cuádriceps izquierdo",
  quadRight: "Cuádriceps derecho",
  hamstringLeft: "Isquios izquierdos",
  hamstringRight: "Isquios derechos",
  calfLeft: "Gemelo izquierdo",
  calfRight: "Gemelo derecho",
};

// ---------------------------------------------------------------------------
// Heatmap freshness helpers
// ---------------------------------------------------------------------------

type FreshnessColor = "#22C55E" | "#F59E0B" | "#EF4444" | "#3F3F46";

function getFreshnessColor(measuredAt: Date | string | null | undefined): FreshnessColor {
  if (!measuredAt) return "#3F3F46";
  const days = differenceInDays(new Date(), new Date(measuredAt));
  if (days < 14) return "#22C55E";
  if (days < 28) return "#F59E0B";
  return "#EF4444";
}

function getFreshnessOpacity(
  color: FreshnessColor,
  isSelected: boolean,
  isHovered: boolean,
): number {
  if (isSelected) return 0.55;
  if (isHovered) return 0.4;
  if (color === "#3F3F46") return 0.25;
  return 0.2;
}

// ---------------------------------------------------------------------------
// SVG path data — iconographic geometric body, viewBox 360 x 480
// Front and back layers. Paths use smooth curves for a modern fitness-app feel.
// Each path id maps to a BodyZone key.
// ---------------------------------------------------------------------------

interface ZonePath {
  zone: BodyZone;
  // Main region fill path
  d: string;
  // Center point for the hotspot circle
  cx: number;
  cy: number;
  view: "front" | "back" | "both";
}

/**
 * Front-view body silhouette — stylised, symmetric, geometric.
 * ViewBox 360×480. Body center X = 180.
 * Head top ≈ y 20, feet bottom ≈ y 468.
 */
const FRONT_PATHS: ZonePath[] = [
  // --- NECK ---
  {
    zone: "neck",
    d: "M168 68 C168 60 192 60 192 68 L194 86 C185 90 175 90 166 86 Z",
    cx: 180,
    cy: 77,
    view: "front",
  },
  // --- SHOULDER LEFT (viewer's left = body's right) ---
  {
    zone: "shoulderLeft",
    d: "M214 90 C226 87 242 94 248 108 C252 118 248 130 240 134 C232 130 222 124 216 112 Z",
    cx: 234,
    cy: 112,
    view: "front",
  },
  // --- SHOULDER RIGHT (viewer's right = body's left) ---
  {
    zone: "shoulderRight",
    d: "M146 90 C134 87 118 94 112 108 C108 118 112 130 120 134 C128 130 138 124 144 112 Z",
    cx: 126,
    cy: 112,
    view: "front",
  },
  // --- CHEST ---
  {
    zone: "chest",
    d: "M148 90 C158 86 175 84 180 84 C185 84 202 86 212 90 L216 112 C210 118 200 124 180 126 C160 124 150 118 144 112 Z",
    cx: 180,
    cy: 108,
    view: "front",
  },
  // --- BICEP LEFT ---
  {
    zone: "bicepLeft",
    d: "M240 134 C248 136 256 146 256 158 C256 168 252 178 244 182 C238 174 236 162 236 150 Z",
    cx: 248,
    cy: 158,
    view: "front",
  },
  // --- BICEP RIGHT ---
  {
    zone: "bicepRight",
    d: "M120 134 C112 136 104 146 104 158 C104 168 108 178 116 182 C122 174 124 162 124 150 Z",
    cx: 112,
    cy: 158,
    view: "front",
  },
  // --- FOREARM LEFT ---
  {
    zone: "forearmLeft",
    d: "M244 182 C250 186 258 196 260 212 C260 224 256 236 248 240 C242 232 238 218 238 206 C238 196 240 188 244 182 Z",
    cx: 250,
    cy: 212,
    view: "front",
  },
  // --- FOREARM RIGHT ---
  {
    zone: "forearmRight",
    d: "M116 182 C110 186 102 196 100 212 C100 224 104 236 112 240 C118 232 122 218 122 206 C122 196 120 188 116 182 Z",
    cx: 110,
    cy: 212,
    view: "front",
  },
  // --- ABDOMEN ---
  {
    zone: "abdomen",
    d: "M152 126 C158 124 170 122 180 122 C190 122 202 124 208 126 L210 162 C202 166 192 168 180 168 C168 168 158 166 150 162 Z",
    cx: 180,
    cy: 145,
    view: "front",
  },
  // --- WAIST ---
  {
    zone: "waist",
    d: "M150 162 C158 166 168 168 180 168 C192 168 202 166 210 162 L212 194 C204 198 192 200 180 200 C168 200 156 198 148 194 Z",
    cx: 180,
    cy: 181,
    view: "front",
  },
  // --- HIP ---
  {
    zone: "hip",
    d: "M148 194 C156 198 168 200 180 200 C192 200 204 198 212 194 L218 220 C210 228 196 234 180 234 C164 234 150 228 142 220 Z",
    cx: 180,
    cy: 214,
    view: "front",
  },
  // --- QUAD LEFT ---
  {
    zone: "quadLeft",
    d: "M188 234 C196 232 208 230 216 228 L220 310 C214 316 204 320 196 318 C190 306 188 276 188 256 Z",
    cx: 206,
    cy: 276,
    view: "front",
  },
  // --- QUAD RIGHT ---
  {
    zone: "quadRight",
    d: "M172 234 C164 232 152 230 144 228 L140 310 C146 316 156 320 164 318 C170 306 172 276 172 256 Z",
    cx: 154,
    cy: 276,
    view: "front",
  },
  // --- CALF LEFT ---
  {
    zone: "calfLeft",
    d: "M196 318 C204 320 214 322 218 326 L214 390 C210 400 202 408 196 408 C192 396 190 372 190 354 Z",
    cx: 206,
    cy: 362,
    view: "front",
  },
  // --- CALF RIGHT ---
  {
    zone: "calfRight",
    d: "M164 318 C156 320 146 322 142 326 L146 390 C150 400 158 408 164 408 C168 396 170 372 170 354 Z",
    cx: 154,
    cy: 362,
    view: "front",
  },
];

/**
 * Back-view body silhouette.
 * Shares same coordinate space. Back-only zones: glute, hamstrings.
 * Shoulders and calves reuse same approximate positions.
 */
const BACK_PATHS: ZonePath[] = [
  // --- NECK (back) ---
  {
    zone: "neck",
    d: "M168 68 C168 60 192 60 192 68 L194 86 C185 90 175 90 166 86 Z",
    cx: 180,
    cy: 77,
    view: "back",
  },
  // --- SHOULDER LEFT (back) ---
  {
    zone: "shoulderLeft",
    d: "M214 90 C226 87 242 94 248 108 C252 118 248 130 240 134 C232 130 222 124 216 112 Z",
    cx: 234,
    cy: 112,
    view: "back",
  },
  // --- SHOULDER RIGHT (back) ---
  {
    zone: "shoulderRight",
    d: "M146 90 C134 87 118 94 112 108 C108 118 112 130 120 134 C128 130 138 124 144 112 Z",
    cx: 126,
    cy: 112,
    view: "back",
  },
  // --- GLUTE (back — full hip/glute region) ---
  {
    zone: "glute",
    d: "M146 194 C154 198 166 202 180 202 C194 202 206 198 214 194 L220 232 C210 244 196 250 180 250 C164 250 150 244 140 232 Z",
    cx: 180,
    cy: 222,
    view: "back",
  },
  // --- HAMSTRING LEFT (back) ---
  {
    zone: "hamstringLeft",
    d: "M188 250 C196 248 208 246 216 244 L218 320 C212 328 202 332 194 330 C190 314 188 282 188 262 Z",
    cx: 206,
    cy: 290,
    view: "back",
  },
  // --- HAMSTRING RIGHT (back) ---
  {
    zone: "hamstringRight",
    d: "M172 250 C164 248 152 246 144 244 L142 320 C148 328 158 332 166 330 C170 314 172 282 172 262 Z",
    cx: 154,
    cy: 290,
    view: "back",
  },
  // --- CALF LEFT (back) ---
  {
    zone: "calfLeft",
    d: "M194 330 C202 332 212 334 216 338 L212 400 C208 410 200 418 194 418 C190 404 188 378 188 360 Z",
    cx: 204,
    cy: 372,
    view: "back",
  },
  // --- CALF RIGHT (back) ---
  {
    zone: "calfRight",
    d: "M166 330 C158 332 148 334 144 338 L148 400 C152 410 160 418 166 418 C170 404 172 378 172 360 Z",
    cx: 156,
    cy: 372,
    view: "back",
  },
];

// ---------------------------------------------------------------------------
// Body silhouette outline paths (non-interactive, for structure)
// ---------------------------------------------------------------------------

// Head circle params
const HEAD = { cx: 180, cy: 44, r: 28 };

// Torso outline (front and back share same shape)
const TORSO_D =
  "M148 90 C136 94 118 100 112 110 L100 240 C100 246 120 252 140 248 L142 320 L150 430 L170 432 L172 360 L188 360 L190 432 L210 430 L218 320 L220 248 C240 252 260 246 260 240 L248 110 C242 100 224 94 212 90 C202 86 192 84 180 84 C168 84 158 86 148 90 Z";

// ---------------------------------------------------------------------------
// Individual interactive zone
// ---------------------------------------------------------------------------

interface ZoneHotspotProps {
  path: ZonePath;
  data: ZoneData | null;
  isSelected: boolean;
  reducedMotion: boolean;
  onZoneClick?: (zone: BodyZone) => void;
  index: number;
}

function ZoneHotspot({
  path,
  data,
  isSelected,
  reducedMotion,
  onZoneClick,
  index,
}: ZoneHotspotProps) {
  const { palette } = useBranding();
  const [hovered, setHovered] = useState(false);

  const interactive = typeof onZoneClick === "function";

  const measuredAt = data?.measuredAt ?? null;
  const color = getFreshnessColor(measuredAt);
  const fillOpacity = getFreshnessOpacity(color, isSelected, hovered);

  const label = (() => {
    const base = BODY_ZONE_LABELS_ES[path.zone];
    if (!data) return `${base} — sin medición`;
    const days = differenceInDays(new Date(), new Date(data.measuredAt));
    const deltaStr =
      data.deltaCm >= 0 ? `+${data.deltaCm.toFixed(1)}` : data.deltaCm.toFixed(1);
    return `${base} — última medición hace ${days} día${days !== 1 ? "s" : ""}: ${data.valueCm.toFixed(1)} cm, ${deltaStr} cm`;
  })();

  const staggerDelay = reducedMotion ? 0 : index * 0.05;

  const springVariants = {
    hidden: { scale: 0.6, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        delay: staggerDelay,
        duration: reducedMotion ? 0 : 0.28,
        ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
      },
    },
  };

  function handleKeyDown(e: React.KeyboardEvent<SVGGElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onZoneClick!(path.zone);
    }
  }

  return (
    <motion.g
      key={path.zone}
      variants={springVariants}
      initial="hidden"
      animate="visible"
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={label}
      aria-pressed={interactive ? isSelected : undefined}
      style={{ cursor: interactive ? "pointer" : "default", outline: "none" }}
      onClick={interactive ? () => onZoneClick!(path.zone) : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      onMouseEnter={interactive ? () => setHovered(true) : undefined}
      onMouseLeave={interactive ? () => setHovered(false) : undefined}
      onFocus={interactive ? () => setHovered(true) : undefined}
      onBlur={interactive ? () => setHovered(false) : undefined}
      whileHover={
        interactive && !reducedMotion
          ? {
              filter: `drop-shadow(0 0 8px ${color})`,
              transition: { duration: 0.18, ease: "easeOut" },
            }
          : {}
      }
    >
      {/* Region fill — color-coded by freshness */}
      <path
        d={path.d}
        fill={color}
        fillOpacity={fillOpacity}
        stroke={isSelected ? color : "transparent"}
        strokeWidth={isSelected ? 1.5 : 0}
        style={{
          transition: reducedMotion ? "none" : "fill-opacity 0.18s ease-out",
        }}
      />

      {/* Hotspot circle indicator */}
      <circle
        cx={path.cx}
        cy={path.cy}
        r={7}
        fill={color}
        fillOpacity={hovered || isSelected ? 0.9 : 0.7}
        stroke="#09090B"
        strokeWidth={1.5}
      />

      {/* Focus ring — visible only on keyboard focus */}
      {isSelected && (
        <rect
          x={path.cx - 14}
          y={path.cy - 14}
          width={28}
          height={28}
          rx={14}
          fill="none"
          stroke={palette.primary}
          strokeWidth={2}
          strokeDasharray="0"
        />
      )}
    </motion.g>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BodyMap({
  view: controlledView,
  onViewChange,
  zones,
  selectedZone,
  onZoneClick,
  className,
}: BodyMapProps) {
  const [internalView, setInternalView] = useState<"front" | "back">("front");
  const reducedMotion = useReducedMotion() ?? false;

  const activeView = controlledView ?? internalView;

  function handleViewChange(v: string) {
    const next = v as "front" | "back";
    setInternalView(next);
    onViewChange?.(next);
  }

  const activePaths = activeView === "front" ? FRONT_PATHS : BACK_PATHS;

  // framer-motion v12 requires `ease` to be a cubic-bezier tuple (Easing type),
  // not a string. Use the canonical easeInOut bezier `[0.42, 0, 0.58, 1]`.
  const easeInOut = [0.42, 0, 0.58, 1] as const;
  const crossfadeVariants: Variants = {
    enter: { opacity: 0, scale: reducedMotion ? 1 : 0.98 },
    center: {
      opacity: 1,
      scale: 1,
      transition: { duration: reducedMotion ? 0 : 0.24, ease: easeInOut },
    },
    exit: {
      opacity: 0,
      scale: reducedMotion ? 1 : 0.98,
      transition: { duration: reducedMotion ? 0 : 0.2, ease: easeInOut },
    },
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* View toggle */}
      <Tabs value={activeView} onValueChange={handleViewChange} className="w-full">
        <TabsList className="grid w-full max-w-[200px] grid-cols-2 mx-auto">
          <TabsTrigger value="front">Frente</TabsTrigger>
          <TabsTrigger value="back">Espalda</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* SVG container — square aspect ratio, responsive */}
      <div
        className="w-full"
        style={{ maxWidth: "360px", aspectRatio: "3/4", position: "relative" }}
      >
        <svg
          viewBox="0 0 360 480"
          width="100%"
          height="100%"
          role="img"
          aria-label={`Body map — vista ${activeView === "front" ? "frontal" : "dorsal"}. Seleccioná una zona para ver sus medidas.`}
          style={{ display: "block" }}
        >
          {/* --- Static silhouette --- */}
          <g aria-hidden="true">
            {/* Head */}
            <circle
              cx={HEAD.cx}
              cy={HEAD.cy}
              r={HEAD.r}
              fill="#27272A"
              stroke="#52525B"
              strokeWidth={1.5}
            />
            {/* Torso + limbs outline */}
            <path
              d={TORSO_D}
              fill="#27272A"
              stroke="#52525B"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </g>

          {/* --- Interactive zones with crossfade on view switch --- */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.g
              key={activeView}
              variants={crossfadeVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {activePaths.map((path, i) => (
                <ZoneHotspot
                  key={`${activeView}-${path.zone}`}
                  path={path}
                  data={zones[path.zone]}
                  isSelected={selectedZone === path.zone}
                  reducedMotion={reducedMotion}
                  onZoneClick={onZoneClick}
                  index={i}
                />
              ))}
            </motion.g>
          </AnimatePresence>
        </svg>
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap justify-center gap-x-4 gap-y-1.5"
        aria-label="Leyenda de frescura de medición"
      >
        {(
          [
            { color: "#22C55E", label: "< 2 sem" },
            { color: "#F59E0B", label: "2-4 sem" },
            { color: "#EF4444", label: "> 4 sem" },
            { color: "#3F3F46", label: "Sin medir" },
          ] as const
        ).map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-[#71717A]">
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
