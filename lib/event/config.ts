/**
 * Event Configuration
 * Phase 88: Event Launch Kit
 *
 * Defines event configs keyed by slug. Each event has its own
 * landing page at /event/[slug], trial settings, and redirect flow.
 */

export interface EventConfig {
  slug: string
  name: string
  headline: string
  tagline: string
  date: string
  location: string
  trialDays: number
  trialTier: "pro"
  redirectAfterSignup: string
  /** URL used in QR codes — absolute path from site root */
  landingPath: string
  active: boolean
}

export const EVENT_CONFIGS: Record<string, EventConfig> = {
  "palo-alto-2026": {
    slug: "palo-alto-2026",
    name: "Sahara Founder Launch",
    headline: "Meet FRED — Your AI Startup Mentor",
    tagline: "Your AI co-pilot for the startup journey. 14 days free.",
    date: "2026-03-22",
    location: "Palo Alto, CA",
    trialDays: 14,
    trialTier: "pro",
    redirectAfterSignup: "/welcome",
    landingPath: "/event/palo-alto-2026",
    active: true,
  },
}

/**
 * Get event config by slug. Returns null for unknown or inactive events.
 */
export function getEventConfig(slug: string): EventConfig | null {
  const config = EVENT_CONFIGS[slug]
  if (!config || !config.active) return null
  return config
}
