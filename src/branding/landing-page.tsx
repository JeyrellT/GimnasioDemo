import { HeroSection } from "@/branding/sections/hero";
import { FeaturesSection } from "@/branding/sections/features";
import { PricingTeaserSection } from "@/branding/sections/pricing-teaser";
import { TestimonialSection } from "@/branding/sections/testimonial";
import { CtaFinalSection } from "@/branding/sections/cta-final";

export function BrandingLandingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <PricingTeaserSection />
      <TestimonialSection />
      <CtaFinalSection />
    </>
  );
}
