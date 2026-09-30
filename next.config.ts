import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone is for the Docker image (self-hosting). On Vercel it breaks
  // route mapping (every path 404s), so only emit it off-Vercel, where
  // `VERCEL` is unset. Vercel then builds the app natively.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
