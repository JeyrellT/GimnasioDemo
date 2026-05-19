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
// Front muscle zones — viewBox 0 0 200 500
// Anatomically detailed paths with muscle belly definition
// ---------------------------------------------------------------------------

const FRONT_ZONES: ZoneDef[] = [
  // ── Neck (sternocleidomastoid) ──
  { id: "neckFL", muscle: "NECK", d: "M92,56 C90,60 88,68 87,74 L93,76 C94,70 94,62 94,58 Z" },
  { id: "neckFR", muscle: "NECK", d: "M108,56 C110,60 112,68 113,74 L107,76 C106,70 106,62 106,58 Z" },

  // ── Front deltoids (anterior delt cap shape) ──
  { id: "delt-FL", muscle: "SHOULDERS", d: "M82,82 C72,76 58,78 50,86 C46,92 46,100 48,108 L56,106 C60,96 66,88 74,84 L82,82 Z" },
  { id: "delt-FR", muscle: "SHOULDERS", d: "M118,82 C128,76 142,78 150,86 C154,92 154,100 152,108 L144,106 C140,96 134,88 126,84 L118,82 Z" },

  // ── Pectorals (two pec shapes with inner/outer definition) ──
  { id: "pec-L", muscle: "CHEST", d: "M97,82 C92,82 82,84 76,90 C66,98 58,106 56,112 L58,120 C64,126 76,130 88,130 L97,128 C98,116 98,98 97,82 Z" },
  { id: "pec-R", muscle: "CHEST", d: "M103,82 C108,82 118,84 124,90 C134,98 142,106 144,112 L142,120 C136,126 124,130 112,130 L103,128 C102,116 102,98 103,82 Z" },

  // ── Biceps (muscle belly shape with peak) ──
  { id: "bicep-L", muscle: "BICEPS", d: "M46,112 C42,118 38,130 36,144 C34,158 36,170 40,178 L48,180 C52,172 54,158 54,144 C54,130 52,120 48,114 Z" },
  { id: "bicep-R", muscle: "BICEPS", d: "M154,112 C158,118 162,130 164,144 C166,158 164,170 160,178 L152,180 C148,172 146,158 146,144 C146,130 148,120 152,114 Z" },

  // ── Forearms (brachioradialis + wrist extensors) ──
  { id: "forearm-FL", muscle: "FOREARMS", d: "M40,184 C36,192 32,206 30,222 C28,240 30,256 34,268 L42,266 C44,254 44,236 44,220 C44,204 42,192 40,184 Z" },
  { id: "forearm-FR", muscle: "FOREARMS", d: "M160,184 C164,192 168,206 170,222 C172,240 170,256 166,268 L158,266 C156,254 156,236 156,220 C156,204 158,192 160,184 Z" },

  // ── Upper abs (rectus abdominis — top 4 blocks) ──
  { id: "abs-up-L", muscle: "ABS", d: "M97,130 L97,150 C95,150 92,150 90,150 L88,130 C90,130 94,130 97,130 Z" },
  { id: "abs-up-R", muscle: "ABS", d: "M103,130 L103,150 C105,150 108,150 110,150 L112,130 C110,130 106,130 103,130 Z" },
  { id: "abs-mid-L", muscle: "ABS", d: "M97,152 L97,174 C95,174 92,175 90,175 L88,152 C90,152 94,152 97,152 Z" },
  { id: "abs-mid-R", muscle: "ABS", d: "M103,152 L103,174 C105,174 108,175 110,175 L112,152 C110,152 106,152 103,152 Z" },

  // ── Lower abs (below navel) ──
  { id: "abs-low-L", muscle: "ABS", d: "M97,176 L97,198 C94,200 91,200 88,198 L88,176 C91,176 94,176 97,176 Z" },
  { id: "abs-low-R", muscle: "ABS", d: "M103,176 L103,198 C106,200 109,200 112,198 L112,176 C109,176 106,176 103,176 Z" },

  // ── Obliques (external obliques — tapered flank) ──
  { id: "oblique-FL", muscle: "OBLIQUES", d: "M86,132 C78,132 68,134 62,138 L60,170 C62,180 66,190 72,196 L86,200 L86,132 Z" },
  { id: "oblique-FR", muscle: "OBLIQUES", d: "M114,132 C122,132 132,134 138,138 L140,170 C138,180 134,190 128,196 L114,200 L114,132 Z" },

  // ── Quads (rectus femoris + vastus lateralis + vastus medialis) ──
  { id: "quad-outer-L", muscle: "QUADS", d: "M72,210 C64,214 56,224 52,240 C48,260 50,286 54,310 L62,318 C64,296 64,268 66,244 C68,228 70,218 72,210 Z" },
  { id: "quad-inner-L", muscle: "QUADS", d: "M90,206 C94,210 96,220 96,234 L94,310 L84,318 C82,296 80,268 80,244 C80,224 84,212 90,206 Z" },
  { id: "quad-center-L", muscle: "QUADS", d: "M72,210 C78,208 84,206 90,206 L80,244 C76,244 72,244 68,244 L72,210 Z" },
  { id: "quad-outer-R", muscle: "QUADS", d: "M128,210 C136,214 144,224 148,240 C152,260 150,286 146,310 L138,318 C136,296 136,268 134,244 C132,228 130,218 128,210 Z" },
  { id: "quad-inner-R", muscle: "QUADS", d: "M110,206 C106,210 104,220 104,234 L106,310 L116,318 C118,296 120,268 120,244 C120,224 116,212 110,206 Z" },
  { id: "quad-center-R", muscle: "QUADS", d: "M128,210 C122,208 116,206 110,206 L120,244 C124,244 128,244 132,244 L128,210 Z" },

  // ── Tibialis anterior / front calves ──
  { id: "calf-FL", muscle: "CALVES", d: "M60,326 C56,334 52,352 52,372 C52,390 56,406 62,418 L70,420 C72,404 72,384 70,366 C68,348 66,336 62,326 Z" },
  { id: "calf-FR", muscle: "CALVES", d: "M140,326 C144,334 148,352 148,372 C148,390 144,406 138,418 L130,420 C128,404 128,384 130,366 C132,348 134,336 138,326 Z" },
];

