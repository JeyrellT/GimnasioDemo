"use client";

import { useEffect, useRef } from "react";

/**
 * Implementa el sticky horizontal scroll de la sección de servicios.
 * - Calcula altura de la sección = viewport + distancia de scroll horizontal del track.
 * - En cada frame, traduce el track según el progreso del scroll.
 * - Actualiza la barra de progreso (left-to-right fill).
 *
 * Asignar refs así:
 *   <section ref={sectionRef} className="services">
 *     <div className="services-sticky">
 *       <div ref={barRef} className="bar" />
 *       <div ref={trackRef} className="services-track">...</div>
 *     </div>
 *   </section>
 */
export function useServicesSticky() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const bar = barRef.current;
    if (!section || !track) return;

    let raf = 0;

    // Sin buffer extra: el sticky termina justo cuando el track horizontal
    // completa su recorrido, evitando un gap negro entre la ultima card y
    // la siguiente seccion.
    const getScrollDistance = () =>
      Math.max(0, track.scrollWidth - window.innerWidth);

    // El sticky-element ocupa 70vh (ver landing.css .services-sticky). La
    // altura virtual de la seccion = 70vh + scroll horizontal. Asi cuando
    // el sticky se despega, solo deja 70vh de "trail" en lugar de 100vh,
    // eliminando ~30vh de espacio negro entre las cards y la siguiente
    // seccion (Manifesto).
    const STICKY_VH = 0.7;
    const getStickyHeight = () => window.innerHeight * STICKY_VH;

    const setHeight = () => {
      const dist = getScrollDistance();
      section.style.height = `${getStickyHeight() + dist}px`;
    };

    setHeight();
    window.addEventListener("resize", setHeight);

    const loop = () => {
      const rect = section.getBoundingClientRect();
      const dist = getScrollDistance();
      const stickyHeight = getStickyHeight();
      const total = section.offsetHeight - stickyHeight;
      let progress = 0;
      if (rect.top <= 0 && rect.bottom >= stickyHeight) {
        progress = Math.min(1, Math.max(0, -rect.top / total));
      } else if (rect.bottom < stickyHeight) {
        progress = 1;
      }
      track.style.transform = `translateX(${-progress * dist}px)`;
      if (bar) {
        bar.style.background = `linear-gradient(90deg, var(--blue) 0 ${progress * 100}%, rgba(255,255,255,.18) ${progress * 100}% 100%)`;
        bar.style.boxShadow = progress > 0 ? "0 0 8px var(--blue)" : "none";
      }
      raf = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener("resize", setHeight);
      cancelAnimationFrame(raf);
      section.style.height = "";
    };
  }, []);

  return { sectionRef, trackRef, barRef };
}
