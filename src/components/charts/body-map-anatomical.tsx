"use client";

// =============================================================================
// BodyMapAnatomical — Anatomically detailed body map for client circumference
// measurements (perfil del cliente). Drop-in replacement for BodyMap.
//
// Visual quality: exercise body map (anatomical SVG paths, glow filters).
// Semantics:      circumference zones with laterality + freshness heatmap.
//
// ViewBox: 0 0 200 460 — matches exercise-body-map-view.tsx coordinate space.
// Body center X = 100.  SVG is a mirror: viewer's LEFT = body's RIGHT.
// =============================================================================

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { differenceInDays } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Re-export the public API of body-map.tsx so callers can migrate by changing
// only the import path — no other code changes needed.
// ---------------------------------------------------------------------------
export type {
  BodyZone,
  ZoneData,
  BodyMapProps,
} from "./body-map";
export { BODY_ZONE_LABELS_ES } from "./body-map";
import type { BodyZone, ZoneData, BodyMapProps } from "./body-map";
import { BODY_ZONE_LABELS_ES } from "./body-map";

// ---------------------------------------------------------------------------
// Heatmap freshness — same thresholds as body-map.tsx
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
// SVG outlines — copied verbatim from exercise-body-map-view.tsx
// ViewBox 0 0 200 460, body center X = 100.
// ---------------------------------------------------------------------------

const HEAD_FRONT =
  "M100,8 C113,8 122,18 122,32 C122,46 113,56 100,56 C87,56 78,46 78,32 C78,18 87,8 100,8 Z";

const HEAD_BACK = HEAD_FRONT;

const BODY_OUTLINE_FRONT =
  "M90,56 C86,58 82,62 78,68 C70,72 58,76 48,84 C40,90 36,100 34,112 L30,148 C28,172 30,196 34,216 C32,230 28,252 28,270 L22,284 C18,292 22,296 28,292 L36,280 C38,270 42,258 42,246 L46,218 C46,210 48,202 52,196 L56,200 C56,216 58,236 60,258 C62,286 62,316 64,346 C66,374 68,400 72,424 L78,440 L86,444 L94,442 C92,420 90,394 88,368 C84,328 84,286 86,250 C88,238 92,226 96,218 L100,214 L104,218 C108,226 112,238 114,250 C116,286 116,328 112,368 C110,394 108,420 106,442 L114,444 L122,440 L128,424 C132,400 134,374 136,346 C138,316 138,286 140,258 C142,236 144,216 144,200 L148,196 C152,202 154,210 154,218 L158,246 C158,258 162,270 164,280 L172,292 C178,296 182,292 178,284 L172,270 C172,252 168,230 166,216 C170,196 172,172 170,148 L166,112 C164,100 160,90 152,84 C142,76 130,72 122,68 C118,62 114,58 110,56 Z";

const BODY_OUTLINE_BACK =
  "M90,56 C86,58 82,62 78,68 C70,72 58,76 48,84 C40,90 36,100 34,112 L30,148 C28,172 30,196 34,216 C32,230 28,252 28,270 L22,284 C18,292 22,296 28,292 L36,280 C38,270 42,258 42,246 L46,218 C46,210 48,202 52,196 L56,200 C56,216 58,236 60,258 C62,286 62,316 64,346 C66,374 68,400 72,424 L78,440 L86,444 L94,442 C92,420 90,394 88,368 C84,328 84,286 86,250 C88,238 92,226 96,218 L100,214 L104,218 C108,226 112,238 114,250 C116,286 116,328 112,368 C110,394 108,420 106,442 L114,444 L122,440 L128,424 C132,400 134,374 136,346 C138,316 138,286 140,258 C142,236 144,216 144,200 L148,196 C152,202 154,210 154,218 L158,246 C158,258 162,270 164,280 L172,292 C178,296 182,292 178,284 L172,270 C172,252 168,230 166,216 C170,196 172,172 170,148 L166,112 C164,100 160,90 152,84 C142,76 130,72 122,68 C118,62 114,58 110,56 Z";