// ---------------------------------------------------------------------------
// Back muscle zones — viewBox 0 0 200 500
// ---------------------------------------------------------------------------

const BACK_ZONES: ZoneDef[] = [
  // ── Neck (posterior) ──
  { id: "neckB", muscle: "NECK", d: "M93,56 L107,56 L110,72 C106,75 94,75 90,72 Z" },

  // ── Traps (upper trapezius — diamond shape) ──
  { id: "trap-L", muscle: "BACK", d: "M92,74 C88,76 82,80 76,86 L62,98 C58,104 58,112 60,118 L88,106 L92,74 Z" },
  { id: "trap-R", muscle: "BACK", d: "M108,74 C112,76 118,80 124,86 L138,98 C142,104 142,112 140,118 L112,106 L108,74 Z" },

  // ── Rear deltoids (posterior delt cap) ──
  { id: "delt-BL", muscle: "SHOULDERS", d: "M60,86 C52,82 42,84 38,92 C34,100 36,110 40,118 L52,114 C56,104 58,94 60,86 Z" },
  { id: "delt-BR", muscle: "SHOULDERS", d: "M140,86 C148,82 158,84 162,92 C166,100 164,110 160,118 L148,114 C144,104 142,94 140,86 Z" },

  // ── Infraspinatus / teres (mid-back detail between traps and lats) ──
  { id: "infra-L", muscle: "BACK", d: "M88,108 C82,110 68,114 62,120 L60,136 C66,140 78,140 88,136 L88,108 Z" },
  { id: "infra-R", muscle: "BACK", d: "M112,108 C118,110 132,114 138,120 L140,136 C134,140 122,140 112,136 L112,108 Z" },

  // ── Lats (latissimus dorsi — large wing shape) ──
  { id: "lat-L", muscle: "BACK", d: "M88,138 C78,142 62,142 58,148 C52,158 48,174 50,190 L60,194 C66,182 72,168 78,158 C82,150 86,144 88,138 Z" },
  { id: "lat-R", muscle: "BACK", d: "M112,138 C122,142 138,142 142,148 C148,158 152,174 150,190 L140,194 C134,182 128,168 122,158 C118,150 114,144 112,138 Z" },

  // ── Spinal erectors (lower back — two columns) ──
  { id: "erector-L", muscle: "BACK", d: "M96,140 L96,198 C94,200 92,200 90,198 L86,140 C88,138 92,138 96,140 Z" },
  { id: "erector-R", muscle: "BACK", d: "M104,140 L104,198 C106,200 108,200 110,198 L114,140 C112,138 108,138 104,140 Z" },

  // ── Triceps (lateral + long head) ──
  { id: "tri-L", muscle: "TRICEPS", d: "M38,120 C34,128 30,142 30,160 C30,176 34,188 38,194 L48,190 C50,176 50,156 48,138 C46,130 44,124 42,120 Z" },
  { id: "tri-R", muscle: "TRICEPS", d: "M162,120 C166,128 170,142 170,160 C170,176 166,188 162,194 L152,190 C150,176 150,156 152,138 C154,130 156,124 158,120 Z" },

  // ── Glutes (gluteus maximus — rounded) ──
  { id: "glute-L", muscle: "GLUTES", d: "M96,204 C86,204 70,210 62,222 C56,234 56,248 62,258 L86,262 C92,254 96,242 96,228 L96,204 Z" },
  { id: "glute-R", muscle: "GLUTES", d: "M104,204 C114,204 130,210 138,222 C144,234 144,248 138,258 L114,262 C108,254 104,242 104,228 L104,204 Z" },

  // ── Hamstrings (biceps femoris + semitendinosus) ──
  { id: "ham-outer-L", muscle: "HAMSTRINGS", d: "M62,264 C56,270 52,284 52,302 C52,318 56,330 62,336 L72,334 C74,318 74,298 72,280 C70,272 66,266 62,264 Z" },
  { id: "ham-inner-L", muscle: "HAMSTRINGS", d: "M90,264 C94,270 96,284 96,302 C96,318 94,330 90,336 L80,334 C78,318 78,298 80,280 C82,272 86,266 90,264 Z" },
  { id: "ham-outer-R", muscle: "HAMSTRINGS", d: "M138,264 C144,270 148,284 148,302 C148,318 144,330 138,336 L128,334 C126,318 126,298 128,280 C130,272 134,266 138,264 Z" },
  { id: "ham-inner-R", muscle: "HAMSTRINGS", d: "M110,264 C106,270 104,284 104,302 C104,318 106,330 110,336 L120,334 C122,318 122,298 120,280 C118,272 114,266 110,264 Z" },

  // ── Calves (gastrocnemius — two heads) ──
  { id: "gastroc-L-out", muscle: "CALVES", d: "M58,340 C54,348 50,364 50,382 C50,398 54,412 60,420 L68,418 C68,402 66,380 66,364 C66,352 64,344 60,340 Z" },
  { id: "gastroc-L-in", muscle: "CALVES", d: "M80,340 C84,348 86,364 86,382 C86,398 84,412 80,420 L72,418 C72,402 74,380 74,364 C74,352 76,344 80,340 Z" },
  { id: "gastroc-R-out", muscle: "CALVES", d: "M142,340 C146,348 150,364 150,382 C150,398 146,412 140,420 L132,418 C132,402 134,380 134,364 C134,352 136,344 140,340 Z" },
  { id: "gastroc-R-in", muscle: "CALVES", d: "M120,340 C116,348 114,364 114,382 C114,398 116,412 120,420 L128,418 C128,402 126,380 126,364 C126,352 124,344 120,340 Z" },
];

