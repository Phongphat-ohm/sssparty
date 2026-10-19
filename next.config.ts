import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  allowedDevOrigins: ["selfdev.ppkxb.space"]
};

export default nextConfig;
