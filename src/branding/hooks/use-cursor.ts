"use client";

import { useEffect, useRef } from "react";

/**
 * Hook que sigue el mouse con un dot + ring eased.
 * Aplica clase `.hover` a los dos elementos cuando el mouse pasa sobre
 * cualquier elemento marcado con `data-hover`.
 *
 * Devuelve refs para asignar al dot (`<div ref={dotRef} className="cursor" />`)
 * y al ring (`<div ref={ringRef} className="cursor-ring" />`).
 */
export function useCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;
    let raf = 0;
    let isVisible = true;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    };

    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (raf === 0 && isVisible) raf = requestAnimationFrame(loop);
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

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("mousemove", onMove);
    startLoop();

    // hover targets
    const hoverNodes = document.querySelectorAll<HTMLElement>("[data-hover]");
    const onEnter = () => {
      dot.classList.add("hover");
      ring.classList.add("hover");
    };
    const onLeave = () => {
      dot.classList.remove("hover");
      ring.classList.remove("hover");
    };
    for (const el of hoverNodes) {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("mousemove", onMove);
      stopLoop();
      for (const el of hoverNodes) {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      }
    };
  }, []);

  return { dotRef, ringRef };
}
