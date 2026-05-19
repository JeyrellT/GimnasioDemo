"use client";

// =============================================================================
// BLACKLINE FITNESS — BodyMapPicker
// Interactive SVG body map for selecting primary + secondary muscles on
// exercise create/edit form.
//
// Click          → set as primary (single selection)
// Shift+click    → toggle as secondary (max 5)
// Click primary  → deselect if already primary
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { MuscleGroup } from "@prisma/client";

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

export interface BodyMapPickerProps {
  primaryMuscle: MuscleGroup | null;
  secondaryMuscles: MuscleGroup[];
  onPrimaryChange: (muscle: MuscleGroup | null) => void;
  onSecondaryChange: (muscles: MuscleGroup[]) => void;
}

// ---------------------------------------------------------------------------
// Muscle ↔ Zone mapping
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
  FULL_BODY: [],
};

const ZONE_TO_MUSCLE: Record<BodyZone, MuscleGroup | null> = {
  neck: "NECK",
  shoulderLeft: "SHOULDERS",
  shoulderRight: "SHOULDERS",
  chest: "CHEST",
  bicepLeft: "BICEPS",
  bicepRight: "BICEPS",
  forearmLeft: "FOREARMS",
  forearmRight: "FOREARMS",
  abdomen: "ABS",
  waist: "OBLIQUES",
  hip: null,
  glute: "GLUTES",
  quadLeft: "QUADS",
  quadRight: "QUADS",
  hamstringLeft: "HAMSTRINGS",
  hamstringRight: "HAMSTRINGS",
  calfLeft: "CALVES",
  calfRight: "CALVES",
};

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  CHEST: "Pecho",
  BACK: "Espalda",
  SHOULDERS: "Hombros",
  BICEPS: "Bíceps",
  TRICEPS: "Tríceps",
  FOREARMS: "Antebrazos",
  ABS: "Abdomen",
  OBLIQUES: "Oblicuos",
  GLUTES: "Glúteos",
  QUADS: "Cuádriceps",
  HAMSTRINGS: "Isquiotibiales",
  CALVES: "Gemelos",
  NECK: "Cuello",
  FULL_BODY: "Cuerpo entero",
};

// ---------------------------------------------------------------------------
// SVG path data — copied from body-map.tsx (measurement-focused version).
// ViewBox 360×480. Body center X=180.
// ---------------------------------------------------------------------------

interface ZonePath {
  zone: BodyZone;
  d: string;
  cx: number;
  cy: number;
  view: "front" | "back" | "both";
}

const FRONT_PATHS: ZonePath[] = [
  {
    zone: "neck",
    d: "M168 68 C168 60 192 60 192 68 L194 86 C185 90 175 90 166 86 Z",
    cx: 180,
    cy: 77,
    view: "front",
  },
  {
    zone: "shoulderLeft",
    d: "M214 90 C226 87 242 94 248 108 C252 118 248 130 240 134 C232 130 222 124 216 112 Z",
    cx: 234,
    cy: 112,
    view: "front",
  },
  {
    zone: "shoulderRight",
    d: "M146 90 C134 87 118 94 112 108 C108 118 112 130 120 134 C128 130 138 124 144 112 Z",
    cx: 126,
    cy: 112,
    view: "front",
  },
  {
    zone: "chest",
    d: "M148 90 C158 86 175 84 180 84 C185 84 202 86 212 90 L216 112 C210 118 200 124 180 126 C160 124 150 118 144 112 Z",
    cx: 180,
    cy: 108,
    view: "front",
  },
  {
    zone: "bicepLeft",
    d: "M240 134 C248 136 256 146 256 158 C256 168 252 178 244 182 C238 174 236 162 236 150 Z",
    cx: 248,
    cy: 158,
    view: "front",
  },
  {
    zone: "bicepRight",
    d: "M120 134 C112 136 104 146 104 158 C104 168 108 178 116 182 C122 174 124 162 124 150 Z",
    cx: 112,
    cy: 158,
    view: "front",
  },
  {
    zone: "forearmLeft",
    d: "M244 182 C250 186 258 196 260 212 C260 224 256 236 248 240 C242 232 238 218 238 206 C238 196 240 188 244 182 Z",
    cx: 250,
    cy: 212,
    view: "front",
  },
  {
    zone: "forearmRight",
    d: "M116 182 C110 186 102 196 100 212 C100 224 104 236 112 240 C118 232 122 218 122 206 C122 196 120 188 116 182 Z",
    cx: 110,
    cy: 212,
    view: "front",
  },
  {
    zone: "abdomen",
    d: "M152 126 C158 124 170 122 180 122 C190 122 202 124 208 126 L210 162 C202 166 192 168 180 168 C168 168 158 166 150 162 Z",
    cx: 180,
    cy: 145,
    view: "front",
  },
  {
    zone: "waist",
    d: "M150 162 C158 166 168 168 180 168 C192 168 202 166 210 162 L212 194 C204 198 192 200 180 200 C168 200 156 198 148 194 Z",
    cx: 180,
    cy: 181,
    view: "front",
  },
  {
    zone: "hip",
    d: "M148 194 C156 198 168 200 180 200 C192 200 204 198 212 194 L218 220 C210 228 196 234 180 234 C164 234 150 228 142 220 Z",
    cx: 180,
    cy: 214,
    view: "front",
  },
  {
    zone: "quadLeft",
    d: "M188 234 C196 232 208 230 216 228 L220 310 C214 316 204 320 196 318 C190 306 188 276 188 256 Z",
    cx: 206,
    cy: 276,
    view: "front",
  },
  {
    zone: "quadRight",
    d: "M172 234 C164 232 152 230 144 228 L140 310 C146 316 156 320 164 318 C170 306 172 276 172 256 Z",
    cx: 154,
    cy: 276,
    view: "front",
  },
  {
    zone: "calfLeft",
    d: "M196 318 C204 320 214 322 218 326 L214 390 C210 400 202 408 196 408 C192 396 190 372 190 354 Z",
    cx: 206,
    cy: 362,
    view: "front",
  },
  {
    zone: "calfRight",
    d: "M164 318 C156 320 146 322 142 326 L146 390 C150 400 158 408 164 408 C168 396 170 372 170 354 Z",
    cx: 154,
    cy: 362,
    view: "front",
  },
];

