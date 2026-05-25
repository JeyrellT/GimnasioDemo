import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-16 text-center sm:py-24 lg:py-32">
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-primary/8 blur-3xl" />
      </div>

      <div className="mb-6 inline-flex items-center rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary">
        Hecho en Costa Rica
      </div>

      <h1 className="max-w-3xl text-3xl font-bold leading-tight text-[#FAFAFA] sm:text-5xl lg:text-6xl text-balance">
        Tu línea,
        <br />
        <span className="text-brand-primary">tu fuerza.</span>
      </h1>

      <p className="mt-6 max-w-xl text-base text-[#A1A1AA] sm:text-lg text-balance">
        Rutinas, métricas, sesiones en vivo y finanzas de tu negocio — en
        una app que funciona hasta sin señal. Para entrenadores que quieren
        escalar sin perder el toque personal.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/registrarse"
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-8 py-3 text-base font-semibold text-white hover:bg-brand-primary-hover transition-colors sm:w-auto"
        >
          Empezar gratis
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href="/pricing"
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-[#3F3F46] px-8 py-3 text-base font-medium text-[#FAFAFA] hover:bg-[#18181B] transition-colors sm:w-auto"
        >
          Ver precios
        </Link>
      </div>

      <p className="mt-4 text-xs text-[#71717A]">
        30 días gratis. Sin tarjeta requerida.
      </p>
    </section>
  );
}
