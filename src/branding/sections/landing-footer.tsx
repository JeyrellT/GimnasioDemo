import Link from "next/link";
import { BRANDING_LOGO_SRC, BRANDING_LOGO_ALT } from "@/branding/assets";

export function LandingFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src={BRANDING_LOGO_SRC} alt={BRANDING_LOGO_ALT} />
        </div>
        <div className="footer-meta">
          © {new Date().getFullYear()} BLACKLINE FITNESS
          <br />
          HECHO EN COSTA RICA
        </div>
        <div className="footer-links">
          <Link href="/pricing" data-hover>
            Precios
          </Link>
          <Link href="/legal/terminos" data-hover>
            Términos
          </Link>
          <Link href="/legal/privacidad" data-hover>
            Privacidad
          </Link>
          <Link href="/legal/lpdp" data-hover>
            LPDP
          </Link>
        </div>
      </div>
    </footer>
  );
}
