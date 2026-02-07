import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
