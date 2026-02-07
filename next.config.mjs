import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Content-Security-Policy – allow self, Stripe, Supabase, and AI providers
// ---------------------------------------------------------------------------
const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.livekit.cloud https://*.anthropic.com https://*.openai.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: ".next",
  generateBuildId: () => "production-build",
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "canvas"],
  transpilePackages: ["framer-motion"],
  typescript: {
    // tsc --noEmit passes separately; skip during build to avoid
    // race with .next/types generation
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/documents/new",
        destination: "/dashboard/strategy",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
