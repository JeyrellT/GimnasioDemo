"use client";

import { useEffect } from "react";

/**
 * Observa cualquier elemento con clases `.fade-up` o `.reveal` dentro
 * del root pasado y le agrega la clase `.in` cuando entra al viewport.
 *
 * Pasar el ref del contenedor de la landing (`<div ref={ref} className="branding-landing">`)
 * para que sólo observe sus descendientes.
 */
export function useRevealOnView(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = root.querySelectorAll<HTMLElement>(".fade-up, .reveal");
    if (!targets.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
          }
        }
      },
      { threshold: 0.18 },
    );

    for (const el of targets) obs.observe(el);

    return () => obs.disconnect();
  }, [rootRef]);
}
