export const dynamic = "force-static";
import type { MetadataRoute } from "next";

const base = process.env.GITHUB_PAGES === "true" ? "/GimnasioDemo" : "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vizion",
    short_name: "Vizion",
    description: "Entrenamiento personal hecho en Costa Rica.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    theme_color: "#09090B",
    background_color: "#09090B",
    lang: "es-CR",
    dir: "ltr",
    categories: ["fitness", "health"],
    icons: [
      {
        src: `${base}/icons/icon-192.svg`,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: `${base}/icons/icon-512.svg`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: `${base}/icons/icon-192.svg`,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: `${base}/icons/apple-touch-icon.svg`,
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "Sesión de hoy",
        url: `${base}/client/sesion`,
        icons: [{ src: `${base}/icons/icon-192.svg`, sizes: "192x192" }],
      },
      {
        name: "Mis clientes",
        url: `${base}/trainer/clientes`,
        icons: [{ src: `${base}/icons/icon-192.svg`, sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: `${base}/og-image.svg`,
        sizes: "1200x630",
        type: "image/svg+xml",
        form_factor: "wide",
      },
    ],
  };
}
