/**
 * Weekly Engagement Email Template
 * Phase 168: Onboarding Email Notifications
 *
 * Sent to founders who haven't chatted with FRED in 7+ days.
 * Lighter touch than the re-engagement emails — focuses on
 * a specific conversation starter to bring them back.
 */

import {
  Section,
  Text,
  Link,
  Button,
} from '@react-email/components';
import { EmailLayout } from './layout';
import type { WeeklyEngagementEmailData } from '../onboarding/types';

export function WeeklyEngagementEmail(props: WeeklyEngagementEmailData) {
  const { founderName, daysSinceLastChat, suggestedPrompt, fredMessage, appUrl } = props;
  const name = founderName || 'Founder';
  const chatUrl = `${appUrl}/dashboard`;

  return (
    <EmailLayout
      previewText={`${name}, FRED has a question for you`}
      appUrl={appUrl}
    >
      <Section style={{ padding: '0 24px' }}>
        <Text style={{ fontSize: '18px', color: '#1f2937', margin: '0 0 12px 0' }}>
          Hey {name},
        </Text>

        <Text style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.6', marginBottom: '20px' }}>
          {fredMessage}
        </Text>

        {/* Suggested prompt card */}
        <Section
          style={{
            backgroundColor: '#fff7ed',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
            border: '1px solid #fed7aa',
          }}
        >
          <Text style={{ fontSize: '12px', fontWeight: 600, color: '#9a3412', margin: '0 0 8px 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
            Try asking FRED:
          </Text>
          <Text style={{ fontSize: '16px', color: '#78350f', margin: 0, lineHeight: '1.5', fontStyle: 'italic' }}>
            &ldquo;{suggestedPrompt}&rdquo;
          </Text>
        </Section>

        {/* Activity note */}
        <Text style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px' }}>
          It has been {daysSinceLastChat} day{daysSinceLastChat === 1 ? '' : 's'} since your last conversation.
          The most successful founders on Sahara check in with FRED at least once a week.
        </Text>

        {/* CTA */}
        <Section style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
          <Button
            href={chatUrl}
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
            Chat with FRED
          </Button>
        </Section>

        <Text style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
          You are receiving this because you are a founder on{' '}
          <Link href={appUrl} style={{ color: '#ff6a1a' }}>Sahara</Link>.{' '}
          <Link
            href={`${appUrl}/dashboard/settings`}
            style={{ color: '#6b7280', textDecoration: 'underline' }}
          >
            Manage email preferences
          </Link>
        </Text>
      </Section>
    </EmailLayout>
  );
}
