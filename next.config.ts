import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dd.dexscreener.com",
      },
      {
        protocol: "https",
        hostname: "images.dexscreener.com",
      },
      {
        protocol: "https",
        hostname: "cdn.dexscreener.com",
      },
      {
        protocol: "https",
        hostname: "**.dexscreener.com",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/submit",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;