// ---------------------------------------------------------------------------
// Zone path definitions
//
// Anatomical path data sourced from exercise-body-map-view.tsx FRONT_ZONES /
// BACK_ZONES.  Each entry maps one BodyZone to one path segment.  Zones with
// multiple anatomical sub-regions (e.g. chest = pec-L + pec-R) appear as two
// entries sharing the same `zone` value — hover/click highlights both.
//
// Mirror reminder (viewBox X=0 is viewer's LEFT = body's RIGHT):
//   bicepLeft  = left side of body  = right side of screen = high-X paths
//   bicepRight = right side of body = left side of screen  = low-X paths
// ---------------------------------------------------------------------------

interface ZonePath {
  /** BodyZone this path belongs to */
  zone: BodyZone;
  /** SVG path data */
  d: string;
  /** Which view renders this path */
  view: "front" | "back" | "both";
}

// ---------------------------------------------------------------------------
// FRONT zone paths
// ---------------------------------------------------------------------------

const FRONT_ZONE_PATHS: ZonePath[] = [
  // ── Neck (sternocleidomastoid, both heads visible from front) ──
  { zone: "neck", view: "front", d: "M92,56 C90,60 88,68 87,74 L93,76 C94,70 94,62 94,58 Z" },
  { zone: "neck", view: "front", d: "M108,56 C110,60 112,68 113,74 L107,76 C106,70 106,62 106,58 Z" },

  // ── Shoulders — viewer's RIGHT = body's LEFT ──
  // shoulderLeft  = delt-FL (left side of body, right side of screen)
  { zone: "shoulderLeft", view: "front", d: "M118,82 C128,76 142,78 150,86 C154,92 154,100 152,108 L144,106 C140,96 134,88 126,84 L118,82 Z" },
  // shoulderRight = delt-FR (right side of body, left side of screen)
  { zone: "shoulderRight", view: "front", d: "M82,82 C72,76 58,78 50,86 C46,92 46,100 48,108 L56,106 C60,96 66,88 74,84 L82,82 Z" },

  // ── Chest — both pec-L and pec-R grouped; clicking either selects "chest" ──
  { zone: "chest", view: "front", d: "M97,82 C92,82 82,84 76,90 C66,98 58,106 56,112 L58,120 C64,126 76,130 88,130 L97,128 C98,116 98,98 97,82 Z" },
  { zone: "chest", view: "front", d: "M103,82 C108,82 118,84 124,90 C134,98 142,106 144,112 L142,120 C136,126 124,130 112,130 L103,128 C102,116 102,98 103,82 Z" },

  // ── Biceps ──
  // bicepLeft  = body's left arm = viewer's right = high-X (bicep-L in exercise map)
  { zone: "bicepLeft", view: "front", d: "M154,112 C158,118 162,130 164,144 C166,158 164,170 160,178 L152,180 C148,172 146,158 146,144 C146,130 148,120 152,114 Z" },
  // bicepRight = body's right arm = viewer's left = low-X (bicep-R in exercise map)
  { zone: "bicepRight", view: "front", d: "M46,112 C42,118 38,130 36,144 C34,158 36,170 40,178 L48,180 C52,172 54,158 54,144 C54,130 52,120 48,114 Z" },

  // ── Forearms ──
  // forearmLeft  = body's left = viewer's right = high-X (forearm-FR in exercise map naming)
  { zone: "forearmLeft", view: "front", d: "M160,184 C164,192 168,206 170,222 C172,240 170,256 166,268 L158,266 C156,254 156,236 156,220 C156,204 158,192 160,184 Z" },
  // forearmRight = body's right = viewer's left = low-X
  { zone: "forearmRight", view: "front", d: "M40,184 C36,192 32,206 30,222 C28,240 30,256 34,268 L42,266 C44,254 44,236 44,220 C44,204 42,192 40,184 Z" },

  // ── Abdomen — upper 4 abs blocks (abs-up-L/R + abs-mid-L/R) ──
  { zone: "abdomen", view: "front", d: "M97,130 L97,150 C95,150 92,150 90,150 L88,130 C90,130 94,130 97,130 Z" },
  { zone: "abdomen", view: "front", d: "M103,130 L103,150 C105,150 108,150 110,150 L112,130 C110,130 106,130 103,130 Z" },
  { zone: "abdomen", view: "front", d: "M97,152 L97,174 C95,174 92,175 90,175 L88,152 C90,152 94,152 97,152 Z" },
  { zone: "abdomen", view: "front", d: "M103,152 L103,174 C105,174 108,175 110,175 L112,152 C110,152 106,152 103,152 Z" },

  // ── Waist — lower abs + obliques (measurement at navel/waist level) ──
  { zone: "waist", view: "front", d: "M97,176 L97,198 C94,200 91,200 88,198 L88,176 C91,176 94,176 97,176 Z" },
  { zone: "waist", view: "front", d: "M103,176 L103,198 C106,200 109,200 112,198 L112,176 C109,176 106,176 103,176 Z" },
  { zone: "waist", view: "front", d: "M86,132 C78,132 68,134 62,138 L60,170 C62,180 66,190 72,196 L86,200 L86,132 Z" },
  { zone: "waist", view: "front", d: "M114,132 C122,132 132,134 138,138 L140,170 C138,180 134,190 128,196 L114,200 L114,132 Z" },

  // ── Hip — NEW paths (no direct muscle analog; circumferential pelvic zone).
  //    Drawn as a wide, shallow arc band that sits between waist (y≈200) and
  //    quads (y≈210). Spans laterally past the obliques to capture the iliac
  //    crest and greater trochanter region.
  //    Left side of hip (body's left = viewer's right):
  { zone: "hip", view: "front", d: "M100,200 C112,200 128,202 140,208 C148,212 154,218 152,224 C146,228 132,230 118,228 C110,226 104,222 100,220 Z" },
  //    Right side of hip (body's right = viewer's left):
  { zone: "hip", view: "front", d: "M100,200 C88,200 72,202 60,208 C52,212 46,218 48,224 C54,228 68,230 82,228 C90,226 96,222 100,220 Z" },

  // ── Quads ──
  // quadLeft = body's left leg = viewer's right = high-X paths
  { zone: "quadLeft", view: "front", d: "M128,210 C136,214 144,224 148,240 C152,260 150,286 146,310 L138,318 C136,296 136,268 134,244 C132,228 130,218 128,210 Z" },
  { zone: "quadLeft", view: "front", d: "M110,206 C106,210 104,220 104,234 L106,310 L116,318 C118,296 120,268 120,244 C120,224 116,212 110,206 Z" },
  { zone: "quadLeft", view: "front", d: "M128,210 C122,208 116,206 110,206 L120,244 C124,244 128,244 132,244 L128,210 Z" },
  // quadRight = body's right leg = viewer's left = low-X paths
  { zone: "quadRight", view: "front", d: "M72,210 C64,214 56,224 52,240 C48,260 50,286 54,310 L62,318 C64,296 64,268 66,244 C68,228 70,218 72,210 Z" },
  { zone: "quadRight", view: "front", d: "M90,206 C94,210 96,220 96,234 L94,310 L84,318 C82,296 80,268 80,244 C80,224 84,212 90,206 Z" },
  { zone: "quadRight", view: "front", d: "M72,210 C78,208 84,206 90,206 L80,244 C76,244 72,244 68,244 L72,210 Z" },

  // ── Calves (front = tibialis anterior) ──
  // calfLeft  = body's left calf = viewer's right = calf-FR in exercise map
  { zone: "calfLeft", view: "front", d: "M140,326 C144,334 148,352 148,372 C148,390 144,406 138,418 L130,420 C128,404 128,384 130,366 C132,348 134,336 138,326 Z" },
  // calfRight = body's right calf = viewer's left = calf-FL
  { zone: "calfRight", view: "front", d: "M60,326 C56,334 52,352 52,372 C52,390 56,406 62,418 L70,420 C72,404 72,384 70,366 C68,348 66,336 62,326 Z" },
];

