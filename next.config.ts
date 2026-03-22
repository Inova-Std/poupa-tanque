import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
};

export default pwaConfig(nextConfig);
