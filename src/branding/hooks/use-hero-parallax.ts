"use client";

import { useEffect, useRef } from "react";

/**
 * Aplica parallax al título del hero y movimiento al glow background
 * en base a mouse + scroll.
 *
 * Devuelve refs para el título (`<h1 ref={titleRef} />`) y el glow
 * (`<div ref={glowRef} />`).
 */
export function useHeroParallax() {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const title = titleRef.current;
    const glow = glowRef.current;
    if (!title) return;

    let mouseX = 0;
    let mouseY = 0;
    let raf = 0;

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

    window.addEventListener("mousemove", onMove);
    loop();

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return { titleRef, glowRef };
}
