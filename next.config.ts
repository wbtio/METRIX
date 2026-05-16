import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