// ---------------------------------------------------------------------------
// BACK zone paths
// ---------------------------------------------------------------------------

const BACK_ZONE_PATHS: ZonePath[] = [
  // ── Neck (posterior) ──
  { zone: "neck", view: "back", d: "M93,56 L107,56 L110,72 C106,75 94,75 90,72 Z" },

  // ── Shoulders ──
  // shoulderLeft  = delt-BL (body's left = viewer's right = high-X)
  { zone: "shoulderLeft", view: "back", d: "M140,86 C148,82 158,84 162,92 C166,100 164,110 160,118 L148,114 C144,104 142,94 140,86 Z" },
  // shoulderRight = delt-BR (body's right = viewer's left = low-X)
  { zone: "shoulderRight", view: "back", d: "M60,86 C52,82 42,84 38,92 C34,100 36,110 40,118 L52,114 C56,104 58,94 60,86 Z" },

  // ── Glutes — back-only zone; both glute-L and glute-R ──
  // glute-L = body's left glute = viewer's right
  { zone: "glute", view: "back", d: "M104,204 C114,204 130,210 138,222 C144,234 144,248 138,258 L114,262 C108,254 104,242 104,228 L104,204 Z" },
  // glute-R = body's right glute = viewer's left
  { zone: "glute", view: "back", d: "M96,204 C86,204 70,210 62,222 C56,234 56,248 62,258 L86,262 C92,254 96,242 96,228 L96,204 Z" },

  // ── Hamstrings ──
  // hamstringLeft = body's left hamstring = viewer's right = high-X (ham-outer-R + ham-inner-R)
  { zone: "hamstringLeft", view: "back", d: "M138,264 C144,270 148,284 148,302 C148,318 144,330 138,336 L128,334 C126,318 126,298 128,280 C130,272 134,266 138,264 Z" },
  { zone: "hamstringLeft", view: "back", d: "M110,264 C106,270 104,284 104,302 C104,318 106,330 110,336 L120,334 C122,318 122,298 120,280 C118,272 114,266 110,264 Z" },
  // hamstringRight = body's right hamstring = viewer's left = low-X (ham-outer-L + ham-inner-L)
  { zone: "hamstringRight", view: "back", d: "M62,264 C56,270 52,284 52,302 C52,318 56,330 62,336 L72,334 C74,318 74,298 72,280 C70,272 66,266 62,264 Z" },
  { zone: "hamstringRight", view: "back", d: "M90,264 C94,270 96,284 96,302 C96,318 94,330 90,336 L80,334 C78,318 78,298 80,280 C82,272 86,266 90,264 Z" },

  // ── Calves (back = gastrocnemius, two heads) ──
  // calfLeft = body's left = viewer's right = gastroc-R-out + gastroc-R-in
  { zone: "calfLeft", view: "back", d: "M142,340 C146,348 150,364 150,382 C150,398 146,412 140,420 L132,418 C132,402 134,380 134,364 C134,352 136,344 140,340 Z" },
  { zone: "calfLeft", view: "back", d: "M120,340 C116,348 114,364 114,382 C114,398 116,412 120,420 L128,418 C128,402 126,380 126,364 C126,352 124,344 120,340 Z" },
  // calfRight = body's right = viewer's left = gastroc-L-out + gastroc-L-in
  { zone: "calfRight", view: "back", d: "M58,340 C54,348 50,364 50,382 C50,398 54,412 60,420 L68,418 C68,402 66,380 66,364 C66,352 64,344 60,340 Z" },
  { zone: "calfRight", view: "back", d: "M80,340 C84,348 86,364 86,382 C86,398 84,412 80,420 L72,418 C72,402 74,380 74,364 C74,352 76,344 80,340 Z" },
];

