"use client";

// =============================================================================
// BLACKLINE FITNESS — LoopMediaFrame
//
// Renders a video in "GIF mode": autoplay + loop + muted + playsInline +
// sin controles. Usado en la galería de ejercicios del trainer y en el
// player de rutinas del cliente.
//
// Comportamiento por tipo:
//   - kind === "video" (<video> Drive/proxy):
//       • Skeleton con Loader2 mientras videoWidth === 0 (metadata no cargó).
//       • onLoadedMetadata lee videoWidth/videoHeight; el container se adapta
//         al ratio real (9:16, 1:1, 4:3, 16:9 — lo que sea el original).
//         Elimina barras negras sin recortar el movimiento.
//       • Un único elemento <video> — no se carga dos veces.
//   - kind === "iframe" (YouTube/Vimeo):
//       • 16:9 fijo — no se puede leer metadata cross-origin.
//       • Sin skeleton.
//
// onVideoError prop (opcional):
//   Si se provee, el error se delega al padre y el componente no renderiza
//   placeholder propio (útil para reemplazar por ExerciseThumbnail, etc.).
//   Si no se provee, el componente muestra "Video no disponible" internamente.
// =============================================================================

import * as React from "react";
import { Loader2, PlayCircle } from "lucide-react";
import type { LoopEmbed } from "@/lib/media/video-url";

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";

export interface LoopMediaFrameProps {
  embed: LoopEmbed;
  title: string;
  /**
   * Llamado cuando el <video> dispara onError (proxy 404/415).
   * Si se provee, el componente no muestra su placeholder interno.
   * Si no se provide, muestra "Video no disponible".
   */
  onVideoError?: () => void;
  /**
   * Cap SUPERIOR del ratio height/width. Si el video nativo excede este cap
   * (típico 9:16 grabado con celular, ratio ≈ 1.78), el contenedor se queda
   * en el cap y el video se recorta con object-cover.
   *
   * Ejemplo: `maxAspectRatio={1.25}` permite hasta 4:5 (vertical leve).
   */
  maxAspectRatio?: number;
  /**
   * Cap INFERIOR del ratio height/width. Si el video nativo es más ancho
   * que este cap (típico 16:9 horizontal, ratio ≈ 0.56), el contenedor se
   * estira hasta este cap y el video se recorta a los lados con
   * object-cover. Útil para que los horizontales no se vean mucho más
   * chatos que los cuadrados en listas uniformes.
   *
   * Ejemplo: `minAspectRatio={1}` fuerza horizontales a verse cuadrados.
   */
  minAspectRatio?: number;
  /**
   * Ratio height/width FIJO del contenedor (no se adapta al video).
   * El contenedor siempre tiene este ratio. Si se pasa, anula el
   * comportamiento dinámico y min/maxAspectRatio se ignoran.
   *
   * Ejemplo: `fixedAspectRatio={1}` cuadrado uniforme.
   */
  fixedAspectRatio?: number;
}

