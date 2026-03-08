"use client"

/**
 * Event Landing Client Wrapper
 * Phase 88: Event Launch Kit
 *
 * Handles PostHog tracking on mount and wraps the EventLanding component.
 */

import { useEffect } from "react"
import { trackEvent } from "@/lib/analytics"
import { EVENT_ANALYTICS } from "@/lib/event/analytics"
import { EventLanding } from "@/components/event/event-landing"
import type { EventConfig } from "@/lib/event/config"

interface EventLandingClientProps {
  config: EventConfig
}

export function EventLandingClient({ config }: EventLandingClientProps) {
  useEffect(() => {
    trackEvent(EVENT_ANALYTICS.LANDING_VIEW, {
      eventSlug: config.slug,
      eventName: config.name,
    })
  }, [config.slug, config.name])

  return <EventLanding config={config} />
}
