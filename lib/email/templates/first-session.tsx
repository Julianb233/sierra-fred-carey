/**
 * First Session Completed Email Template
 * Phase 168: Onboarding Email Notifications
 *
 * Sent after a founder completes their first conversation with FRED.
 * Congratulates them and suggests next steps.
 */

import {
  Section,
  Text,
  Link,
  Button,
} from '@react-email/components';
import { EmailLayout } from './layout';
import type { FirstSessionEmailData } from '../onboarding/types';

export function FirstSessionEmail(props: FirstSessionEmailData) {
  const { founderName, sessionHighlight, fredQuote, appUrl } = props;
  const name = founderName || 'Founder';
  const dashboardUrl = `${appUrl}/dashboard`;

  return (
    <EmailLayout
      previewText={`Great first session, ${name} — here's what's next`}
      appUrl={appUrl}
    >
      <Section style={{ padding: '0 24px' }}>
        {/* Celebration */}
        <Section style={{ textAlign: 'center' as const, marginBottom: '16px' }}>
          <Text style={{ fontSize: '32px', margin: '0 0 8px 0' }}>
            {'\u{1F680}'}
          </Text>
          <Text style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
            Your First Session with FRED!
          </Text>
        </Section>

        <Text style={{ fontSize: '16px', color: '#4b5563', lineHeight: '1.6', marginBottom: '16px' }}>
          Hey {name}, congratulations on completing your first conversation with FRED.
          That first step is the most important one.
        </Text>

        {/* Session highlight */}
        {sessionHighlight && (
          <Section
            style={{
              backgroundColor: '#fff7ed',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '20px',
            }}
          >
            <Text style={{ fontSize: '13px', fontWeight: 600, color: '#9a3412', margin: '0 0 6px 0' }}>
              Session Highlight
            </Text>
            <Text style={{ fontSize: '14px', color: '#78350f', margin: 0, lineHeight: '1.5' }}>
              {sessionHighlight}
            </Text>
          </Section>
        )}

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
          <Text style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937', margin: '0 0 8px 0' }}>
            What to do next:
          </Text>
          <Text style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 4px 0' }}>
            1. Run a Reality Lens analysis to get honest feedback on your startup
          </Text>
          <Text style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 4px 0' }}>
            2. Check your Investor Readiness Score on the dashboard
          </Text>
          <Text style={{ fontSize: '14px', color: '#4b5563', margin: 0 }}>
            3. Ask FRED about your biggest challenge right now
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
            Continue Your Journey
          </Button>
        </Section>

        <Text style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
          You are receiving this because you completed your first session on{' '}
          <Link href={appUrl} style={{ color: '#ff6a1a' }}>Sahara</Link>.
        </Text>
      </Section>
    </EmailLayout>
  );
}
