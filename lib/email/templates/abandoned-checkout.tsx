/**
 * Abandoned Checkout Email Template
 *
 * Sent 24 hours after a user starts a checkout session but doesn't complete it.
 * Light nudge with a direct link back to pricing.
 */

import {
  Section,
  Text,
  Link,
} from '@react-email/components'
import { EmailLayout } from './layout'

export interface AbandonedCheckoutEmailData {
  founderName: string
  planName: string
  appUrl: string
}

export function AbandonedCheckoutEmail(props: AbandonedCheckoutEmailData) {
  const { founderName, planName, appUrl } = props

  return (
    <EmailLayout
      previewText={`Still thinking about the ${planName} plan?`}
      appUrl={appUrl}
    >
      {/* Header */}
      <Section style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
        <Text
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#1f2937',
            margin: '0 0 4px 0',
          }}
        >
          Still thinking it over?
        </Text>
      </Section>

      {/* Greeting */}
      <Text style={{ fontSize: '16px', color: '#1f2937', margin: '0 0 8px 0' }}>
        Hey {founderName},
      </Text>
      <Text style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 16px 0' }}>
        We noticed you started upgrading to the <strong>{planName}</strong> plan
        but didn&apos;t finish. No pressure, just wanted to make sure nothing
        got in the way.
      </Text>

      {/* Fred quote */}
      <Section
        style={{
          borderLeft: '3px solid #6366f1',
          paddingLeft: '16px',
          marginBottom: '24px',
        }}
      >
        <Text
          style={{
            fontSize: '14px',
            fontStyle: 'italic',
            color: '#6b7280',
            lineHeight: '1.6',
            margin: 0,
          }}
        >
          &ldquo;The founders who win aren&apos;t the ones with the best idea.
          They&apos;re the ones who keep showing up.&rdquo;
        </Text>
        <Text style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
          — FRED
        </Text>
      </Section>

      <Text style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        Your checkout is still available. Pick up where you left off whenever
        you&apos;re ready.
      </Text>

      {/* CTA */}
      <Section style={{ textAlign: 'center' as const }}>
        <Link
          href={`${appUrl}/pricing`}
          style={{
            display: 'inline-block',
            backgroundColor: '#6366f1',
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Complete Your Upgrade
        </Link>
      </Section>
    </EmailLayout>
  )
}
