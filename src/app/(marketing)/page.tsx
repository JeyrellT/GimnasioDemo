import type { Metadata } from "next";
import { BrandingLandingPage } from "@/branding/landing-page";

export const metadata: Metadata = {
  title: "Blackline Fitness — Tu línea, tu fuerza",
  description:
    "Rutinas, métricas, sesiones en vivo y finanzas — en una app que funciona sin señal. Para entrenadores que quieren escalar sin perder el toque personal.",
};

export default function LandingPage() {
  return <BrandingLandingPage />;
}
