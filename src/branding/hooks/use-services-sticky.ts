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

    // ─────────────────────────────────────────────────────────────────────
    // Drag-to-pan: el usuario puede agarrar las cards con el mouse y
    // arrastrarlas horizontalmente. En lugar de mover el track directamente
    // (lo cual pelearia con el loop de scroll-driven), convertimos el delta
    // X del cursor en scroll vertical sintetizado. Asi el sistema sticky
    // sigue siendo la unica fuente de verdad y todo queda coherente.
    //
    // Solo se activa con mouse (pointerType === "mouse"). Touch usa el
    // scroll vertical nativo, no necesita drag.
    // ─────────────────────────────────────────────────────────────────────
    let isDragging = false;
    let dragStartX = 0;
    let dragStartScrollY = 0;
    let dragPointerId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (e.button !== 0) return; // solo click izquierdo
      isDragging = true;
      dragStartX = e.clientX;
      dragStartScrollY = window.scrollY;
      dragPointerId = e.pointerId;
      section.setPointerCapture(e.pointerId);
      section.style.cursor = "grabbing";
      // No preventDefault: dejamos que el click llegue si el usuario solo
      // hace tap sin mover (se vera como drag de 0 px, sin scroll).
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== dragPointerId) return;
      const deltaX = dragStartX - e.clientX; // arrastrar a izquierda = avanzar
      window.scrollTo({ top: dragStartScrollY + deltaX });
    };

    const endDrag = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== dragPointerId) return;
      isDragging = false;
      dragPointerId = null;
      section.style.cursor = "";
      try {
        section.releasePointerCapture(e.pointerId);
      } catch {
        // si el pointer ya fue liberado, ignorar
      }
    };

    section.addEventListener("pointerdown", onPointerDown);
    section.addEventListener("pointermove", onPointerMove);
    section.addEventListener("pointerup", endDrag);
    section.addEventListener("pointercancel", endDrag);

    return () => {
      window.removeEventListener("resize", setHeight);
      cancelAnimationFrame(raf);
      section.style.height = "";
      section.style.cursor = "";
      section.removeEventListener("pointerdown", onPointerDown);
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerup", endDrag);
      section.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  return { sectionRef, trackRef, barRef };
}
