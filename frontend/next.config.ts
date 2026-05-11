import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
      {
        pathname: "/api/proxy/articles/serve-image",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      // Thêm các hostname khác nếu có
    ],
  },
};

export default nextConfig;
