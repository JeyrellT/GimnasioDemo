import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Env guard — fail fast at build/start if required vars are missing.
// Only runs in server/Node.js context (not during static export builds).
// ---------------------------------------------------------------------------
const isGithubPages = process.env.GITHUB_PAGES === "true";

if (!isGithubPages && process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
  // Dynamic import keeps next.config.ts edge-safe; the actual validation
  // runs synchronously inside server/env.ts when the module is first loaded.
  // We use a top-level require because next.config.ts is evaluated by Node.js
  // (not bundled by Webpack) and ESM dynamic import returns a Promise that
  // cannot be awaited at module top-level here.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateEnv } = require("./src/server/env") as { validateEnv: () => void };
    validateEnv();
  } catch (err) {
    // Surface a clear error message — Next.js sometimes swallows thrown errors
    // from next.config.ts without printing the cause.
    const message = err instanceof Error ? err.message : String(err);
    // biome-ignore lint/suspicious/noConsole: intentional startup failure log
    console.error("\n[next.config] " + message + "\n");
    // Re-throw so the build/start process exits non-zero.
    throw err;
  }
}

const isProduction = process.env.NODE_ENV === "production" && !isGithubPages;

const basePath = isGithubPages ? "/BlacklineFitness" : "";

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