const BACK_PATHS: ZonePath[] = [
  {
    zone: "neck",
    d: "M168 68 C168 60 192 60 192 68 L194 86 C185 90 175 90 166 86 Z",
    cx: 180,
    cy: 77,
    view: "back",
  },
  {
    zone: "shoulderLeft",
    d: "M214 90 C226 87 242 94 248 108 C252 118 248 130 240 134 C232 130 222 124 216 112 Z",
    cx: 234,
    cy: 112,
    view: "back",
  },
  {
    zone: "shoulderRight",
    d: "M146 90 C134 87 118 94 112 108 C108 118 112 130 120 134 C128 130 138 124 144 112 Z",
    cx: 126,
    cy: 112,
    view: "back",
  },
  {
    zone: "glute",
    d: "M146 194 C154 198 166 202 180 202 C194 202 206 198 214 194 L220 232 C210 244 196 250 180 250 C164 250 150 244 140 232 Z",
    cx: 180,
    cy: 222,
    view: "back",
  },
  {
    zone: "hamstringLeft",
    d: "M188 250 C196 248 208 246 216 244 L218 320 C212 328 202 332 194 330 C190 314 188 282 188 262 Z",
    cx: 206,
    cy: 290,
    view: "back",
  },
  {
    zone: "hamstringRight",
    d: "M172 250 C164 248 152 246 144 244 L142 320 C148 328 158 332 166 330 C170 314 172 282 172 262 Z",
    cx: 154,
    cy: 290,
    view: "back",
  },
  {
    zone: "calfLeft",
    d: "M194 330 C202 332 212 334 216 338 L212 400 C208 410 200 418 194 418 C190 404 188 378 188 360 Z",
    cx: 204,
    cy: 372,
    view: "back",
  },
  {
    zone: "calfRight",
    d: "M166 330 C158 332 148 334 144 338 L148 400 C152 410 160 418 166 418 C170 404 172 378 172 360 Z",
    cx: 156,
    cy: 372,
    view: "back",
  },
];

const HEAD = { cx: 180, cy: 44, r: 28 };
const TORSO_D =
  "M148 90 C136 94 118 100 112 110 L100 240 C100 246 120 252 140 248 L142 320 L150 430 L170 432 L172 360 L188 360 L190 432 L210 430 L218 320 L220 248 C240 252 260 246 260 240 L248 110 C242 100 224 94 212 90 C202 86 192 84 180 84 C168 84 158 86 148 90 Z";

// ---------------------------------------------------------------------------
// Zone state helper
// ---------------------------------------------------------------------------

type ZoneState = "primary" | "secondary" | "idle";

function getZoneState(
  zone: BodyZone,
  primaryMuscle: MuscleGroup | null,
  secondaryMuscles: MuscleGroup[],
): ZoneState {
  const muscle = ZONE_TO_MUSCLE[zone];
  if (!muscle) return "idle";
  if (muscle === primaryMuscle) return "primary";
  if (secondaryMuscles.includes(muscle)) return "secondary";
  return "idle";
}

