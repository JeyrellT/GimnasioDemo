import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isGithubPages && {
    output: "export",
    basePath: "/GimnasioDemo",
    assetPrefix: "/GimnasioDemo",
  }),
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts",
      "date-fns",
      "date-fns-tz",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-scroll-area",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "class-variance-authority",
      "react-hook-form",
      "@hookform/resolvers",
    ],
  },
  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "puppeteer-core",
    "@sparticuz/chromium",
    "pino",
    "pino-pretty",
    "resend",
    "@react-email/components",
  ],
};

export default nextConfig;
