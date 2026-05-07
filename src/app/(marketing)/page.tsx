import Link from "next/link";
import { ArrowRight, BarChart2, ClipboardList, Timer } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forja — Cada repetición te forja",
  description:
    "Plataforma de entrenamiento personal para entrenadores y clientes en Costa Rica. Rutinas, sesiones y métricas en un solo lugar.",
};

const features = [
  {
    icon: ClipboardList,
    title: "Rutinas a medida",
    description:
      "Creá plantillas con días, ejercicios, series y RPE. Asignalas a tus clientes en segundos.",
  },
  {
    icon: Timer,
    title: "Sesiones en el gym",
    description:
      "Registrá cada set con timer de descanso automático. Funciona sin red y sincroniza cuando vuelve.",
  },
  {
    icon: BarChart2,
    title: "Métricas reales",
    description:
      "Peso, PRs, adherencia y volumen semanal. Datos que importan, sin ruido.",
  },
];

const testimonial = {
  quote:
    "Antes mandaba la rutina por WhatsApp y rezaba para que el cliente la leyera. Ahora la asigno, el cliente la ejecuta y yo veo todo en tiempo real.",
  name: "Laura Mora",
  role: "Entrenadora personal — San José, CR",
  initials: "LM",
};

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-24 text-center sm:py-32">
        {/* Background glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF6A1A]/8 blur-3xl" />
        </div>

        <div className="mb-6 inline-flex items-center rounded-full border border-[#FF6A1A]/30 bg-[#FF6A1A]/10 px-3 py-1 text-xs font-medium text-[#FF6A1A]">
          Hecho en Costa Rica
        </div>

        <h1 className="max-w-3xl text-4xl font-bold leading-tight text-[#FAFAFA] sm:text-5xl lg:text-6xl text-balance">
          Cada repetición
          <br />
          <span className="text-[#FF6A1A]">te forja.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base text-[#A1A1AA] sm:text-lg text-balance">
          La plataforma que reemplaza la libreta, el WhatsApp interminable y los
          Excel rotos. Para entrenadores que viven de su oficio y clientes que
          entrenan con propósito.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/registrarse"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#FF6A1A] px-8 py-3 text-base font-semibold text-white hover:bg-[#E55A0E] transition-colors"
          >
            Empezar gratis
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-[48px] items-center rounded-xl border border-[#3F3F46] px-8 py-3 text-base font-medium text-[#FAFAFA] hover:bg-[#18181B] transition-colors"
          >
            Ver precios
          </Link>
        </div>

        <p className="mt-4 text-xs text-[#71717A]">
          30 días gratis. Sin tarjeta requerida.
        </p>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="features-heading" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2
            id="features-heading"
            className="mb-12 text-center text-2xl font-bold text-[#FAFAFA] sm:text-3xl"
          >
            Todo lo que necesitás, nada que no uses
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF6A1A]/10">
                  <Icon className="h-6 w-6 text-[#FF6A1A]" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-[#FAFAFA]">
                  {title}
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ───────────────────────────────────────────────── */}
      <section
        aria-labelledby="pricing-teaser-heading"
        className="bg-[#18181B] px-4 py-20"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="pricing-teaser-heading"
            className="mb-3 text-2xl font-bold text-[#FAFAFA] sm:text-3xl"
          >
            Precios claros, sin sorpresas
          </h2>
          <p className="mb-10 text-[#A1A1AA]">IVA incluido. Precios en colones.</p>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { tier: "Solo", price: "₡8,900", clients: "Hasta 5 clientes", highlight: false },
              { tier: "Pro", price: "₡22,900", clients: "Hasta 25 clientes", highlight: true },
              { tier: "Studio", price: "₡44,900", clients: "Hasta 60 clientes", highlight: false },
            ].map(({ tier, price, clients, highlight }) => (
              <div
                key={tier}
                className={`rounded-2xl border p-6 ${
                  highlight
                    ? "border-[#FF6A1A] bg-[#FF6A1A]/5"
                    : "border-[#3F3F46] bg-[#27272A]"
                }`}
              >
                {highlight && (
                  <div className="mb-3 text-xs font-semibold text-[#FF6A1A] uppercase tracking-wider">
                    Más popular
                  </div>
                )}
                <p className="text-lg font-bold text-[#FAFAFA]">{tier}</p>
                <p className="mt-2 text-3xl font-bold tabular text-[#FAFAFA]">
                  {price}
                  <span className="text-sm font-normal text-[#71717A]">/mes</span>
                </p>
                <p className="mt-1 text-sm text-[#A1A1AA]">{clients}</p>
              </div>
            ))}
          </div>

          <Link
            href="/pricing"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#FF6A1A] hover:text-[#E55A0E] transition-colors"
          >
            Ver comparativa completa
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ── Testimonial ──────────────────────────────────────────────────── */}
      <section aria-labelledby="testimonial-heading" className="px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="testimonial-heading" className="sr-only">
            Testimonio
          </h2>
          <blockquote>
            <p className="text-lg font-medium text-[#FAFAFA] leading-relaxed text-balance">
              &ldquo;{testimonial.quote}&rdquo;
            </p>
            <footer className="mt-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1E2A38] text-sm font-semibold text-[#F5C542]">
                {testimonial.initials}
              </div>
              <cite className="not-italic">
                <p className="font-semibold text-[#FAFAFA]">{testimonial.name}</p>
                <p className="text-sm text-[#71717A]">{testimonial.role}</p>
              </cite>
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <section className="bg-[#1E2A38] px-4 py-24 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl font-bold text-[#FAFAFA] text-balance">
            Empezá a forjar hoy
          </h2>
          <p className="mt-4 text-[#A1A1AA]">
            30 días gratis en cualquier plan. Sin tarjeta.
          </p>
          <Link
            href="/registrarse"
            className="mt-8 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#FF6A1A] px-10 py-3 text-base font-semibold text-white hover:bg-[#E55A0E] transition-colors"
          >
            Crear mi cuenta gratis
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
