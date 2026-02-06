import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: ".next",
  generateBuildId: () => "production-build",
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "canvas"],
};

export default nextConfig;