// ---------------------------------------------------------------------------
// Glow filter IDs — one per freshness color bucket, keyed by hex.
// Using per-instance IDs (suffixed with the component instanceId) prevents
// collision when two BodyMapAnatomical instances appear on the same page.
// ---------------------------------------------------------------------------

const GLOW_FILTER_IDS: Record<FreshnessColor, string> = {
  "#22C55E": "bma-glow-green",
  "#F59E0B": "bma-glow-amber",
  "#EF4444": "bma-glow-red",
  "#3F3F46": "bma-glow-zinc",
};

// ---------------------------------------------------------------------------
// ZonePaths — interactive group rendered for each path entry
// ---------------------------------------------------------------------------

interface ZonePathProps {
  entry: ZonePath;
  data: ZoneData | null;
  /** True when the zone this path belongs to is selected */
  isSelected: boolean;
  /** True when the zone this path belongs to is hovered (any of its paths) */
  isHovered: boolean;
  reducedMotion: boolean;
  onZoneClick?: (zone: BodyZone) => void;
  onZoneHoverChange: (zone: BodyZone, hovered: boolean) => void;
  /** Stagger index for enter animation */
  index: number;
}

function ZonePathShape({
  entry,
  data,
  isSelected,
  isHovered,
  reducedMotion,
  onZoneClick,
  onZoneHoverChange,
  index,
}: ZonePathProps) {
  const interactive = typeof onZoneClick === "function";
  const measuredAt = data?.measuredAt ?? null;
  const color = getFreshnessColor(measuredAt);
  const fillOpacity = getFreshnessOpacity(color, isSelected, isHovered);
  const glowId = GLOW_FILTER_IDS[color];

  const label = (() => {
    const base = BODY_ZONE_LABELS_ES[entry.zone];
    if (!data) return `${base} — sin medición`;
    const days = differenceInDays(new Date(), new Date(data.measuredAt));
    const deltaStr =
      data.deltaCm >= 0 ? `+${data.deltaCm.toFixed(1)}` : data.deltaCm.toFixed(1);
    return `${base} — ${data.valueCm.toFixed(1)} cm (${deltaStr} cm), hace ${days}d`;
  })();

  const staggerDelay = reducedMotion ? 0 : index * 0.04;

  const pathVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay: staggerDelay,
        duration: reducedMotion ? 0 : 0.24,
        ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
      },
    },
  };

  function handleKeyDown(e: React.KeyboardEvent<SVGPathElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onZoneClick?.(entry.zone);
    }
  }

  return (
    <motion.path
      variants={pathVariants}
      initial="hidden"
      animate="visible"
      d={entry.d}
      fill={color}
      fillOpacity={fillOpacity}
      stroke={isSelected ? color : isHovered ? color : "transparent"}
      strokeWidth={isSelected ? 1.4 : isHovered ? 0.8 : 0}
      strokeLinejoin="round"
      filter={isSelected || isHovered ? `url(#${glowId})` : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={label}
      aria-pressed={interactive ? isSelected : undefined}
      style={{
        cursor: interactive ? "pointer" : "default",
        outline: "none",
        transition: reducedMotion
          ? "none"
          : "fill-opacity 0.18s ease-out, stroke-width 0.15s ease-out",
      }}
      onClick={interactive ? () => onZoneClick?.(entry.zone) : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      onMouseEnter={
        interactive ? () => onZoneHoverChange(entry.zone, true) : undefined
      }
      onMouseLeave={
        interactive ? () => onZoneHoverChange(entry.zone, false) : undefined
      }
      onFocus={
        interactive ? () => onZoneHoverChange(entry.zone, true) : undefined
      }
      onBlur={
        interactive ? () => onZoneHoverChange(entry.zone, false) : undefined
      }
    />
  );
}

// ---------------------------------------------------------------------------
// SVG <defs> — glow filters keyed by freshness color
// floodColor must be a literal hex — CSS vars don't resolve in SVG filter
// primitives in Firefox/Safari (same comment as exercise-body-map-view.tsx).
// ---------------------------------------------------------------------------

function GlowDefs() {
  const filters: Array<{ id: string; color: string; opacity: number; stdDev: number }> = [
    { id: GLOW_FILTER_IDS["#22C55E"], color: "#22C55E", opacity: 0.5, stdDev: 5 },
    { id: GLOW_FILTER_IDS["#F59E0B"], color: "#F59E0B", opacity: 0.5, stdDev: 5 },
    { id: GLOW_FILTER_IDS["#EF4444"], color: "#EF4444", opacity: 0.5, stdDev: 5 },
    { id: GLOW_FILTER_IDS["#3F3F46"], color: "#3F3F46", opacity: 0.3, stdDev: 3 },
  ];

  return (
    <defs>
      {filters.map(({ id, color, opacity, stdDev }) => (
        <filter key={id} id={id} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={stdDev} result="blur" />
          <feFlood floodColor={color} floodOpacity={opacity} result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      ))}
    </defs>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BodyMapAnatomical({
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

  // Which zone is currently hovered (any of its paths)
  const [hoveredZone, setHoveredZone] = useState<BodyZone | null>(null);

  function handleZoneHoverChange(zone: BodyZone, hovered: boolean) {
    setHoveredZone(hovered ? zone : null);
  }

  // Active path list for the current view. useMemo so the array reference is
  // stable between renders — avoids unnecessary AnimatePresence churn.
  const activePaths = useMemo(
    () =>
      activeView === "front" ? FRONT_ZONE_PATHS : BACK_ZONE_PATHS,
    [activeView],
  );

  const easeInOut = [0.42, 0, 0.58, 1] as const;
  const crossfadeVariants: Variants = {
    enter: { opacity: 0, scale: reducedMotion ? 1 : 0.98 },
    center: {
      opacity: 1,
      scale: 1,
      transition: { duration: reducedMotion ? 0 : 0.22, ease: easeInOut },
    },
    exit: {
      opacity: 0,
      scale: reducedMotion ? 1 : 0.98,
      transition: { duration: reducedMotion ? 0 : 0.18, ease: easeInOut },
    },
  };

  const outlinePath = activeView === "front" ? BODY_OUTLINE_FRONT : BODY_OUTLINE_BACK;
  const headPath = activeView === "front" ? HEAD_FRONT : HEAD_BACK;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* View toggle */}
      <Tabs value={activeView} onValueChange={handleViewChange} className="w-full">
        <TabsList className="grid w-full max-w-[200px] grid-cols-2 mx-auto">
          <TabsTrigger value="front">Frente</TabsTrigger>
          <TabsTrigger value="back">Espalda</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* SVG container — 5:8 aspect ratio, matches the profile slot */}
      <div
        className="w-full"
        style={{ maxWidth: "360px", aspectRatio: "5/8", position: "relative" }}
      >
        <svg
          viewBox="0 0 200 460"
          width="100%"
          height="100%"
          role="img"
          aria-label={`Mapa corporal anatómico — vista ${activeView === "front" ? "frontal" : "dorsal"}. Seleccioná una zona para ver sus medidas.`}
          style={{ display: "block", overflow: "visible" }}
        >
          {/* Glow filters — freshness-colored, not brand palette */}
          <GlowDefs />

          {/* Static body silhouette (non-interactive). Sin aria-hidden en el
              grupo porque biome marca el `<g>` como focusable; los `<path>`
              internos no tienen role/tabIndex y son ignorados por AT igual. */}
          <g>
            <path
              d={headPath}
              fill="#0F172A"
              stroke="#1E293B"
              strokeWidth={0.8}
            />
            <path
              d={outlinePath}
              fill="#0F172A"
              stroke="#1E293B"
              strokeWidth={0.6}
              strokeLinejoin="round"
            />
            {/* Subtle center line (visible on front view only) */}
            {activeView === "front" && (
              <line
                x1="100"
                y1="130"
                x2="100"
                y2="200"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={0.5}
              />
            )}
          </g>

          {/* Interactive zone paths with crossfade on view switch */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.g
              key={activeView}
              variants={crossfadeVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {activePaths.map((entry, i) => (
                <ZonePathShape
                  key={`${activeView}-${entry.zone}-${i}`}
                  entry={entry}
                  data={zones[entry.zone]}
                  isSelected={selectedZone === entry.zone}
                  isHovered={hoveredZone === entry.zone}
                  reducedMotion={reducedMotion}
                  onZoneClick={onZoneClick}
                  onZoneHoverChange={handleZoneHoverChange}
                  index={i}
                />
              ))}

              {/* (Antes había un rect placeholder para mantener `palette.primary`
                  referenciado. Borrado porque era dead code: el highlight de la
                  zona seleccionada vive en el stroke del propio path, no acá.) */}
            </motion.g>
          </AnimatePresence>
        </svg>
      </div>

      {/* Freshness legend */}
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
          <span
            key={label}
            className="flex items-center gap-1.5 text-xs text-[#71717A]"
          >
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
