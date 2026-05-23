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
   * Cap superior del ratio height/width del contenedor. Cuando el video
   * original es más alto que el cap (típico 9:16 grabado en celular), el
   * contenedor se limita al cap y el video se recorta por abajo con
   * `object-cover object-top` (la acción del ejercicio suele estar en
   * la parte superior — torso/brazos). Sin cap (default) el contenedor
   * adopta el ratio nativo del video.
   *
   * Ejemplo: `maxAspectRatio={1}` cap a cuadrado.
   */
  maxAspectRatio?: number;
  /**
   * Ratio height/width FIJO del contenedor (no se adapta al video).
   * El contenedor siempre tiene este ratio y el <video> se centra adentro
   * con object-cover. Útil para listas donde todos los items deben verse
   * uniformes (el player de rutinas del cliente, por ejemplo).
   *
   * Si se pasa, anula el comportamiento dinámico (skeleton padding-bottom
   * mientras carga metadata) y `maxAspectRatio` se ignora. iframe usa el
   * mismo ratio fijo (en vez del 16:9 default).
   *
   * Ejemplo: `fixedAspectRatio={1}` para cuadrado uniforme.
   */
  fixedAspectRatio?: number;
}

export function LoopMediaFrame({
  embed,
  title,
  onVideoError,
  maxAspectRatio,
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
  const displayRatio =
    dimsKnown && typeof maxAspectRatio === "number"
      ? Math.min(nativeRatio, maxAspectRatio)
      : nativeRatio;

  const containerStyle: React.CSSProperties | undefined = usesFixedRatio
    ? { aspectRatio: `1 / ${fixedAspectRatio}` }
    : dimsKnown
      ? { height: 0, paddingBottom: `${displayRatio * 100}%` }
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
      {/* Placeholder 16:9 — solo en modo dinámico antes de conocer el ratio.
          Necesita ser un elemento separado porque Tailwind aspect-video en el
          div padre conflictúa con el paddingBottom inline del post-meta. */}
      {!usesFixedRatio && !dimsKnown && (
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
