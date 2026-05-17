import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const isProduction = process.env.NODE_ENV === "production" && !isGithubPages;

const basePath = isGithubPages ? "/GimnasioDemo" : "";

const nextConfig: NextConfig = {
  // --- Demo mode (GitHub Pages): static export, no server features ----------
  ...(isGithubPages && {
    output: "export",
    basePath,
    assetPrefix: basePath,
  }),

  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_DEMO_MODE: isGithubPages ? "true" : "false",
  },

  images: {
    // GitHub Pages: no image optimization (static export)
    // Railway/Production: enable with remote patterns for R2
    unoptimized: isGithubPages,
    ...(isProduction && {
      remotePatterns: [
        {
          protocol: "https" as const,
          hostname: "**.r2.cloudflarestorage.com",
        },
        {
          protocol: "https" as const,
          hostname: "**.r2.dev",
        },
      ],
    }),
  },

  // --- Production: enable Server Actions with larger body for photo uploads --
  ...(isProduction && {
    experimental: {
      serverActions: {
        bodySizeLimit: "4mb",
      },
    },
  }),

  // --- Security headers (production only) ------------------------------------
  ...(isProduction && {
    headers: async () => [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ],
  }),
};

export default nextConfig;
