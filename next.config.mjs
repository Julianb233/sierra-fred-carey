import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Serwist PWA -- service worker compilation (wraps before Sentry)
// ---------------------------------------------------------------------------
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/offline", revision }],
  disable: process.env.NODE_ENV === "development",
});

// ---------------------------------------------------------------------------
// Content-Security-Policy is now set per-request in middleware.ts (AI-334)
// with a unique nonce, removing the need for 'unsafe-inline'/'unsafe-eval'.
// ---------------------------------------------------------------------------

/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: Do NOT add generateBuildId with a static string -- it breaks Turbopack builds
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "canvas", "@prisma/instrumentation", "@opentelemetry/instrumentation"],
  transpilePackages: ["framer-motion"],
  // Acknowledge Turbopack as the default bundler in Next.js 16
  turbopack: {},
  typescript: {
    // tsc --noEmit passes separately; skip during build to avoid
    // race with .next/types generation
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          // CSP is now set per-request in middleware.ts with nonce (AI-334)
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/documents/new",
        destination: "/dashboard/strategy",
        permanent: true,
      },
      {
        source: "/waitlist",
        destination: "/get-started",
        permanent: true,
      },
      // Common auth URL aliases -> canonical routes
      { source: "/sign-in", destination: "/login", permanent: true },
      { source: "/signin", destination: "/login", permanent: true },
      { source: "/sign-up", destination: "/signup", permanent: true },
      { source: "/register", destination: "/signup", permanent: true },
    ];
  },
};

// Serwist wraps first (inner), then Sentry wraps second (outer)
const serwistConfig = withSerwist(nextConfig);

const finalConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(serwistConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
      tunnelRoute: "/monitoring-tunnel",
    })
  : serwistConfig;

export default finalConfig;
