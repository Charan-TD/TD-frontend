import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The portal is a single client-side page that talks to the Railway API,
  // so it is built as plain static files (out/) that Netlify serves directly.
  output: "export",
};

export default nextConfig;
