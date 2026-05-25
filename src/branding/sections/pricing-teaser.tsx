import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRANDING_PRICING_TIERS } from "@/branding/data/pricing-teaser";

export function PricingTeaserSection() {
  return (
    <section
      aria-labelledby="pricing-teaser-heading"
      className="bg-[#18181B] px-4 py-12 sm:py-20"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="pricing-teaser-heading"
          className="mb-3 text-2xl font-bold text-[#FAFAFA] sm:text-3xl"
        >
          Precios claros, sin sorpresas
        </h2>
        <p className="mb-10 text-[#A1A1AA]">IVA incluido. Precios en colones.</p>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
          {BRANDING_PRICING_TIERS.map(({ tier, price, clients, highlight }) => (
            <div
              key={tier}
              className={`rounded-2xl border p-6 ${
                highlight
                  ? "border-brand-primary bg-brand-primary/5"
                  : "border-[#3F3F46] bg-[#27272A]"
              }`}
            >
              {highlight && (
                <div className="mb-3 text-xs font-semibold text-brand-primary uppercase tracking-wider">
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
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:text-brand-primary-hover transition-colors"
        >
          Ver comparativa completa
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
