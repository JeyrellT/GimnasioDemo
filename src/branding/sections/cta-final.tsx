import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaFinalSection() {
  return (
    <section className="bg-[#1E2A38] px-4 py-16 text-center sm:py-24">
      <div className="mx-auto max-w-xl">
        <h2 className="text-2xl font-bold text-[#FAFAFA] text-balance sm:text-3xl">
          Empezá hoy
        </h2>
        <p className="mt-4 text-[#A1A1AA]">
          30 días gratis en cualquier plan. Sin tarjeta.
        </p>
        <Link
          href="/registrarse"
          className="mt-8 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-brand-primary px-10 py-3 text-base font-semibold text-white hover:bg-brand-primary-hover transition-colors"
        >
          Crear mi cuenta gratis
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
