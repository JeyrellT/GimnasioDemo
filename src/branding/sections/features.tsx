import { BRANDING_FEATURES } from "@/branding/data/features";

export function FeaturesSection() {
  return (
    <section aria-labelledby="features-heading" className="px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <h2
          id="features-heading"
          className="mb-8 text-center text-2xl font-bold text-[#FAFAFA] sm:mb-12 sm:text-3xl"
        >
          Todo lo que necesitás, nada que no uses
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {BRANDING_FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#3F3F46] bg-[#18181B] p-6"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
                <Icon className="h-6 w-6 text-brand-primary" aria-hidden="true" />
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
  );
}
