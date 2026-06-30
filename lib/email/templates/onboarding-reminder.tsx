/**
 * Onboarding Reminder Email Template
 * AI-3518: Automated email + text reminders for user engagement
 *
 * Graduated onboarding nudge email (day1, day3, day7) for users who signed up
 * but have not finished onboarding. Branded via the shared EmailLayout.
 */

import { Section, Text, Link } from '@react-email/components';
import { EmailLayout } from './layout';
import type { OnboardingReminderEmailData } from '../../onboarding-reminders/types';

const PREVIEW_TEXT: Record<string, string> = {
  day1: 'Finish setting up Sahara — it takes 2 minutes',
  day3: 'Your founder roadmap is one step away',
  day7: "We're still here when you're ready",
};

export function OnboardingReminderEmail(props: OnboardingReminderEmailData) {
  const { founderName, tier, headline, fredMessage, ctaLabel, appUrl } = props;

  const isDay7 = tier === 'day7';
  const onboardingUrl = `${appUrl}/onboarding`;

  return (
    <EmailLayout
      previewText={PREVIEW_TEXT[tier] || 'Finish setting up Sahara'}
      appUrl={appUrl}
    >
      {/* Greeting */}
      <Text style={{ fontSize: '18px', color: '#1f2937', margin: '0 0 16px 0' }}>
        Hey {founderName},
      </Text>

      {/* Headline */}
      <Text
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#111827',
          margin: '0 0 16px 0',
        }}
      >
        {headline}
      </Text>

      {/* Fred's message */}
      <Text
        style={{
          fontSize: '14px',
          color: '#4b5563',
          lineHeight: '1.7',
          margin: '0 0 24px 0',
        }}
      >
        {fredMessage}
      </Text>

      {/* CTA */}
      <Section style={{ textAlign: 'center' as const, marginBottom: '16px' }}>
        <Link
          href={onboardingUrl}
          style={{
            display: 'inline-block',
            backgroundColor: isDay7 ? '#6b7280' : '#ff6a1a',
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          {ctaLabel}
        </Link>
      </Section>

      {/* Day 7 soft close */}
      {isDay7 && (
        <Text
          style={{
            fontSize: '12px',
            color: '#9ca3af',
            textAlign: 'center' as const,
            margin: '8px 0 0 0',
            fontStyle: 'italic',
          }}
        >
          No pressure at all. Everything you started is saved.
        </Text>
      )}
    </EmailLayout>
  );
}
