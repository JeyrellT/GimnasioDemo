import Link from "next/link";
import { BlacklineFitnessLogo } from "@/components/shared/blackline-fitness-logo";

export function BrandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#3F3F46] bg-[#09090B]/95 backdrop-blur supports-[backdrop-filter]:bg-[#09090B]/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="Blackline Fitness — inicio">
          <>
            <span className="sm:hidden">
              <BlacklineFitnessLogo variant="mark" size={28} />
            </span>
            <span className="hidden sm:inline-flex">
              <BlacklineFitnessLogo variant="full" size={32} />
            </span>
          </>
        </Link>

        <nav aria-label="Navegación marketing" className="flex items-center gap-2">
          <Link
            href="/pricing"
            className="hidden text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors sm:block px-3 py-2"
          >
            Precios
          </Link>
          <Link
            href="/ingresar"
            className="rounded-lg border border-[#3F3F46] px-3 py-2 text-xs sm:text-sm font-medium text-[#FAFAFA] hover:bg-[#18181B] transition-colors min-h-[44px] inline-flex items-center"
          >
            Ingresar
          </Link>
          <Link
            href="/registrarse"
            className="rounded-lg bg-brand-primary px-3 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-brand-primary-hover transition-colors min-h-[44px] inline-flex items-center"
          >
            Empezar gratis
          </Link>
        </nav>
      </div>
    </header>
  );
}
