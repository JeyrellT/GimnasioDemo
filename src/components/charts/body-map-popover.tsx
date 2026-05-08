"use client";

import { useReducedMotion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { KpiSparkline } from "@/components/charts/kpi-sparkline";
import { BODY_ZONE_LABELS_ES } from "@/components/charts/body-map";
import type { BodyZone, ZoneData } from "@/components/charts/body-map";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BodyMapPopoverProps {
  zone: BodyZone;
  data: ZoneData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  onEdit?: () => void;
}

// ---------------------------------------------------------------------------
// Delta display helpers
// ---------------------------------------------------------------------------

interface DeltaDisplayProps {
  deltaCm: number;
  measuredAt: Date | string;
}

function DeltaDisplay({ deltaCm, measuredAt }: DeltaDisplayProps) {
  const absVal = Math.abs(deltaCm);
  const isNeutral = absVal < 0.05;

  const color = isNeutral
    ? "#A1A1AA"
    : deltaCm > 0
      ? "#22C55E"
      : "#EF4444";

  const bgColor = isNeutral
    ? "rgba(161, 161, 170, 0.08)"
    : deltaCm > 0
      ? "rgba(34, 197, 94, 0.1)"
      : "rgba(239, 68, 68, 0.1)";

  const arrow = isNeutral ? "→" : deltaCm > 0 ? "↑" : "↓";
  const sign = deltaCm > 0 ? "+" : "";

  // Relative date of previous measurement — approximation using measuredAt as reference
  const relativeDate = formatDistanceToNow(new Date(measuredAt), {
    addSuffix: true,
    locale: es,
  });

  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ color, background: bgColor }}
      >
        {arrow} {sign}{deltaCm.toFixed(1)} cm
      </span>
      <span className="text-xs text-[#71717A]">desde medición anterior</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Popover component
// ---------------------------------------------------------------------------

export function BodyMapPopover({
  zone,
  data,
  open,
  onOpenChange,
  trigger,
  onEdit,
}: BodyMapPopoverProps) {
  const reducedMotion = useReducedMotion() ?? false;

  const label = BODY_ZONE_LABELS_ES[zone];

  const lastMeasured = formatDistanceToNow(new Date(data.measuredAt), {
    addSuffix: true,
    locale: es,
  });

  // Sparkline: use provided trendSparkline or a flat placeholder
  const sparkData = data.trendSparkline ?? [];

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>

      <PopoverContent
        sideOffset={8}
        align="center"
        className="w-64 p-0 overflow-hidden"
        style={
          reducedMotion
            ? undefined
            : { animation: "vizion-popover-in 0.16s ease-out" }
        }
        aria-label={`Detalle de ${label}`}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-[#27272A]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#71717A] mb-1">
            {label}
          </p>

          {/* Big value */}
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-3xl font-bold text-[#FAFAFA]"
              style={{ fontFeatureSettings: "'tnum'" }}
            >
              {data.valueCm.toFixed(1)}
            </span>
            <span className="text-sm text-[#71717A]">cm</span>
          </div>

          {/* Delta */}
          <div className="mt-1.5">
            <DeltaDisplay deltaCm={data.deltaCm} measuredAt={data.measuredAt} />
          </div>
        </div>

        {/* Sparkline — 12 week trend */}
        <div className="px-4 py-3 border-b border-[#27272A]">
          <p className="text-xs text-[#52525B] mb-2">Últimas 12 semanas</p>
          <KpiSparkline
            data={sparkData}
            height={48}
            color="#FF6A1A"
            width={208}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-[#71717A]">
            Última:{" "}
            <span className="text-[#A1A1AA]">{lastMeasured}</span>
          </p>

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[#FAFAFA] border border-[#3F3F46] bg-transparent transition-colors hover:bg-[#27272A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B]"
            >
              Editar
              <ChevronRight className="h-3 w-3 text-[#71717A]" aria-hidden="true" />
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Popover enter keyframe — injected once via a style tag in _app or layout.
// Defined here for colocation; import once at the app root if needed.
// ---------------------------------------------------------------------------

export const POPOVER_KEYFRAMES = `
@keyframes vizion-popover-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;
