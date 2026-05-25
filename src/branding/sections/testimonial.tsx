import { BRANDING_TESTIMONIAL } from "@/branding/data/testimonial";

export function TestimonialSection() {
  return (
    <section aria-labelledby="testimonial-heading" className="px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="testimonial-heading" className="sr-only">
          Testimonio
        </h2>
        <blockquote>
          <p className="text-base font-medium text-[#FAFAFA] leading-relaxed text-balance sm:text-lg">
            &ldquo;{BRANDING_TESTIMONIAL.quote}&rdquo;
          </p>
          <footer className="mt-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1E2A38] text-sm font-semibold text-brand-accent">
              {BRANDING_TESTIMONIAL.initials}
            </div>
            <cite className="not-italic">
              <p className="font-semibold text-[#FAFAFA]">{BRANDING_TESTIMONIAL.name}</p>
              <p className="text-sm text-[#71717A]">{BRANDING_TESTIMONIAL.role}</p>
            </cite>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
