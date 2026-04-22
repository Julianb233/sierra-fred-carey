"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TierProvider } from "@/lib/context/tier-context";
import { PaywallProvider } from "@/lib/context/paywall-context";
import { PaywallModal } from "@/components/tier/paywall-modal";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <TierProvider>
        <PaywallProvider>
          <InstallPrompt />
          {children}
          <PaywallModal />
        </PaywallProvider>
      </TierProvider>
    </NextThemesProvider>
  );
}
