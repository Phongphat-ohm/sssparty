import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  allowedDevOrigins: ["selfdev.ppkxb.space"]
};

export default nextConfig;