// ---------------------------------------------------------------------------
// Detailed body silhouette outline — proportional to 200×500 viewBox
// ---------------------------------------------------------------------------

const HEAD_FRONT = "M100,8 C113,8 122,18 122,32 C122,46 113,56 100,56 C87,56 78,46 78,32 C78,18 87,8 100,8 Z";
const HEAD_BACK = HEAD_FRONT;

const BODY_OUTLINE_FRONT =
  "M90,56 C86,58 82,62 78,68 C70,72 58,76 48,84 C40,90 36,100 34,112 L30,148 C28,172 30,196 34,216 C32,230 28,252 28,270 L22,284 C18,292 22,296 28,292 L36,280 C38,270 42,258 42,246 L46,218 C46,210 48,202 52,196 L56,200 C56,216 58,236 60,258 C62,286 62,316 64,346 C66,374 68,400 72,424 L78,440 L86,444 L94,442 C92,420 90,394 88,368 C84,328 84,286 86,250 C88,238 92,226 96,218 L100,214 L104,218 C108,226 112,238 114,250 C116,286 116,328 112,368 C110,394 108,420 106,442 L114,444 L122,440 L128,424 C132,400 134,374 136,346 C138,316 138,286 140,258 C142,236 144,216 144,200 L148,196 C152,202 154,210 154,218 L158,246 C158,258 162,270 164,280 L172,292 C178,296 182,292 178,284 L172,270 C172,252 168,230 166,216 C170,196 172,172 170,148 L166,112 C164,100 160,90 152,84 C142,76 130,72 122,68 C118,62 114,58 110,56 Z";

