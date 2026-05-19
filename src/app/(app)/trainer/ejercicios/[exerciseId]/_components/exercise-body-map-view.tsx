"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import type { MuscleGroup } from "@prisma/client";
import { MUSCLE_LABELS } from "@/lib/constants/exercise-display";

interface ZoneDef {
  id: string;
  d: string;
  muscle: MuscleGroup;
}

export interface ExerciseBodyMapViewProps {
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
}

// ---------------------------------------------------------------------------
// Front muscle zones — viewBox 0 0 200 440
// ---------------------------------------------------------------------------

const FRONT_ZONES: ZoneDef[] = [
  // Neck
  { id: "neckF", muscle: "NECK", d: "M88,50 L112,50 L114,64 C108,67 92,67 86,64 Z" },
  // Shoulders (front deltoids)
  { id: "leftFrontDelt", muscle: "SHOULDERS", d: "M117,64 C128,59 150,57 160,66 C166,74 164,88 157,96 L143,89 C135,81 125,72 117,64 Z" },
  { id: "rightFrontDelt", muscle: "SHOULDERS", d: "M83,64 C72,59 50,57 40,66 C34,74 36,88 43,96 L57,89 C65,81 75,72 83,64 Z" },
  // Chest (pectorals)
  { id: "leftPec", muscle: "CHEST", d: "M105,72 C119,68 141,71 149,85 C153,97 149,112 141,118 L107,118 C103,106 103,88 105,76 Z" },
  { id: "rightPec", muscle: "CHEST", d: "M95,72 C81,68 59,71 51,85 C47,97 51,112 59,118 L93,118 C97,106 97,88 95,76 Z" },
  // Biceps
  { id: "leftBicep", muscle: "BICEPS", d: "M159,98 C165,104 169,122 169,142 C169,158 165,169 159,175 L151,169 C149,153 149,131 151,113 C153,107 155,101 159,98 Z" },
  { id: "rightBicep", muscle: "BICEPS", d: "M41,98 C35,104 31,122 31,142 C31,158 35,169 41,175 L49,169 C51,153 51,131 49,113 C47,107 45,101 41,98 Z" },
  // Forearms
  { id: "leftForearm", muscle: "FOREARMS", d: "M159,179 C165,185 171,203 173,223 C175,241 171,253 165,259 L157,253 C155,239 155,217 157,199 C157,191 159,185 159,179 Z" },
  { id: "rightForearm", muscle: "FOREARMS", d: "M41,179 C35,185 29,203 27,223 C25,241 29,253 35,259 L43,253 C45,239 45,217 43,199 C43,191 41,185 41,179 Z" },
  // Abs
  { id: "upperAbs", muscle: "ABS", d: "M92,120 L108,120 L110,148 C106,151 94,151 90,148 Z" },
  { id: "lowerAbs", muscle: "ABS", d: "M90,153 C94,150 106,150 110,153 L112,184 C108,188 92,188 88,184 Z" },
  // Obliques
  { id: "leftOblique", muscle: "OBLIQUES", d: "M112,120 L141,118 C143,130 143,150 139,170 L127,185 L112,188 Z" },
  { id: "rightOblique", muscle: "OBLIQUES", d: "M88,120 L59,118 C57,130 57,150 61,170 L73,185 L88,188 Z" },
  // Quads
  { id: "leftQuad", muscle: "QUADS", d: "M109,200 C121,196 139,198 145,206 L143,312 C139,320 127,324 119,322 C113,302 109,264 109,230 Z" },
  { id: "rightQuad", muscle: "QUADS", d: "M91,200 C79,196 61,198 55,206 L57,312 C61,320 73,324 81,322 C87,302 91,264 91,230 Z" },
  // Calves (tibialis anterior — front)
  { id: "leftTibialis", muscle: "CALVES", d: "M121,326 C129,322 139,324 141,332 L139,388 C135,396 127,402 121,402 C119,382 119,352 121,336 Z" },
  { id: "rightTibialis", muscle: "CALVES", d: "M79,326 C71,322 61,324 59,332 L61,388 C65,396 73,402 79,402 C81,382 81,352 79,336 Z" },
];

// ---------------------------------------------------------------------------
// Back muscle zones — viewBox 0 0 200 440
// ---------------------------------------------------------------------------

