"use client";

import Link from "next/link";
import { useHeroParallax } from "@/branding/hooks/use-hero-parallax";

export function HeroSection() {
  const { titleRef, glowRef } = useHeroParallax();

  return (
    <section className="hero" data-screen-label="01 Hero">
      <div className="hero-grid" />
      <div className="hero-glow" ref={glowRef} />

      <div className="hero-content">
        <h1 className="hero-title" ref={titleRef}>
          <span className="line">
            <span>FUERZA</span>
          </span>
          <span className="line">
            <span className="outline">ORDEN</span>
          </span>
          <span className="line">
            <span className="blue">ESCALA</span>
          </span>
        </h1>

        <div className="hero-bottom">
          <p className="hero-lede">
            El sistema operativo del entrenador profesional. Rutinas, sesiones offline,
            métricas de cliente y finanzas — en una sola línea de trabajo.{" "}
            <strong>No es una app de fitness. Es tu negocio entero.</strong>
          </p>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: ".7rem",
              letterSpacing: ".15em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              textAlign: "center",
              alignSelf: "end",
              justifySelf: "center",
            }}
          >
            / 02 — Concepto
          </div>
          <div className="cta-row">
            <Link href="/registrarse" className="btn" data-hover>
              ¡Iniciar!
              <span className="arrow">↗</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
