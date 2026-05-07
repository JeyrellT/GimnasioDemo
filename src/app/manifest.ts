export const dynamic = "force-static";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forja",
    short_name: "Forja",
    description: "Entrenamiento personal hecho en Costa Rica.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#09090B",
    background_color: "#09090B",
    lang: "es-CR",
    dir: "ltr",
    categories: ["fitness", "health"],
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "Sesión de hoy",
        url: "/client/sesion",
        icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }],
      },
      {
        name: "Mis clientes",
        url: "/trainer/clientes",
        icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/og-image.svg",
        sizes: "1200x630",
        type: "image/svg+xml",
        form_factor: "wide",
      },
    ],
  };
}
