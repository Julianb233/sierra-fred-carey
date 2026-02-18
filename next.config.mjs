import { withSentryConfig } from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Content-Security-Policy – allow self, Stripe, Supabase, and AI providers
// ---------------------------------------------------------------------------
const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://link.msgsndr.com https://vercel.live https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co wss://*.livekit.cloud https://*.anthropic.com https://*.openai.com https://*.ingest.sentry.io https://*.msgsndr.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: Do NOT add generateBuildId with a static string — it breaks Turbopack builds
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "canvas"],
  transpilePackages: ["framer-motion"],
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
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy,
          },
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
    ];
  },
};

const finalConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
      tunnelRoute: "/monitoring-tunnel",
    })
  : nextConfig;

export default finalConfig;