const BACK_ZONES: ZoneDef[] = [
  // Neck
  { id: "neckB", muscle: "NECK", d: "M88,50 L112,50 L114,64 C108,67 92,67 86,64 Z" },
  // Traps (upper back)
  { id: "traps", muscle: "BACK", d: "M87,66 C94,62 106,62 113,66 L133,79 C141,87 145,99 143,109 L111,101 C105,95 95,95 89,101 L57,109 C55,99 59,87 67,79 Z" },
  // Rear deltoids
  { id: "leftRearDelt", muscle: "SHOULDERS", d: "M137,71 C149,65 163,67 167,77 C169,87 165,97 159,103 L147,97 C141,87 137,79 137,71 Z" },
  { id: "rightRearDelt", muscle: "SHOULDERS", d: "M63,71 C51,65 37,67 33,77 C31,87 35,97 41,103 L53,97 C59,87 63,79 63,71 Z" },
  // Lats
  { id: "leftLat", muscle: "BACK", d: "M113,103 C127,99 143,105 147,117 C151,133 149,155 143,171 L127,177 C121,163 117,141 115,121 Z" },
  { id: "rightLat", muscle: "BACK", d: "M87,103 C73,99 57,105 53,117 C49,133 51,155 57,171 L73,177 C79,163 83,141 85,121 Z" },
  // Triceps
  { id: "leftTricep", muscle: "TRICEPS", d: "M161,105 C167,111 171,129 171,149 C171,165 167,177 161,183 L153,177 C151,161 151,137 153,119 C155,113 157,107 161,105 Z" },
  { id: "rightTricep", muscle: "TRICEPS", d: "M39,105 C33,111 29,129 29,149 C29,165 33,177 39,183 L47,177 C49,161 49,137 47,119 C45,113 43,107 39,105 Z" },
  // Lower back
  { id: "lowerBack", muscle: "BACK", d: "M83,171 L117,171 L119,197 C113,203 87,203 81,197 Z" },
  // Glutes
  { id: "leftGlute", muscle: "GLUTES", d: "M107,203 C121,199 141,203 147,215 C151,227 147,243 139,251 L113,247 C109,235 107,219 107,209 Z" },
  { id: "rightGlute", muscle: "GLUTES", d: "M93,203 C79,199 59,203 53,215 C49,227 53,243 61,251 L87,247 C91,235 93,219 93,209 Z" },
  // Hamstrings
  { id: "leftHamstring", muscle: "HAMSTRINGS", d: "M115,253 C127,249 143,251 147,261 L145,317 C141,325 129,329 121,327 C117,307 115,279 115,263 Z" },
  { id: "rightHamstring", muscle: "HAMSTRINGS", d: "M85,253 C73,249 57,251 53,261 L55,317 C59,325 71,329 79,327 C83,307 85,279 85,263 Z" },
  // Calves (gastrocnemius — back)
  { id: "leftGastroc", muscle: "CALVES", d: "M123,331 C133,327 143,329 145,339 C147,355 143,377 137,393 C131,401 125,405 121,405 C119,385 121,357 123,341 Z" },
  { id: "rightGastroc", muscle: "CALVES", d: "M77,331 C67,327 57,329 55,339 C53,355 57,377 63,393 C69,401 75,405 79,405 C81,385 79,357 77,341 Z" },
];

// ---------------------------------------------------------------------------
// Static body silhouette paths (head + body outline)
// ---------------------------------------------------------------------------

const HEAD = { cx: 100, cy: 30, r: 19 };

const BODY_OUTLINE_FRONT =
  "M86,50 C60,56 38,64 32,78 L26,108 C24,140 26,172 32,200 C28,222 26,244 30,258 L22,268 C36,264 42,248 42,228 L48,178 C44,160 42,134 44,110 L50,98 C52,128 54,158 56,186 C56,198 56,214 58,234 C60,272 62,310 66,350 C68,372 70,392 74,408 L82,416 L92,414 C90,392 88,362 86,340 C82,300 82,262 86,230 C90,214 96,204 100,200 C104,204 110,214 114,230 C118,262 118,300 114,340 C112,362 110,392 108,414 L118,416 L126,408 C130,392 132,372 134,350 C138,310 140,272 142,234 C144,214 144,198 144,186 C146,158 148,128 150,98 L156,110 C158,134 156,160 152,178 L158,228 C158,248 164,264 178,268 L170,258 C174,244 172,222 168,200 C174,172 176,140 174,108 L168,78 C162,64 140,56 114,50 Z";

