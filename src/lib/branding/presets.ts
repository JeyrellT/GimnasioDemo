// =============================================================================
// BLACKLINE FITNESS — Brand color palette presets
// Each trainer can pick one of these, or stay with the default "blue".
// =============================================================================

export interface PaletteColors {
  primary: string;
  primaryHover: string;
  accent: string;
  glow: string;
  deep: string;
  /** A faint tint for bg highlights (10% opacity feel on dark surfaces) */
  tint: string;
}

export interface PalettePreset extends PaletteColors {
  id: string;
  label: string;
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "blue",
    label: "Azul",
    primary: "#3B82F6",
    primaryHover: "#2563EB",
    accent: "#60A5FA",
    glow: "#60A5FA",
    deep: "#1E40AF",
    tint: "rgba(59,130,246,0.10)",
  },
  {
    id: "emerald",
    label: "Esmeralda",
    primary: "#10B981",
    primaryHover: "#059669",
    accent: "#34D399",
    glow: "#34D399",
    deep: "#065F46",
    tint: "rgba(16,185,129,0.10)",
  },
  {
    id: "violet",
    label: "Violeta",
    primary: "#8B5CF6",
    primaryHover: "#7C3AED",
    accent: "#A78BFA",
    glow: "#A78BFA",
    deep: "#5B21B6",
    tint: "rgba(139,92,246,0.10)",
  },
  {
    id: "rose",
    label: "Rosa",
    primary: "#F43F5E",
    primaryHover: "#E11D48",
    accent: "#FB7185",
    glow: "#FB7185",
    deep: "#9F1239",
    tint: "rgba(244,63,94,0.10)",
  },
  {
    id: "amber",
    label: "Ámbar",
    primary: "#F59E0B",
    primaryHover: "#D97706",
    accent: "#FBBF24",
    glow: "#FBBF24",
    deep: "#92400E",
    tint: "rgba(245,158,11,0.10)",
  },
  {
    id: "cyan",
    label: "Cian",
    primary: "#06B6D4",
    primaryHover: "#0891B2",
    accent: "#22D3EE",
    glow: "#22D3EE",
    deep: "#155E75",
    tint: "rgba(6,182,212,0.10)",
  },
  {
    id: "orange",
    label: "Naranja",
    primary: "#F97316",
    primaryHover: "#EA580C",
    accent: "#FB923C",
    glow: "#FB923C",
    deep: "#9A3412",
    tint: "rgba(249,115,22,0.10)",
  },
  {
    id: "pink",
    label: "Fucsia",
    primary: "#EC4899",
    primaryHover: "#DB2777",
    accent: "#F472B6",
    glow: "#F472B6",
    deep: "#9D174D",
    tint: "rgba(236,72,153,0.10)",
  },
];

export const DEFAULT_PALETTE_ID = "blue";

export const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

function adjustBrightness(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    Math.min(255, Math.round(r * factor)),
    Math.min(255, Math.round(g * factor)),
    Math.min(255, Math.round(b * factor)),
  );
}

export function paletteFromHex(hex: string): PaletteColors {
  const [r, g, b] = hexToRgb(hex);
  return {
    primary: hex,
    primaryHover: adjustBrightness(hex, 0.8),
    accent: adjustBrightness(hex, 1.3),
    glow: adjustBrightness(hex, 1.3),
    deep: adjustBrightness(hex, 0.5),
    tint: `rgba(${r},${g},${b},0.10)`,
  };
}

const CUSTOM_PREFIX = "custom:";

export function isCustomPalette(id: string): boolean {
  return id.startsWith(CUSTOM_PREFIX);
}

export function customHexFromId(id: string): string | null {
  if (!id.startsWith(CUSTOM_PREFIX)) return null;
  const hex = id.slice(CUSTOM_PREFIX.length);
  return HEX_COLOR_REGEX.test(hex) ? hex : null;
}

export function customIdFromHex(hex: string): string {
  return `${CUSTOM_PREFIX}${hex.toUpperCase()}`;
}

export function getPaletteById(id: string): PalettePreset {
  const hex = customHexFromId(id);
  if (hex) {
    return { id, label: "Custom", ...paletteFromHex(hex) };
  }
  return (
    PALETTE_PRESETS.find((p) => p.id === id) ??
    PALETTE_PRESETS.find((p) => p.id === DEFAULT_PALETTE_ID)!
  );
}
