import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import NavBar from "@/components/navbar";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sierra-fred-carey.vercel.app"),
  title: "Sahara | AI-Powered Founder Operating System",
  description: "Think Clearer. Raise Smarter. Scale Faster. Sahara is the AI-powered operating system for startup founders. Built by Fred Cary — 10,000+ founders coached.",
  keywords: ["startup", "founder", "fundraising", "investor", "pitch deck", "venture capital", "AI", "Sahara", "Fred Cary"],
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
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