const BODY_OUTLINE_BACK =
  "M86,50 C60,56 38,64 32,78 L26,108 C24,140 26,172 32,200 C28,222 26,244 30,258 L22,268 C36,264 42,248 42,228 L48,186 C44,160 42,134 44,110 L50,98 C52,128 54,158 56,186 C56,198 56,214 58,234 C60,272 62,310 66,350 C68,372 70,392 74,408 L82,416 L92,414 C90,392 88,362 86,340 C82,300 82,262 86,230 C90,214 96,204 100,200 C104,204 110,214 114,230 C118,262 118,300 114,340 C112,362 110,392 108,414 L118,416 L126,408 C130,392 132,372 134,350 C138,310 140,272 142,234 C144,214 144,198 144,186 C146,158 148,128 150,98 L156,110 C158,134 156,160 152,186 L158,228 C158,248 164,264 178,268 L170,258 C174,244 172,222 168,200 C174,172 176,140 174,108 L168,78 C162,64 140,56 114,50 Z";

// ---------------------------------------------------------------------------
// Color system
// ---------------------------------------------------------------------------

type Role = "primary" | "secondary" | "inactive";

const COLORS = {
  primary: { base: "#3B82F6", bright: "#60A5FA", stroke: "#93C5FD" },
  secondary: { base: "#F59E0B", bright: "#FBBF24", stroke: "#FCD34D" },
  inactive: { base: "#27272A", bright: "#3F3F46", stroke: "#52525B" },
} as const;

function getZoneStyle(role: Role, hovered: boolean) {
  const c = COLORS[role];
  if (role === "inactive") {
    return {
      fill: hovered ? c.bright : c.base,
      fillOpacity: hovered ? 0.7 : 0.45,
      stroke: hovered ? c.stroke : "#3F3F46",
      strokeWidth: hovered ? 1 : 0.5,
      strokeOpacity: hovered ? 0.8 : 0.3,
      filter: undefined as string | undefined,
    };
  }
  return {
    fill: hovered ? c.bright : c.base,
    fillOpacity: hovered ? 0.9 : 0.7,
    stroke: hovered ? c.stroke : c.base,
    strokeWidth: hovered ? 1.5 : 1,
    strokeOpacity: hovered ? 1 : 0.6,
    filter: role === "primary" ? "url(#glow-blue)" : "url(#glow-amber)",
  };
}

// ---------------------------------------------------------------------------
// Single body SVG view
// ---------------------------------------------------------------------------

interface BodyViewProps {
  zones: ZoneDef[];
  outline: string;
  primarySet: Set<MuscleGroup>;
  secondarySet: Set<MuscleGroup>;
  label: string;
  viewLabel: string;
  hoveredId: string | null;
  onZoneEnter: (zone: ZoneDef, e: React.MouseEvent) => void;
  onZoneLeave: () => void;
  onZoneMove: (e: React.MouseEvent) => void;
}

