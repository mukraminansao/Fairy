import type { NextConfig } from "next";

const config: NextConfig = {
  distDir: process.env.FAIRY_NEXT_DIST_DIR ?? ".next",
  devIndicators: false,
  agentRules: false,
  images: { qualities: [75, 85] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/camera-runtime/tracker.js",
        headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'" }],
      },
      {
        source: "/studio/beauty",
        headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=()" }],
      },
    ];
  },
};

export default config;

