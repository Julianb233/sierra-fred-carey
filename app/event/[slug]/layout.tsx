/**
 * Event Layout
 * Phase 88: Event Launch Kit
 *
 * Minimal standalone layout with no dashboard nav/sidebar.
 * Dark background with Sahara orange accents.
 */

import type { Viewport } from "next"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
}

export default function EventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">{children}</div>
  )
}
