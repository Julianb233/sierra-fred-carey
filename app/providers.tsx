"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { dark } from "@clerk/themes";

// Make Clerk optional for landing page deployment
const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function Providers({ children }: { children: React.ReactNode }) {
  // If Clerk is not configured, just render with theme provider
  if (!hasClerkKey) {
    return (
      <NextThemesProvider attribute="class" defaultTheme="dark">
        {children}
      </NextThemesProvider>
    );
  }

  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#3b82f6",
          colorBackground: "#1e293b",
        },
      }}
    >
      <NextThemesProvider attribute="class" defaultTheme="dark">
        {children}
      </NextThemesProvider>
    </ClerkProvider>
  );
}
