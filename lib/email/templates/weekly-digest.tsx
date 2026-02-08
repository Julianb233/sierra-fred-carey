/**
 * Weekly Digest Email Template
 * Phase 31: Email Engagement
 *
 * Renders a branded weekly summary email with stats grid,
 * highlights, and call-to-action using @react-email/components.
 */

import {
  Section,
  Text,
  Link,
  Row,
  Column,
} from '@react-email/components';
import { EmailLayout } from './layout';
import type { DigestData, DigestHighlight } from '../types';

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Column
      style={{
        textAlign: 'center' as const,
        padding: '16px 8px',
        backgroundColor: color,
        borderRadius: '6px',
      }}
    >
      <Text style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 4px 0', color: '#1f2937' }}>
        {value}
      </Text>
      <Text style={{ fontSize: '11px', color: '#6b7280', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
        {label}
      </Text>
    </Column>
  );
}

function HighlightItem({ item }: { item: DigestHighlight }) {
  const icons: Record<string, string> = {
    milestone: '\u{1F3AF}',
    task: '\u2705',
    event: '\u{1F4CB}',
  };

  return (
    <Row style={{ marginBottom: '8px' }}>
      <Column style={{ width: '24px', verticalAlign: 'top' as const }}>
        <Text style={{ margin: 0, fontSize: '14px' }}>{icons[item.type] || '\u2022'}</Text>
      </Column>
      <Column>
        <Text style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
          <strong>{item.title}</strong>
          {item.description ? ` — ${item.description}` : ''}
        </Text>
      </Column>
    </Row>
  );
}

export function WeeklyDigest(props: DigestData) {
  const {
    founderName,
    weekOf,
    stats,
    highlights,
    activeRedFlags,
    appUrl,
  } = props;

  return (
    <EmailLayout
      previewText={`Your Sahara weekly digest — Week of ${weekOf}`}
      appUrl={appUrl}
    >
      {/* Greeting */}
      <Text style={{ fontSize: '18px', color: '#1f2937', margin: '0 0 8px 0' }}>
        Hey {founderName},
      </Text>
      <Text style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 24px 0' }}>
        Here is your weekly progress summary from Sahara:
      </Text>

      {/* Stats grid */}
      <Section style={{ marginBottom: '24px' }}>
        <Row>
          <StatBox label="Conversations" value={stats.conversationCount} color="#ede9fe" />
          <Column style={{ width: '8px' }} />
          <StatBox label="Milestones" value={stats.completedMilestones} color="#dcfce7" />
          <Column style={{ width: '8px' }} />
          <StatBox label="Tasks Done" value={stats.completedTasks} color="#dbeafe" />
          <Column style={{ width: '8px' }} />
          <StatBox label="Red Flags" value={activeRedFlags} color={activeRedFlags > 0 ? '#fee2e2' : '#f3f4f6'} />
        </Row>
      </Section>

      {/* Highlights */}
      {highlights.length > 0 && (
        <Section style={{ marginBottom: '24px' }}>
          <Text style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', margin: '0 0 12px 0' }}>
            Highlights
          </Text>
          {highlights.map((h, i) => (
            <HighlightItem key={i} item={h} />
          ))}
        </Section>
      )}

      {/* Red flags warning */}
      {activeRedFlags > 0 && (
        <Section
          style={{
            backgroundColor: '#fef2f2',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '24px',
            borderLeft: '3px solid #ef4444',
          }}
        >
          <Text style={{ margin: 0, fontSize: '13px', color: '#991b1b' }}>
            You have <strong>{activeRedFlags}</strong> active red flag{activeRedFlags > 1 ? 's' : ''} to review.
          </Text>
        </Section>
      )}

      {/* CTA button */}
      <Section style={{ textAlign: 'center' as const, marginTop: '8px' }}>
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
          View Your Dashboard
        </Link>
      </Section>
    </EmailLayout>
  );
}
