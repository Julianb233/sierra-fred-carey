"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TierProvider } from "@/lib/context/tier-context";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed — non-critical
      });
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <TierProvider>
        <ServiceWorkerRegistrar />
        <InstallPrompt />
        {children}
      </TierProvider>
    </NextThemesProvider>
  );
}
