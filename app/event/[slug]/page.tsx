/**
 * Event Landing Page Route
 * Phase 88: Event Launch Kit
 *
 * Dynamic route at /event/[slug] for QR-code-driven signups.
 * Server component handles config lookup and metadata generation.
 * Client wrapper handles analytics tracking and signup flow.
 */

import { notFound } from "next/navigation"
import { getEventConfig } from "@/lib/event/config"
import { EventLandingClient } from "./client"

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const config = getEventConfig(slug)
  if (!config) return { title: "Event Not Found" }

  return {
    title: `${config.name} | Sahara`,
    description: config.tagline,
    openGraph: {
      title: config.name,
      description: config.tagline,
    },
  }
}

// ============================================================================
// Page
// ============================================================================

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const config = getEventConfig(slug)

  if (!config) {
    notFound()
  }

  return <EventLandingClient config={config} />
}
