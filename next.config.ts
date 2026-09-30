import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is ONLY for the Docker image (self-hosting); the
  // Dockerfile sets BUILD_STANDALONE=1 for its build. Everywhere else —
  // Vercel especially — we build natively. Standalone on Vercel breaks
  // route mapping and every path returns 404: NOT_FOUND. Opt-in (rather
  // than detecting Vercel) so a native build is the default no matter how
  // the host exposes its env.
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
};

export default nextConfig;