// ---------------------------------------------------------------------------
// Individual zone hotspot
// ---------------------------------------------------------------------------

interface ZoneHotspotProps {
  path: ZonePath;
  state: ZoneState;
  reducedMotion: boolean;
  index: number;
  onZoneClick: (zone: BodyZone, shiftKey: boolean) => void;
}

function ZoneHotspot({
  path,
  state,
  reducedMotion,
  index,
  onZoneClick,
}: ZoneHotspotProps) {
  const [hovered, setHovered] = useState(false);

  // Visual colors per state
  const fillColor =
    state === "primary"
      ? "var(--brand-primary, #3B82F6)"
      : state === "secondary"
        ? "#F59E0B"
        : hovered
          ? "var(--brand-primary, #3B82F6)"
          : "#3F3F46";

  const fillOpacity =
    state === "primary"
      ? 0.65
      : state === "secondary"
        ? 0.4
        : hovered
          ? 0.25
          : 0.1;

  const staggerDelay = reducedMotion ? 0 : index * 0.03;

  function handleClick(e: React.MouseEvent<SVGGElement>) {
    onZoneClick(path.zone, e.shiftKey);
  }

  function handleKeyDown(e: React.KeyboardEvent<SVGGElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onZoneClick(path.zone, e.shiftKey);
    }
  }

  const muscle = ZONE_TO_MUSCLE[path.zone];
  const label = muscle
    ? `${MUSCLE_LABELS[muscle]} — ${state === "primary" ? "principal" : state === "secondary" ? "secundario" : "seleccioná"}`
    : "No seleccionable";

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: {
          delay: staggerDelay,
          duration: reducedMotion ? 0 : 0.22,
          ease: [0.34, 1.56, 0.64, 1],
        },
      }}
      role="button"
      tabIndex={muscle ? 0 : -1}
      aria-label={label}
      aria-pressed={state !== "idle"}
      style={{ cursor: muscle ? "pointer" : "default", outline: "none" }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <path
        d={path.d}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={state !== "idle" ? fillColor : "transparent"}
        strokeWidth={state !== "idle" ? 1.5 : 0}
        style={{
          transition: reducedMotion
            ? "none"
            : "fill 0.15s ease-out, fill-opacity 0.15s ease-out",
        }}
      />

      {/* Hotspot dot */}
      <circle
        cx={path.cx}
        cy={path.cy}
        r={6}
        fill={fillColor}
        fillOpacity={state !== "idle" || hovered ? 0.9 : 0.35}
        stroke="#09090B"
        strokeWidth={1.5}
        style={{
          transition: reducedMotion
            ? "none"
            : "fill 0.15s ease-out, fill-opacity 0.15s ease-out",
        }}
      />

      {/* Selection ring */}
      {state !== "idle" && (
        <circle
          cx={path.cx}
          cy={path.cy}
          r={10}
          fill="none"
          stroke={fillColor}
          strokeWidth={1.5}
          strokeOpacity={0.6}
        />
      )}
    </motion.g>
  );
}

// ---------------------------------------------------------------------------
// Muscle chip
// ---------------------------------------------------------------------------

interface MuscleChipProps {
  muscle: MuscleGroup;
  variant: "primary" | "secondary";
  onRemove: () => void;
}

