import Link from "next/link";

export function BrandingFooter() {
  return (
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
  );
}
