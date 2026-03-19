/**
 * Onboarding Progress Reminder Email Template
 * Phase 168: Onboarding Email Notifications
 *
 * Sent 24 hours after signup if the founder has not completed onboarding.
 * Shows completed vs pending steps and encourages the founder to continue.
 */

import {
  Section,
  Text,
  Link,
  Button,
} from '@react-email/components';
import { EmailLayout } from './layout';
import type { OnboardingReminderEmailData } from '../onboarding/types';

export function OnboardingReminderEmail(props: OnboardingReminderEmailData) {
  const { founderName, completedSteps, pendingSteps, appUrl } = props;
  const name = founderName || 'Founder';
  const dashboardUrl = `${appUrl}/dashboard`;

  return (
    <EmailLayout
      previewText={`${name}, you're almost there — finish setting up Sahara`}
      appUrl={appUrl}
    >
      <Section style={{ padding: '0 24px' }}>
        <Text style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          You're almost there, {name}
        </Text>

        <Text style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.6', marginBottom: '20px' }}>
          You signed up for Sahara yesterday but haven't finished setting things up.
          The founders who get the most out of Sahara complete these steps in their first session:
        </Text>

        {/* Completed steps */}
        {completedSteps.length > 0 && (
          <Section style={{ marginBottom: '16px' }}>
            {completedSteps.map((step, i) => (
              <Text
                key={i}
                style={{
                  fontSize: '14px',
                  color: '#059669',
                  margin: '0 0 6px 0',
                  lineHeight: '1.5',
                }}
              >
                {'  \u2705  '}{step}
              </Text>
            ))}
          </Section>
        )}

        {/* Pending steps */}
        {pendingSteps.length > 0 && (
          <Section style={{ marginBottom: '24px' }}>
            {pendingSteps.map((step, i) => (
              <Text
                key={i}
                style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '0 0 6px 0',
                  lineHeight: '1.5',
                }}
              >
                {'  \u25CB  '}{step}
              </Text>
            ))}
          </Section>
        )}

        {/* Quote / motivation */}
        <Section
          style={{
            borderLeft: '3px solid #ff6a1a',
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
            &ldquo;The hardest part of any journey is showing up. You already did that — now let&apos;s keep the momentum going.&rdquo;
          </Text>
          <Text style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
            — FRED
          </Text>
        </Section>

        {/* CTA */}
        <Section style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
          <Button
            href={dashboardUrl}
            style={{
              backgroundColor: '#ff6a1a',
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Continue Setup
          </Button>
        </Section>

        <Text style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
          You are receiving this because you signed up for{' '}
          <Link href={appUrl} style={{ color: '#ff6a1a' }}>Sahara</Link>.
          If you have questions, reply to this email or chat with FRED on the platform.
        </Text>
      </Section>
    </EmailLayout>
  );
}
