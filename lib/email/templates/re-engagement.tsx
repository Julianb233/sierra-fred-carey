/**
 * Re-engagement Email Template
 * Phase 31-02: Email Engagement
 *
 * Graduated nudge email for inactive users (day7, day14, day30).
 */

import {
  Section,
  Text,
  Link,
} from '@react-email/components';
import { EmailLayout } from './layout';
import type { ReEngagementEmailData } from '../re-engagement/types';

const PREVIEW_TEXT: Record<string, string> = {
  day7: 'FRED misses you',
  day14: 'Your startup journey is waiting',
  day30: 'One more thing...',
};

export function ReEngagementEmail(props: ReEngagementEmailData) {
  const {
    founderName,
    tier,
    fredMessage,
    featureHighlight,
    appUrl,
  } = props;

  const isDay30 = tier === 'day30';

  return (
    <EmailLayout
      previewText={PREVIEW_TEXT[tier] || 'We miss you'}
      appUrl={appUrl}
    >
      {/* Greeting */}
      <Text style={{ fontSize: '18px', color: '#1f2937', margin: '0 0 16px 0' }}>
        Hey {founderName},
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

      {/* Feature highlight card */}
      <Section
        style={{
          backgroundColor: '#f0f0ff',
          borderRadius: '6px',
          padding: '16px 20px',
          marginBottom: '24px',
          borderLeft: '3px solid #6366f1',
        }}
      >
        <Text style={{ fontSize: '13px', color: '#4338ca', margin: 0, lineHeight: '1.6' }}>
          {featureHighlight}
        </Text>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: 'center' as const, marginBottom: '16px' }}>
        <Link
          href={`${appUrl}/dashboard`}
          style={{
            display: 'inline-block',
            backgroundColor: isDay30 ? '#6b7280' : '#6366f1',
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Come Back to Sahara
        </Link>
      </Section>

      {/* Day 30 soft close */}
      {isDay30 && (
        <Text
          style={{
            fontSize: '12px',
            color: '#9ca3af',
            textAlign: 'center' as const,
            margin: '8px 0 0 0',
            fontStyle: 'italic',
          }}
        >
          No pressure at all. We&apos;ll be here if you need us.
        </Text>
      )}
    </EmailLayout>
  );
}
