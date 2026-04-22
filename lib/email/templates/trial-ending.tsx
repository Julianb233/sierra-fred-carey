/**
 * Trial Ending Email Template
 *
 * Sent 7 days before a trial subscription expires.
 * Reminds the user what they'll lose and encourages conversion.
 */

import {
  Section,
  Text,
  Link,
} from '@react-email/components'
import { EmailLayout } from './layout'

export interface TrialEndingEmailData {
  founderName: string
  planName: string
  daysRemaining: number
  trialEndDate: string
  appUrl: string
}

export function TrialEndingEmail(props: TrialEndingEmailData) {
  const { founderName, planName, daysRemaining, trialEndDate, appUrl } = props

  return (
    <EmailLayout
      previewText={`Your ${planName} trial ends in ${daysRemaining} days`}
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
          Your trial ends {daysRemaining === 1 ? 'tomorrow' : `in ${daysRemaining} days`}
        </Text>
      </Section>

      {/* Greeting */}
      <Text style={{ fontSize: '16px', color: '#1f2937', margin: '0 0 8px 0' }}>
        Hey {founderName},
      </Text>
      <Text style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 16px 0' }}>
        Your <strong>{planName}</strong> trial wraps up on {trialEndDate}. After
        that, your account will revert to the Free plan and you&apos;ll lose
        access to the features you&apos;ve been using.
      </Text>

      {/* What you'll lose */}
      <Section
        style={{
          backgroundColor: '#fef2f2',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <Text style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', margin: '0 0 8px 0' }}>
          What you&apos;ll lose on the Free plan:
        </Text>
        <Text style={{ fontSize: '13px', color: '#7f1d1d', margin: '0 0 4px 0', lineHeight: '1.5' }}>
          {'\u2022'} Saved founder profile and memory
        </Text>
        <Text style={{ fontSize: '13px', color: '#7f1d1d', margin: '0 0 4px 0', lineHeight: '1.5' }}>
          {'\u2022'} Strategy outputs and roadmaps
        </Text>
        <Text style={{ fontSize: '13px', color: '#7f1d1d', margin: '0 0 4px 0', lineHeight: '1.5' }}>
          {'\u2022'} Priority responses and deeper context
        </Text>
        <Text style={{ fontSize: '13px', color: '#7f1d1d', margin: 0, lineHeight: '1.5' }}>
          {'\u2022'} Early-stage scoring and guidance
        </Text>
      </Section>

      <Text style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        Subscribe now to keep everything you&apos;ve built. Your progress,
        history, and profile will all carry over seamlessly.
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
          Keep My Plan
        </Link>
      </Section>
    </EmailLayout>
  )
}
