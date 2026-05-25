"use client";

import { useRef } from "react";
import "@/branding/styles/landing.css";
import { useCursor } from "@/branding/hooks/use-cursor";
import { useRevealOnView } from "@/branding/hooks/use-reveal-on-view";
import { LandingNav } from "@/branding/sections/landing-nav";
import { HeroSection } from "@/branding/sections/hero";
import { MarqueeSection } from "@/branding/sections/marquee";
import { ManifestoSection } from "@/branding/sections/manifesto";
import { ServicesSection } from "@/branding/sections/services";
import { PreviewSection } from "@/branding/sections/preview";
import { LandingFooter } from "@/branding/sections/landing-footer";

export function BrandingLandingPage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { dotRef, ringRef } = useCursor();
  useRevealOnView(rootRef);

  return (
    <div className="branding-landing" ref={rootRef}>
      {/* Cursor follower */}
      <div className="cursor" ref={dotRef} />
      <div className="cursor-ring" ref={ringRef} />

      {/* Electric lines */}
      <div className="electric electric-1" />
      <div className="electric electric-2" />

      {/* Page chrome */}
      <LandingNav />

      {/* Sections */}
      <HeroSection />
      <MarqueeSection />
      <ManifestoSection />
      <ServicesSection />
      <PreviewSection />

      <LandingFooter />
    </div>
  );
}
