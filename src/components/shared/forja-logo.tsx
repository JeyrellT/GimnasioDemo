import { cn } from "@/lib/utils";

interface ForjaLogoProps {
  variant?: "horizontal" | "isotipo" | "wordmark";
  className?: string;
  width?: number;
  height?: number;
}

const variantMap = {
  horizontal: { src: "/icons/forja-logo-horizontal.svg", defaultW: 120, defaultH: 40 },
  isotipo: { src: "/icons/forja-isotipo.svg", defaultW: 40, defaultH: 40 },
  wordmark: { src: "/icons/forja-logo-horizontal.svg", defaultW: 80, defaultH: 28 },
} as const;

/**
 * Forja brand logo. Renders the SVG asset directly via <img> rather than
 * next/image because:
 *   - SVGs are vectorial; the raster optimization pipeline doesn't apply.
 *   - next/image emits aspect-ratio warnings when CSS controls one dimension
 *     and the source SVG doesn't carry intrinsic dimensions.
 *   - Plain <img> with the .svg src is fast and cacheable by the browser.
 */
export function ForjaLogo({
  variant = "horizontal",
  className,
  width,
  height,
}: ForjaLogoProps) {
  const { src, defaultW, defaultH } = variantMap[variant];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Forja"
      width={width ?? defaultW}
      height={height ?? defaultH}
      className={cn("object-contain", className)}
    />
  );
}
