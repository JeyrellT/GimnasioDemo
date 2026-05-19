import Link from "next/link";
import type { ReactNode } from "react";
import { BlacklineFitnessLogo } from "@/components/shared/blackline-fitness-logo";

const BASE = "";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Full-bleed gym background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${BASE}/images/gym-bg.jpg`}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      {/* Dark overlay — allows card to pop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#09090B]/70"
      />

      {/* Subtle radial glow behind card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3B82F6]/[0.06] blur-[120px]"
      />

      {/* Logo */}
      <Link
        href="/"
        aria-label="Blackline Fitness — inicio"
        className="relative z-10 mb-6 flex items-center"
      >
        <BlacklineFitnessLogo variant="full" size={36} />
      </Link>

      {/* Glassmorphism card */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#18181B]/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {children}
      </div>

      {/* Legal footer */}
      <p className="relative z-10 mt-6 text-center text-xs text-white/40">
        Al continuar, aceptas los{" "}
        <Link
          href="/legal/terminos"
          className="text-white/60 underline underline-offset-4 hover:text-white transition-colors"
        >
          Terminos
        </Link>{" "}
        y la{" "}
        <Link
          href="/legal/privacidad"
          className="text-white/60 underline underline-offset-4 hover:text-white transition-colors"
        >
          Politica de privacidad
        </Link>
        .
      </p>
    </div>
  );
}
