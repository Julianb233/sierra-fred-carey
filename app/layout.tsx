import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import NavBar from "@/components/navbar";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Founder Decision OS | Fred Cary",
  description: "Think Clearer. Raise Smarter. Scale Faster. The AI-powered decision operating system for startup founders.",
  keywords: ["startup", "founder", "fundraising", "investor", "pitch deck", "venture capital", "AI", "decision making"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geist.className} antialiased`}>
          <Providers>
            <NavBar />
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
