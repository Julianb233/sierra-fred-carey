"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TierProvider } from "@/lib/context/tier-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <TierProvider>
        {children}
      </TierProvider>
    </NextThemesProvider>
  );
}