function BodyView({
  zones,
  outline,
  primarySet,
  secondarySet,
  label,
  viewLabel,
  hoveredId,
  onZoneEnter,
  onZoneLeave,
  onZoneMove,
}: BodyViewProps) {
  function roleOf(z: ZoneDef): Role {
    if (primarySet.has(z.muscle)) return "primary";
    if (secondarySet.has(z.muscle)) return "secondary";
    return "inactive";
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#52525B]">
        {viewLabel}
      </span>
      <svg
        viewBox="0 0 200 440"
        className="w-[155px] h-auto"
        role="img"
        aria-label={label}
      >
        <defs>
          <filter id="glow-blue" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feFlood floodColor="#3B82F6" floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-amber" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#F59E0B" floodOpacity="0.3" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Body silhouette */}
        <circle
          cx={HEAD.cx}
          cy={HEAD.cy}
          r={HEAD.r}
          fill="#1A1A2E"
          stroke="#2A2A3E"
          strokeWidth={1}
        />
        <path
          d={outline}
          fill="#1A1A2E"
          stroke="#2A2A3E"
          strokeWidth={0.8}
          strokeLinejoin="round"
        />

        {/* Muscle zones */}
        {zones.map((z) => {
          const role = roleOf(z);
          const isHovered = hoveredId === z.id;
          const s = getZoneStyle(role, isHovered);
          const interactive = role !== "inactive" || isHovered;
          return (
            <path
              key={z.id}
              d={z.d}
              fill={s.fill}
              fillOpacity={s.fillOpacity}
              stroke={s.stroke}
              strokeWidth={s.strokeWidth}
              strokeOpacity={s.strokeOpacity}
              strokeLinejoin="round"
              filter={s.filter}
              style={{
                cursor: role !== "inactive" ? "pointer" : "default",
                transition: "fill 0.15s ease, fill-opacity 0.15s ease, stroke 0.15s ease",
              }}
              onMouseEnter={(e) => onZoneEnter(z, e)}
              onMouseMove={interactive ? onZoneMove : undefined}
              onMouseLeave={onZoneLeave}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipData {
  label: string;
  role: Role;
  x: number;
  y: number;
}

function Tooltip({ data }: { data: TooltipData }) {
  const roleLabel = data.role === "primary" ? "Primario" : data.role === "secondary" ? "Secundario" : null;
  const dotColor = data.role === "primary" ? "#3B82F6" : data.role === "secondary" ? "#F59E0B" : null;

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: data.x,
        top: data.y - 44,
        transform: "translateX(-50%)",
      }}
    >
      <div className="flex items-center gap-2 rounded-lg border border-[#3F3F46] bg-[#09090B]/95 px-3 py-1.5 shadow-xl backdrop-blur-sm">
        <span className="text-xs font-semibold text-[#FAFAFA] whitespace-nowrap">
          {data.label}
        </span>
        {roleLabel && (
          <>
            <span className="h-3 w-px bg-[#3F3F46]" />
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: dotColor ?? undefined }}
              />
              <span className="text-[10px] font-medium text-[#A1A1AA]">{roleLabel}</span>
            </span>
          </>
        )}
      </div>
    </div>
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
  const primarySet = new Set<MuscleGroup>([primaryMuscle]);
  const secondarySet = new Set<MuscleGroup>(secondaryMuscles ?? []);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const getRole = useCallback(
    (muscle: MuscleGroup): Role => {
      if (primarySet.has(muscle)) return "primary";
      if (secondarySet.has(muscle)) return "secondary";
      return "inactive";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [primaryMuscle, secondaryMuscles],
  );

  const updateTooltip = useCallback(
    (zone: ZoneDef, e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip({
        label: MUSCLE_LABELS[zone.muscle] ?? zone.muscle,
        role: getRole(zone.muscle),
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [getRole],
  );

  const handleZoneEnter = useCallback(
    (zone: ZoneDef, e: React.MouseEvent) => {
      setHoveredId(zone.id);
      updateTooltip(zone, e);
    },
    [updateTooltip],
  );

  const handleZoneMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || !hoveredId) return;
      const zone = [...FRONT_ZONES, ...BACK_ZONES].find((z) => z.id === hoveredId);
      if (zone) updateTooltip(zone, e);
    },
    [hoveredId, updateTooltip],
  );

  const handleZoneLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
  }, []);

  const activeMuscles = [primaryMuscle, ...(secondaryMuscles ?? [])];
  const frontHasActive = FRONT_ZONES.some((z) => activeMuscles.includes(z.muscle));
  const backHasActive = BACK_ZONES.some((z) => activeMuscles.includes(z.muscle));

  return (
    <motion.div {...fadeIn} className="flex flex-col items-center gap-4">
      <div ref={containerRef} className="relative flex items-start justify-center gap-3">
        {/* Front view */}
        <div className={!frontHasActive && backHasActive ? "opacity-50" : ""}>
          <BodyView
            zones={FRONT_ZONES}
            outline={BODY_OUTLINE_FRONT}
            primarySet={primarySet}
            secondarySet={secondarySet}
            label="Vista frontal del cuerpo con músculos marcados"
            viewLabel="Frente"
            hoveredId={hoveredId}
            onZoneEnter={handleZoneEnter}
            onZoneLeave={handleZoneLeave}
            onZoneMove={handleZoneMove}
          />
        </div>

        {/* Back view */}
        <div className={!backHasActive && frontHasActive ? "opacity-50" : ""}>
          <BodyView
            zones={BACK_ZONES}
            outline={BODY_OUTLINE_BACK}
            primarySet={primarySet}
            secondarySet={secondarySet}
            label="Vista dorsal del cuerpo con músculos marcados"
            viewLabel="Espalda"
            hoveredId={hoveredId}
            onZoneEnter={handleZoneEnter}
            onZoneLeave={handleZoneLeave}
            onZoneMove={handleZoneMove}
          />
        </div>

        {/* Floating tooltip */}
        {tooltip && <Tooltip data={tooltip} />}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6" aria-label="Leyenda del mapa muscular">
        <span className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shadow-[0_0_6px_rgba(59,130,246,0.5)]"
            style={{ background: "#3B82F6" }}
          />
          Primario
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.5)]"
            style={{ background: "#F59E0B" }}
          />
          Secundario
        </span>
      </div>
    </motion.div>
  );
}
