/**
 * Milestone Celebration Email Template
 * Phase 31-02: Email Engagement
 *
 * Congratulatory email with milestone details, Fred quote, and next step.
 */

import {
  Section,
  Text,
  Link,
} from '@react-email/components';
import { EmailLayout } from './layout';
import type { MilestoneEmailData } from '../milestones/types';

export function MilestoneEmail(props: MilestoneEmailData) {
  const {
    founderName,
    milestoneTitle,
    milestoneDescription,
    fredQuote,
    nextSuggestion,
    appUrl,
  } = props;

  return (
    <EmailLayout
      previewText={`Congratulations! ${milestoneTitle}`}
      appUrl={appUrl}
    >
      {/* Celebration header */}
      <Section style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
        <Text
          style={{
            fontSize: '32px',
            margin: '0 0 8px 0',
          }}
        >
          {'\u{1F389}'}
        </Text>
        <Text
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#6366f1',
            margin: '0 0 4px 0',
          }}
        >
          {milestoneTitle}
        </Text>
      </Section>

      {/* Greeting and description */}
      <Text style={{ fontSize: '16px', color: '#1f2937', margin: '0 0 8px 0' }}>
        Hey {founderName},
      </Text>
      <Text style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        {milestoneDescription}
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
          &ldquo;{fredQuote}&rdquo;
        </Text>
        <Text style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
          — FRED
        </Text>
      </Section>

      {/* What's Next */}
      <Section
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <Text style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', margin: '0 0 4px 0' }}>
          What&apos;s Next?
        </Text>
        <Text style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: '1.5' }}>
          {nextSuggestion}
        </Text>
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: 'center' as const }}>
        <Link
          href={`${appUrl}/dashboard`}
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
          Continue Your Journey
        </Link>
      </Section>
    </EmailLayout>
  );
}
