import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Production Readiness — Sahara",
  description: "Sahara platform production readiness dashboard for stakeholders",
  robots: "noindex, nofollow",
}

/**
 * Standalone layout for the production readiness page.
 * Hides the main navbar so this can be shared as a clean dashboard link.
 */
export default function ProductionReadinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