export function LoopMediaFrame({
  embed,
  title,
  onVideoError,
  maxAspectRatio,
  minAspectRatio,
  fixedAspectRatio,
}: LoopMediaFrameProps) {
  const [internalError, setInternalError] = React.useState(false);
  // { w: 0, h: 0 } → metadata todavía no cargó (skeleton visible).
  const [dims, setDims] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Resetear cuando cambia el source (navegación entre ejercicios).
  React.useEffect(() => {
    setInternalError(false);
    setDims({ w: 0, h: 0 });
  }, [embed.src]);

  function handleError() {
    if (onVideoError) {
      onVideoError();
    } else {
      setInternalError(true);
    }
  }

  // ── iframe (YouTube / Vimeo) ─────────────────────────────────────────────
  // Metadata cross-origin no disponible. Si el padre pidió fixedAspectRatio,
  // se respeta (uniformidad en listas). Sino, 16:9 default. El video dentro
  // del iframe sigue siendo nativo del servicio (YouTube renderiza 16:9 con
  // barras si el container es cuadrado).
  if (embed.kind === "iframe") {
    if (typeof fixedAspectRatio === "number") {
      return (
        <div
          className="w-full overflow-hidden rounded-xl border border-[#3F3F46] bg-[#09090B]"
          style={{ aspectRatio: `1 / ${fixedAspectRatio}` }}
        >
          <iframe
            key={embed.src}
            src={embed.src}
            title={title}
            className="h-full w-full"
            allow={IFRAME_ALLOW}
            allowFullScreen
            loading="lazy"
          />
        </div>
      );
    }
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#3F3F46] bg-[#09090B]">
        <iframe
          key={embed.src}
          src={embed.src}
          title={title}
          className="h-full w-full"
          allow={IFRAME_ALLOW}
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  // ── video (Drive proxy) — error interno ─────────────────────────────────
  if (internalError) {
    return (
      <div
        className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#3F3F46] bg-[#09090B] px-6 text-center"
        style={
          typeof fixedAspectRatio === "number"
            ? { aspectRatio: `1 / ${fixedAspectRatio}` }
            : undefined
        }
      >
        {/* Tailwind aspect-video fallback cuando NO hay fixedAspectRatio. */}
        {typeof fixedAspectRatio !== "number" && (
          <div className="aspect-video w-full" aria-hidden="true" />
        )}
        <PlayCircle
          className="h-10 w-10 text-[#52525B]"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-[#71717A]">Video no disponible</p>
      </div>
    );
  }

  // ── video (Drive proxy) — normal ────────────────────────────────────────
  //
  // Dos modos de operación:
  //
  // A) fixedAspectRatio set (uniformidad en listas):
  //    - El contenedor usa ESTE ratio desde el primer render.
  //    - El video con object-cover llena el contenedor (puede recortar si el
  //      video original tiene otro ratio).
  //    - Skeleton: aparece sobre el video hasta que metadata cargue.
  //
  // B) fixedAspectRatio NO set (default — adopta ratio nativo):
  //    - Mientras dims.w === 0: contenedor aspect-video (16:9 placeholder).
  //    - Después de onLoadedMetadata: contenedor con padding-bottom intrinsic
  //      ratio, opcionalmente capeado por maxAspectRatio (height/width).
  //
  // No usamos useLayoutEffect ni hacks de SSR.

  const usesFixedRatio = typeof fixedAspectRatio === "number";
  const dimsKnown = dims.w > 0 && dims.h > 0;
  const nativeRatio = dimsKnown ? dims.h / dims.w : 0;
  // Clamp del ratio nativo a [minAspectRatio, maxAspectRatio]. Las dos props
  // son independientes y opcionales — el clamp ignora la que no se pasó.
  // Resultado: la disposición queda en un rango angosto (uniformidad) pero
  // los verticales/horizontales mantienen una pista de su forma original
  // dentro de ese rango.
  let displayRatio = nativeRatio;
  if (dimsKnown && typeof maxAspectRatio === "number") {
    displayRatio = Math.min(displayRatio, maxAspectRatio);
  }
  if (dimsKnown && typeof minAspectRatio === "number") {
    displayRatio = Math.max(displayRatio, minAspectRatio);
  }

  // Placeholder antes de que cargue metadata: si hay min/max, usamos el min
  // como base (asume que la mayoría de videos llegarán al min o por encima);
  // sino el aspect-video clásico. Esto evita un salto de altura grande al
  // pasar de placeholder a video real.
  const placeholderRatio: number | null =
    typeof minAspectRatio === "number"
      ? minAspectRatio
      : typeof maxAspectRatio === "number"
        ? Math.min(maxAspectRatio, 9 / 16)
        : null;

  const containerStyle: React.CSSProperties | undefined = usesFixedRatio
    ? { aspectRatio: `1 / ${fixedAspectRatio}` }
    : dimsKnown
      ? { height: 0, paddingBottom: `${displayRatio * 100}%` }
      : placeholderRatio !== null
        ? { aspectRatio: `1 / ${placeholderRatio}` }
        : undefined;

  // En modo fixed, el skeleton solo se ve mientras carga metadata (no afecta
  // el layout). En modo dinámico, el skeleton ocupa el placeholder 16:9.
  const showSkeleton = !dimsKnown && !internalError;
  // En modo fixed el video siempre visible (object-cover llena el container
  // aunque la metadata no haya cargado — el skeleton se superpone). En modo
  // dinámico el video se oculta hasta que conocemos el ratio nativo.
  const videoHidden = !usesFixedRatio && !dimsKnown;

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-[#3F3F46] bg-[#09090B]"
      style={containerStyle}
    >
      {/* Placeholder antes de conocer el ratio real:
          - Si hay min/maxAspectRatio: el padre ya aplica `aspectRatio` inline
            (placeholderRatio arriba) y este div solo sirve para ocupar el alto.
          - Sin ninguno: caemos al aspect-video clásico (16:9). */}
      {!usesFixedRatio && !dimsKnown && placeholderRatio === null && (
        <div className="aspect-video w-full" aria-hidden="true" />
      )}

      {showSkeleton && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#09090B]">
          <Loader2
            className="h-8 w-8 animate-spin text-[#52525B]"
            aria-label="Cargando video"
          />
        </div>
      )}

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        key={embed.src}
        src={embed.src}
        // object-cover llena el contenedor. Cuando el contenedor matchea el
        // ratio nativo no hay recorte. Cuando hay cap activo o fixed activo,
        // object-center muestra la franja central del video.
        className="absolute inset-0 h-full w-full object-cover object-center"
        style={videoHidden ? { visibility: "hidden" } : undefined}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={title}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          const w = el.videoWidth;
          const h = el.videoHeight;
          if (w > 0 && h > 0) {
            setDims({ w, h });
          }
        }}
        onError={handleError}
      />
    </div>
  );
}
