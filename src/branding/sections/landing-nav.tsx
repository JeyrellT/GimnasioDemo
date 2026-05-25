import Link from "next/link";
import { BRANDING_LOGO_SRC, BRANDING_LOGO_ALT } from "@/branding/assets";

export function LandingNav() {
  return (
    <header className="nav" data-screen-label="00 Nav">
      {/* nav-meta vacio: preserva la primera columna del grid 1fr auto 1fr
          para que el logo siga centrado. aria-hidden porque no aporta
          informacion. */}
      <div className="nav-meta" aria-hidden="true" />

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
