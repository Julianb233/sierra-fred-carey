"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TierProvider } from "@/lib/context/tier-context";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <TierProvider>
        <InstallPrompt />
        {children}
      </TierProvider>
    </NextThemesProvider>
  );
}
