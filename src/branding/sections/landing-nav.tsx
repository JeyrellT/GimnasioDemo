"use client";

import Link from "next/link";
import { useClock } from "@/branding/hooks/use-clock";
import { BRANDING_LOGO_SRC, BRANDING_LOGO_ALT } from "@/branding/assets";

export function LandingNav() {
  const time = useClock();

  return (
    <header className="nav" data-screen-label="00 Nav">
      <div className="nav-meta">
        <div className="row">
          <span className="dot" />
          <span>BLACKLINE · BETA</span>
          <span>{time}</span>
        </div>
        <div className="sub">HECHO EN COSTA RICA</div>
        <div className="sub blue">PRODUCTO · PRIVADO · POR INVITACIÓN</div>
      </div>

      <Link href="/" className="nav-logo" data-hover aria-label="Blackline Fitness — inicio">
        <img src={BRANDING_LOGO_SRC} alt={BRANDING_LOGO_ALT} />
      </Link>

      <nav className="nav-actions">
        <a href="#manifesto" className="nav-link hide-sm" data-hover>
          Filosofía
        </a>
        <a href="#services" className="nav-link hide-sm" data-hover>
          Producto
        </a>
        <a href="#preview" className="nav-link hide-sm" data-hover>
          Preview
        </a>
        <Link href="/registrarse" className="nav-cta" data-hover>
          ¡Iniciar!
        </Link>
      </nav>
    </header>
  );
}
