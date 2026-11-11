import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
