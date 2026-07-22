"use client";

import { useRef } from "react";
import "@/branding/styles/landing.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { BrandingProvider } from "@/lib/branding/branding-context";
import { useRevealOnView } from "@/branding/hooks/use-reveal-on-view";
import { LandingNav } from "@/branding/sections/landing-nav";
import { HeroSection } from "@/branding/sections/hero";
import { MarqueeSection } from "@/branding/sections/marquee";
import { ManifestoSection } from "@/branding/sections/manifesto";
import { ServicesSection } from "@/branding/sections/services";
import { PreviewSection } from "@/branding/sections/preview";
import { VideoDemoSection } from "@/branding/sections/video-demo";
import { LandingFooter } from "@/branding/sections/landing-footer";

function BrandingLandingPageInner() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useRevealOnView(rootRef);

  return (
    <div className="branding-landing" ref={rootRef}>
      {/* Electric lines */}
      <div className="electric electric-1" />
      <div className="electric electric-2" />

      {/* Page chrome */}
      <LandingNav />

      {/* Sections */}
      <HeroSection />
      <MarqueeSection />
      <PreviewSection />
      <ServicesSection />
      <VideoDemoSection />
      <ManifestoSection />

      <LandingFooter />
    </div>
  );
}

// AuthProvider + BrandingProvider envuelven el landing para que cuando un
// trainer logueado lo visite, el preset seleccionado en ajustes inyecte sus
// CSS vars --brand-* en :root y el landing entero (via los tokens --blue,
// --blue-hot, --blue-deep en landing.css) responda automáticamente.
export function BrandingLandingPage() {
  return (
    <AuthProvider>
      <BrandingProvider>
        <BrandingLandingPageInner />
      </BrandingProvider>
    </AuthProvider>
  );
}
