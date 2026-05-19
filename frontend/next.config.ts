import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloud Run deployment (copies only runtime files into .next/standalone)
  output: "standalone",

  async rewrites() {
    // In production the backend URL is injected via NEXT_PUBLIC_API_URL.
    // In local dev it falls back to localhost:8000.
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${backendUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
