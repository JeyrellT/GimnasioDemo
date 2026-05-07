import Link from "next/link";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#09090B] px-4 py-12">
      {/* Gradient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-[#FF6A1A]/5 blur-3xl" />
      </div>

      {/* Logo */}
      <Link
        href="/"
        aria-label="Forja — inicio"
        className="mb-8 flex flex-col items-center gap-3"
      >
        <svg width="48" height="48" viewBox="0 0 56 56" fill="none" aria-label="Logo Forja">
          <rect width="56" height="56" rx="12" fill="#1E2A38" />
          <path d="M14 38 L28 16 L42 38 H32 L28 30 L24 38 Z" fill="#FF6A1A" />
          <rect x="11" y="40" width="34" height="4" rx="2" fill="#FF6A1A" />
        </svg>
        <span className="text-xl font-bold text-[#FAFAFA]">Forja</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6 shadow-2xl">
        {children}
      </div>

      <p className="mt-6 text-center text-xs text-[#71717A]">
        Al continuar, aceptás los{" "}
        <Link
          href="/legal/terminos"
          className="text-[#A1A1AA] underline underline-offset-4 hover:text-[#FAFAFA] transition-colors"
        >
          Términos
        </Link>{" "}
        y la{" "}
        <Link
          href="/legal/privacidad"
          className="text-[#A1A1AA] underline underline-offset-4 hover:text-[#FAFAFA] transition-colors"
        >
          Política de privacidad
        </Link>
        .
      </p>
    </div>
  );
}
