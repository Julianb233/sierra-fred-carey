/**
 * Free Limit Hit Email Template
 *
 * Sent when a free-tier user reaches their usage limit.
 * Encourages upgrade with feature highlights for the next tier.
 */

import {
  Section,
  Text,
  Link,
} from '@react-email/components'
import { EmailLayout } from './layout'

export interface FreeLimitHitEmailData {
  founderName: string
  limitDescription: string
  appUrl: string
}

export function FreeLimitHitEmail(props: FreeLimitHitEmailData) {
  const { founderName, limitDescription, appUrl } = props

  return (
    <EmailLayout
      previewText="You've hit your free plan limit on Sahara"
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
          You&apos;ve reached your free plan limit
        </Text>
      </Section>

      {/* Greeting */}
      <Text style={{ fontSize: '16px', color: '#1f2937', margin: '0 0 8px 0' }}>
        Hey {founderName},
      </Text>
      <Text style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 16px 0' }}>
        {limitDescription}
      </Text>
      <Text style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        You&apos;ve been making real progress. Upgrading unlocks saved profiles, deeper
        strategy outputs, and priority responses so you can keep the momentum going.
      </Text>

      {/* Feature highlights */}
      <Section
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <Text style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', margin: '0 0 8px 0' }}>
          What you get with Builder ($39/mo):
        </Text>
        <Text style={{ fontSize: '13px', color: '#4b5563', margin: '0 0 4px 0', lineHeight: '1.5' }}>
          {'\u2022'} Saved founder profile + memory
        </Text>
        <Text style={{ fontSize: '13px', color: '#4b5563', margin: '0 0 4px 0', lineHeight: '1.5' }}>
          {'\u2022'} Strategy outputs (lean plans, roadmaps)
        </Text>
        <Text style={{ fontSize: '13px', color: '#4b5563', margin: '0 0 4px 0', lineHeight: '1.5' }}>
          {'\u2022'} Early-stage scoring + guidance
        </Text>
        <Text style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: '1.5' }}>
          {'\u2022'} Priority responses
        </Text>
      </Section>

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
          View Plans
        </Link>
      </Section>
    </EmailLayout>
  )
}
