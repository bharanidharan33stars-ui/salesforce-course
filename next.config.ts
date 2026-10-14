import type { NextConfig } from "next";

/**
 * In development every /api request is proxied to the Express backend.
 * Because the browser only ever talks to the Next origin, the site works
 * identically on this PC (localhost:3000) and on a phone
 * (http://<pc-ip>:3000) with no extra configuration and no CORS.
 */
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Hide the floating "N" dev-tools button in the corner during development.
  devIndicators: false,
  // Keep server-only secrets out of the browser bundle. Only NEXT_PUBLIC_*
  // variables are exposed to client code.
  env: {},
  output: "standalone",
  async rewrites() {
    // On Vercel, /api/* is served by the Express function (api/index.ts via
    // vercel.json rewrites) on the SAME origin - proxying to API_PROXY_TARGET
    // there would loop back to localhost:4000, so the rule only exists locally.
    if (process.env.VERCEL) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
