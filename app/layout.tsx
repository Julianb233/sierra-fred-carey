import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import NavBar from "@/components/navbar";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://joinsahara.com"),
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
        <Script
          src="https://link.msgsndr.com/js/external-tracking.js"
          data-tracking-id="tk_42c4652bb7654480a513653a8c7f4e1f"
          strategy="afterInteractive"
        />
        <Providers>
          <AnalyticsProvider>
            <NavBar />
            {children}
          </AnalyticsProvider>
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
