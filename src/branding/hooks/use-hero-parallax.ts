"use client";

import { useEffect, useRef } from "react";

/**
 * Aplica parallax al título del hero y movimiento al glow background
 * en base a mouse + scroll.
 *
 * Devuelve refs para el título (`<h1 ref={titleRef} />`) y el glow
 * (`<div ref={glowRef} />`).
 *
 * El loop rAF se PAUSA cuando:
 *   - El hero sale del viewport (IntersectionObserver)
 *   - La tab pierde el foco (document.visibilityState)
 *   - El usuario tiene `prefers-reduced-motion: reduce`
 * Asi no quemamos CPU mientras el usuario lee el resto de la pagina.
 */
export function useHeroParallax() {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const title = titleRef.current;
    const glow = glowRef.current;
    if (!title) return;

    // Respect reduced motion: skip the loop entirely.
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let mouseX = 0;
    let mouseY = 0;
    let raf = 0;
    let isVisible = true;
    let isInView = true;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    };

    const loop = () => {
      const y = window.scrollY;
      title.style.transform = `translateY(${y * 0.25}px) translateX(${mouseX * -10}px)`;
      title.style.opacity = String(Math.max(0, 1 - y / 700));
      if (glow) {
        glow.style.transform = `translate(calc(-50% + ${mouseX * 60}px), calc(-50% + ${mouseY * 40}px + ${y * 0.15}px))`;
      }
      raf = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (raf === 0 && isVisible && isInView) {
        raf = requestAnimationFrame(loop);
      }
    };

    const stopLoop = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const onVisibilityChange = () => {
      isVisible = document.visibilityState === "visible";
      if (isVisible) startLoop();
      else stopLoop();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        isInView = entry?.isIntersecting ?? false;
        if (isInView) startLoop();
        else stopLoop();
      },
      { threshold: 0 },
    );
    io.observe(title);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("mousemove", onMove);
    startLoop();

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("mousemove", onMove);
      stopLoop();
    };
  }, []);

  return { titleRef, glowRef };
}
