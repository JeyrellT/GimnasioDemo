"use client";

import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupersetColor, getSupersetLetter } from "@/lib/supersets";

interface SupersetBadgeProps {
  /** Número de grupo (1..10). Si es null/undefined, no renderiza nada. */
  group: number | null | undefined;
  size?: "xs" | "sm";
  /** Texto extra ej. "2/3" (posición dentro del grupo) mostrado tras la letra. */
  position?: string;
  className?: string;
}

/**
 * Badge visual de superserie reutilizada por el editor del coach y el player
 * del cliente. Renderiza "SS-A" / "SS-B" / etc. con la paleta cíclica.
 */
export function SupersetBadge({
  group,
  size = "sm",
  position,
  className,
}: SupersetBadgeProps) {
  if (group === null || group === undefined) return null;

  const letter = getSupersetLetter(group);
  const color = getSupersetColor(group);

  const sizes =
    size === "xs"
      ? "px-1.5 py-0.5 text-[9px]"
      : "px-2 py-0.5 text-[10px]";
  const iconSize = size === "xs" ? "h-2 w-2" : "h-2.5 w-2.5";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide text-white shadow-sm",
        sizes,
        className,
      )}
      style={{ backgroundColor: color }}
      title={`Superserie ${letter}${position ? ` · ${position}` : ""}`}
    >
      <Link2 className={iconSize} aria-hidden="true" />
      <span>SS-{letter}</span>
      {position && <span className="opacity-80 font-medium">{position}</span>}
    </span>
  );
}