function MuscleChip({ muscle, variant, onRemove }: MuscleChipProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.75 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.75 }}
      transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        variant === "primary"
          ? "bg-brand-primary/20 text-brand-primary ring-1 ring-brand-primary/40"
          : "bg-[#F59E0B]/15 text-[#F59E0B] ring-1 ring-[#F59E0B]/30",
      )}
    >
      {variant === "primary" && (
        <span className="text-[10px] uppercase tracking-wide opacity-70">
          Principal
        </span>
      )}
      {MUSCLE_LABELS[muscle]}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${MUSCLE_LABELS[muscle]}`}
        className="rounded-full p-0.5 opacity-60 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-1 focus-visible:ring-current"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BodyMapPicker({
  primaryMuscle,
  secondaryMuscles,
  onPrimaryChange,
  onSecondaryChange,
}: BodyMapPickerProps) {
  const [view, setView] = useState<"front" | "back">("front");
  const reducedMotion = useReducedMotion() ?? false;

  const activePaths = view === "front" ? FRONT_PATHS : BACK_PATHS;

  const easeInOut = [0.42, 0, 0.58, 1] as const;

  function handleZoneClick(zone: BodyZone, shiftKey: boolean) {
    const muscle = ZONE_TO_MUSCLE[zone];
    if (!muscle) return;

    const isPrimary = muscle === primaryMuscle;
    const isSecondary = secondaryMuscles.includes(muscle);

    if (shiftKey) {
      // Shift+click: toggle secondary
      if (isPrimary) {
        // Move primary to secondary
        onPrimaryChange(null);
        if (secondaryMuscles.length < 5) {
          onSecondaryChange([...secondaryMuscles, muscle]);
        }
      } else if (isSecondary) {
        // Remove from secondary
        onSecondaryChange(secondaryMuscles.filter((m) => m !== muscle));
      } else {
        // Add to secondary (if < 5)
        if (secondaryMuscles.length < 5) {
          onSecondaryChange([...secondaryMuscles, muscle]);
        }
      }
    } else {
      // Normal click
      if (isPrimary) {
        // Deselect primary
        onPrimaryChange(null);
      } else if (isSecondary) {
        // Promote to primary: old primary (if any) moves to secondary
        const prev = primaryMuscle;
        onPrimaryChange(muscle);
        const nextSecondary = secondaryMuscles.filter((m) => m !== muscle);
        if (prev && !nextSecondary.includes(prev) && nextSecondary.length < 5) {
          onSecondaryChange([...nextSecondary, prev]);
        } else {
          onSecondaryChange(nextSecondary);
        }
      } else {
        // Set as primary; previous primary goes to secondary if room
        const prev = primaryMuscle;
        onPrimaryChange(muscle);
        if (prev && prev !== muscle) {
          const nextSecondary = secondaryMuscles.filter((m) => m !== muscle);
          if (!nextSecondary.includes(prev) && nextSecondary.length < 5) {
            onSecondaryChange([...nextSecondary, prev]);
          }
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* View toggle */}
      <Tabs
        value={view}
        onValueChange={(v) => setView(v as "front" | "back")}
      >
        <TabsList className="grid w-full max-w-[200px] grid-cols-2">
          <TabsTrigger value="front">Frente</TabsTrigger>
          <TabsTrigger value="back">Espalda</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Hint */}
      <p className="text-[11px] text-[#71717A] leading-snug">
        Click = principal &middot; Shift+click = secundario (máx 5)
      </p>

      {/* SVG */}
      <div
        style={{ maxWidth: "300px", aspectRatio: "3/4", position: "relative" }}
        className="w-full"
      >
        <svg
          viewBox="0 0 360 480"
          width="100%"
          height="100%"
          role="img"
          aria-label={`Mapa corporal — vista ${view === "front" ? "frontal" : "dorsal"}. Hacé click para seleccionar músculos.`}
          style={{ display: "block" }}
        >
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

          {/* Interactive zones — crossfade on view switch */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.g
              key={view}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: {
                  duration: reducedMotion ? 0 : 0.22,
                  ease: easeInOut,
                },
              }}
              exit={{
                opacity: 0,
                scale: 0.98,
                transition: {
                  duration: reducedMotion ? 0 : 0.18,
                  ease: easeInOut,
                },
              }}
            >
              {activePaths.map((path, i) => (
                <ZoneHotspot
                  key={`${view}-${path.zone}`}
                  path={path}
                  state={getZoneState(path.zone, primaryMuscle, secondaryMuscles)}
                  reducedMotion={reducedMotion}
                  index={i}
                  onZoneClick={handleZoneClick}
                />
              ))}
            </motion.g>
          </AnimatePresence>
        </svg>
      </div>

      {/* Selected muscles chips */}
      <div
        className="flex flex-wrap gap-2 min-h-[32px]"
        aria-label="Músculos seleccionados"
      >
        <AnimatePresence mode="popLayout">
          {primaryMuscle && (
            <MuscleChip
              key={`primary-${primaryMuscle}`}
              muscle={primaryMuscle}
              variant="primary"
              onRemove={() => onPrimaryChange(null)}
            />
          )}
          {secondaryMuscles.map((m) => (
            <MuscleChip
              key={`secondary-${m}`}
              muscle={m}
              variant="secondary"
              onRemove={() =>
                onSecondaryChange(secondaryMuscles.filter((x) => x !== m))
              }
            />
          ))}
        </AnimatePresence>

        {!primaryMuscle && secondaryMuscles.length === 0 && (
          <span className="text-xs text-[#52525B] italic">
            Ningún músculo seleccionado
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {(
          [
            { color: "var(--brand-primary, #3B82F6)", label: "Principal" },
            { color: "#F59E0B", label: "Secundario" },
          ] as const
        ).map(({ color, label }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-[11px] text-[#71717A]"
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
