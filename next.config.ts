import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Env guard — fail fast at build/start if required vars are missing.
// ---------------------------------------------------------------------------
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { validateEnv } = require("./src/server/env") as { validateEnv: () => void };
  validateEnv();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n[next.config] ${message}\n`);
  throw err;
}

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Backward-compatible aliases for tabs or bookmarks created before the
  // shared role-aware dashboard moved to /inicio. This also prevents an old
  // Super Admin bundle from landing on a 404 after starting a mirror session.
  redirects: async () => [
    {
      source: "/client/inicio",
      destination: "/inicio",
      permanent: false,
    },
    {
      source: "/trainer/inicio",
      destination: "/inicio",
      permanent: false,
    },
  ],

  images: {
    remotePatterns: [
      // Exercise GIFs from open-source dataset (all envs)
      {
        protocol: "https" as const,
        hostname: "cdn.jsdelivr.net",
      },
      // Cloudflare R2 storage (production only)
      ...(isProduction
        ? [
            {
              protocol: "https" as const,
              hostname: "**.r2.cloudflarestorage.com",
            },
            {
              protocol: "https" as const,
              hostname: "**.r2.dev",
            },
          ]
        : []),
    ],
  },

  ...(isProduction && {
    experimental: {
      serverActions: {
        bodySizeLimit: "4mb",
      },
    },
  }),

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
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ],
  }),
};

export default nextConfig;
