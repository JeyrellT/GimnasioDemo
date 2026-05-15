import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const basePath = isGithubPages ? "/GimnasioDemo" : "";

const nextConfig: NextConfig = {
  ...(isGithubPages && {
    output: "export",
    basePath,
    assetPrefix: basePath,
  }),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
