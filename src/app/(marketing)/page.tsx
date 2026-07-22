import type { Metadata } from "next";
import { BrandingLandingPage } from "@/branding/landing-page";

export const metadata: Metadata = {
  title: "Blackline Fitness — Fuerza Orden Escala",
  description:
    "El sistema operativo del entrenador profesional. Rutinas, sesiones offline, métricas de cliente y finanzas en una sola línea de trabajo. No es una app de fitness, es tu negocio entero.",
};

export default function LandingPage() {
  return <BrandingLandingPage />;
}
