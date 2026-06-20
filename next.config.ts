import type { NextConfig } from "next";

const isMobileBuild = process.env.BUILD_MOBILE === "1";

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(isMobileBuild
    ? {
        output: "export" as const,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
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
            {
              protocol: "https",
              hostname: "ik.imagekit.io",
            },
          ],
        },
      }),
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
