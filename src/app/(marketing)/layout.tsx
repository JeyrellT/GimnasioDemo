import Link from "next/link";
import type { ReactNode } from "react";
import { BlacklineFitnessLogo } from "@/components/shared/blackline-fitness-logo";

interface MarketingLayoutProps {
  children: ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#09090B]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#3F3F46] bg-[#09090B]/95 backdrop-blur supports-[backdrop-filter]:bg-[#09090B]/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label="Blackline Fitness — inicio">
            <BlacklineFitnessLogo variant="full" size={32} />
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
              className="rounded-lg border border-[#3F3F46] px-4 py-2 text-sm font-medium text-[#FAFAFA] hover:bg-[#18181B] transition-colors min-h-[44px] inline-flex items-center"
            >
              Ingresar
            </Link>
            <Link
              href="/registrarse"
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors min-h-[44px] inline-flex items-center"
            >
              Empezar gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#3F3F46] bg-[#09090B] py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-sm text-[#71717A]">
              &copy; {new Date().getFullYear()} Blackline Fitness. Hecho en Costa Rica.
            </p>
            <nav aria-label="Links legales" className="flex gap-4">
              <Link
                href="/legal/terminos"
                className="text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors"
              >
                Términos
              </Link>
              <Link
                href="/legal/privacidad"
                className="text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors"
              >
                Privacidad
              </Link>
              <Link
                href="/legal/lpdp"
                className="text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors"
              >
                LPDP
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
