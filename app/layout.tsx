import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import NavBar from "@/components/navbar";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";

// Force dynamic rendering to avoid prerender errors with client components
// that use React hooks (framer-motion, etc.) during static generation.
// See: https://github.com/vercel/next.js/issues/85668
export const dynamic = "force-dynamic";

const geist = Geist({
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#080808" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://sierra-fred-carey.vercel.app"),
  title: "Sahara | AI-Powered Founder Operating System",
  description: "Think Clearer. Raise Smarter. Scale Faster. Sahara is the AI-powered operating system for startup founders. Built by Fred Cary — 10,000+ founders coached.",
  keywords: ["startup", "founder", "fundraising", "investor", "pitch deck", "venture capital", "AI", "Sahara", "Fred Cary"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sahara",
  },
  openGraph: {
    title: "Sahara | AI-Powered Founder Operating System",
    description: "Think Clearer. Raise Smarter. Scale Faster. AI operating system for startup founders.",
    images: ["/preview.png"],
    type: "website",
    siteName: "Sahara",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sahara | AI-Powered Founder Operating System",
    description: "Think Clearer. Raise Smarter. Scale Faster. AI operating system for startup founders.",
    images: ["/preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} antialiased`}>
        <Providers>
          <NavBar />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              },
              classNames: {
                success: "!bg-green-50 !border-green-200 dark:!bg-green-950 dark:!border-green-800",
                error: "!bg-red-50 !border-red-200 dark:!bg-red-950 dark:!border-red-800",
              },
            }}
            richColors
            closeButton
          />
        </Providers>
      </body>
    </html>
  );
}
