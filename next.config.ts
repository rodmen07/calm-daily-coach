import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const repoName = "calm-daily-coach";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: isProduction ? `/${repoName}` : "",
  assetPrefix: isProduction ? `/${repoName}/` : undefined,
};

export default nextConfig;