const BODY_OUTLINE_BACK =
  "M90,56 C86,58 82,62 78,68 C70,72 58,76 48,84 C40,90 36,100 34,112 L30,148 C28,172 30,196 34,216 C32,230 28,252 28,270 L22,284 C18,292 22,296 28,292 L36,280 C38,270 42,258 42,246 L46,218 C46,210 48,202 52,196 L56,200 C56,216 58,236 60,258 C62,286 62,316 64,346 C66,374 68,400 72,424 L78,440 L86,444 L94,442 C92,420 90,394 88,368 C84,328 84,286 86,250 C88,238 92,226 96,218 L100,214 L104,218 C108,226 112,238 114,250 C116,286 116,328 112,368 C110,394 108,420 106,442 L114,444 L122,440 L128,424 C132,400 134,374 136,346 C138,316 138,286 140,258 C142,236 144,216 144,200 L148,196 C152,202 154,210 154,218 L158,246 C158,258 162,270 164,280 L172,292 C178,296 182,292 178,284 L172,270 C172,252 168,230 166,216 C170,196 172,172 170,148 L166,112 C164,100 160,90 152,84 C142,76 130,72 122,68 C118,62 114,58 110,56 Z";

// ---------------------------------------------------------------------------
// Color system
// ---------------------------------------------------------------------------

type Role = "primary" | "secondary" | "inactive";

const COLORS = {
  primary:   { base: "#3B82F6", bright: "#60A5FA", glow: "rgba(59,130,246,0.5)" },
  secondary: { base: "#F59E0B", bright: "#FBBF24", glow: "rgba(245,158,11,0.45)" },
  inactive:  { base: "#1E293B", bright: "#334155", glow: "none" },
} as const;

function getZoneStyle(role: Role, hovered: boolean) {
  const c = COLORS[role];
  if (role === "inactive") {
    return {
      fill: hovered ? "#334155" : "#1E293B",
      fillOpacity: hovered ? 0.65 : 0.35,
      stroke: hovered ? "#475569" : "#1E293B",
      strokeWidth: hovered ? 0.8 : 0.4,
      filter: undefined as string | undefined,
    };
  }
  return {
    fill: hovered ? c.bright : c.base,
    fillOpacity: hovered ? 0.95 : 0.75,
    stroke: hovered ? c.bright : c.base,
    strokeWidth: hovered ? 1.6 : 0.8,
    filter: role === "primary" ? "url(#glow-primary)" : "url(#glow-secondary)",
  };
}

// ---------------------------------------------------------------------------
// Single body SVG view
// ---------------------------------------------------------------------------

interface BodyViewProps {
  zones: ZoneDef[];
  outline: string;
  headPath: string;
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
  headPath,
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
        viewBox="0 0 200 460"
        className="w-[160px] h-auto"
        role="img"
        aria-label={label}
      >
        <defs>
          <filter id="glow-primary" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor="#3B82F6" floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-secondary" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feFlood floodColor="#F59E0B" floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle muscle separation line effect */}
          <linearGradient id="muscle-sep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Body silhouette base */}
        <path
          d={headPath}
          fill="#0F172A"
          stroke="#1E293B"
          strokeWidth={0.8}
        />
        <path
          d={outline}
          fill="#0F172A"
          stroke="#1E293B"
          strokeWidth={0.6}
          strokeLinejoin="round"
        />

        {/* Muscle zones */}
        {zones.map((z) => {
          const role = roleOf(z);
          const isHovered = hoveredId === z.id;
          const s = getZoneStyle(role, isHovered);
          return (
            <path
              key={z.id}
              d={z.d}
              fill={s.fill}
              fillOpacity={s.fillOpacity}
              stroke={s.stroke}
              strokeWidth={s.strokeWidth}
              strokeLinejoin="round"
              filter={s.filter}
              style={{
                cursor: role !== "inactive" ? "pointer" : "default",
                transition: "fill 0.2s, fill-opacity 0.2s, stroke 0.2s, stroke-width 0.15s",
              }}
              onMouseEnter={(e) => onZoneEnter(z, e)}
              onMouseMove={(role !== "inactive" || isHovered) ? onZoneMove : undefined}
              onMouseLeave={onZoneLeave}
            />
          );
        })}

        {/* Center line (abs separation) for front view only */}
        {zones === FRONT_ZONES && (
          <line
            x1="100" y1="130" x2="100" y2="200"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.5"
          />
        )}
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
        top: data.y - 48,
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
      <div ref={containerRef} className="relative flex items-start justify-center gap-4">
        {/* Front view */}
        <div className={!frontHasActive && backHasActive ? "opacity-40" : ""}>
          <BodyView
            zones={FRONT_ZONES}
            outline={BODY_OUTLINE_FRONT}
            headPath={HEAD_FRONT}
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
        <div className={!backHasActive && frontHasActive ? "opacity-40" : ""}>
          <BodyView
            zones={BACK_ZONES}
            outline={BODY_OUTLINE_BACK}
            headPath={HEAD_BACK}
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
            className="inline-block h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"
            style={{ background: "#3B82F6" }}
          />
          Primario
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]"
            style={{ background: "#F59E0B" }}
          />
          Secundario
        </span>
      </div>
    </motion.div>
  );
}
