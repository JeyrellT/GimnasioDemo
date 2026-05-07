import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Enable static export for GitHub Pages
  images: {
    unoptimized: true, // Required for static export
  },
  basePath: "/GimnasioDemo", // Your GitHub repo name
  assetPrefix: "/GimnasioDemo",
};

export default nextConfig;
