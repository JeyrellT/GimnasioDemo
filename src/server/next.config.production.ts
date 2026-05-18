// =============================================================================
// BLACKLINE FITNESS — Production Next.js configuration
// Owner: devops-deploy.
//
// IMPORTANT: This file shows what next.config.ts should look like for
// production. The key difference vs. the demo config is the ABSENCE of
// `output: "export"` — that flag statically exports HTML and disables Server
// Actions, API Routes, and middleware, which are all required in production.
//
// To activate: copy this content into next.config.ts (root of the project).
// =============================================================================

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DO NOT set output: "export" — that disables Server Actions, Route Handlers
  // and middleware. Remove it before deploying to Railway/Vercel/any Node host.

  images: {
    // Allow Next.js image optimization (disabled in demo mode with unoptimized: true)
    unoptimized: false,
    remotePatterns: [
      {
        // Cloudflare R2 presigned read URLs
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        // R2 public-bucket custom domain (if configured)
        protocol: "https",
        hostname: "**.blacklinefitness.app",
      },
    ],
  },

  experimental: {
    serverActions: {
      // Allow Server Actions to receive bodies up to 4 MB (e.g. base64 photos).
      // Default is 1 MB; progress photos can reach ~3 MB before JPEG compression.
      bodySizeLimit: "4mb",
    },
  },

  // ---------------------------------------------------------------------------
  // Security headers — applied to all routes
  // ---------------------------------------------------------------------------
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // ---------------------------------------------------------------------------
  // Redirects — enforce www-less canonical URL
  // ---------------------------------------------------------------------------
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.blacklinefitness.app" }],
        destination: "https://blacklinefitness.app/:path*",
        permanent: true,
      },
    ];
  },

  // ---------------------------------------------------------------------------
  // TypeScript / ESLint — do not block production builds on warnings.
  // CI enforces these separately (tsc --noEmit + eslint in the lint step).
  // ---------------------------------------------------------------------------
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
